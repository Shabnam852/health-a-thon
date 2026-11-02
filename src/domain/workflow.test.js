import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AuditRole,
  BarrierCategory,
  BarrierStatus,
  FollowUpStatus,
  PatientType,
  ReferralStatus,
  TimelineEvent,
  TransportStatus,
  UrgencyLevel,
} from "./enums.js";
import { createBarrier, createFollowUpPlan, createReferral, createTransportRequest } from "./models.js";
import * as workflow from "./workflow.js";

const NOW = "2026-11-01T10:00:00.000Z";

const makeReferral = (overrides = {}) =>
  createReferral({
    id: "REF-TEST",
    patientName: "Test Patient",
    referralType: PatientType.MATERNAL,
    priority: UrgencyLevel.URGENT,
    fromFacility: "Kaveri",
    toFacility: "Sanjeevani",
    ...overrides,
  });

// Unwraps a successful action, failing the test with its reason otherwise.
const applied = (result) => {
  assert.equal(result.success, true, result.reason);
  return result.referral;
};

const rejected = (result, pattern) => {
  assert.equal(result.success, false);
  assert.equal(result.referral, undefined);
  assert.match(result.reason, pattern);
};

const lastTimelineStatus = (referral) => referral.timeline[referral.timeline.length - 1].status;

describe("Referral lifecycle", () => {
  it("runs a maternal referral from SENT to COMPLETED with a linked 42-day plan", () => {
    let r = makeReferral({
      status: ReferralStatus.SENT,
      barriers: [
        createBarrier({ id: "BAR-1", category: BarrierCategory.TRANSPORT, status: BarrierStatus.IN_PROGRESS }),
      ],
    });

    r = applied(workflow.acknowledgeReferral(r, { actor: "Nurse A" }, NOW));
    assert.equal(r.status, ReferralStatus.ACKNOWLEDGED);
    assert.equal(r.auditTrail.at(-1).action, "FACILITY_ACKNOWLEDGED");
    assert.equal(r.auditTrail.at(-1).actor, "Nurse A");

    r = applied(
      workflow.dispatchTransport(r, { vehicle: "MediVan #04", driver: "Manjunath Gowda", eta: "10 mins" }, NOW),
    );
    assert.equal(r.transit.status, TransportStatus.DISPATCHED);
    assert.equal(r.barriers[0].status, BarrierStatus.RESOLVED);

    r = applied(workflow.recordTransportPickup(r, NOW));
    assert.equal(r.transit.status, TransportStatus.PICKED_UP);

    r = applied(workflow.confirmArrival(r, { room: "Bay 2", verifiedBy: "Nurse B" }, NOW));
    assert.equal(r.status, ReferralStatus.ARRIVAL_CONFIRMED);
    assert.equal(r.transit.status, TransportStatus.ARRIVED);
    assert.equal(r.arrival.room, "Bay 2");
    assert.equal(r.arrival.verifiedBy, "Nurse B");

    r = applied(workflow.recordClinicalOutcome(r, { clinicianName: "Dr. C", disposition: "ADMITTED" }, NOW));
    assert.equal(r.status, ReferralStatus.COMPLETED);
    assert.equal(r.clinicalOutcome.clinicianName, "Dr. C");
    assert.equal(r.followUpPlan.referralId, r.id);
    assert.deepEqual(
      r.followUpPlan.tasks.map((t) => t.dayOffset),
      [3, 7, 14, 42],
    );
    assert.equal(r.followUpPlan.tasks[0].status, FollowUpStatus.PLANNED);

    const statuses = r.timeline.map((e) => e.status);
    const assessment = statuses.indexOf(ReferralStatus.CLINICAL_ASSESSMENT_RECORDED);
    assert.ok(assessment > statuses.indexOf(ReferralStatus.ARRIVAL_CONFIRMED));
    assert.equal(statuses[assessment + 1], ReferralStatus.COMPLETED);
  });

  it("gives a neonatal referral the neonatal plan and strips maternal outcome fields", () => {
    const r = applied(
      workflow.recordClinicalOutcome(
        makeReferral({ referralType: PatientType.CHILD, status: ReferralStatus.ARRIVAL_CONFIRMED }),
        {
          neonatalStatus: "PHOTOTHERAPY_INITIATED",
          bilirubinMgDl: 16.2,
          maternalStatus: "STABLE",
          deliveryType: "CESAREAN",
        },
        NOW,
      ),
    );

    assert.deepEqual(
      r.followUpPlan.tasks.map((t) => t.dayOffset),
      [3, 7, 14, 28],
    );
    assert.equal(r.clinicalOutcome.neonatalStatus, "PHOTOTHERAPY_INITIATED");
    assert.equal(r.clinicalOutcome.bilirubinMgDl, 16.2);
    assert.equal(r.clinicalOutcome.maternalStatus, null);
    assert.equal(r.clinicalOutcome.deliveryType, null);
  });

  it("takes the outcome's patient type from the referral, not the payload", () => {
    const r = applied(
      workflow.recordClinicalOutcome(
        makeReferral({ status: ReferralStatus.ARRIVAL_CONFIRMED }),
        { referralType: PatientType.CHILD, bilirubinMgDl: 12, maternalStatus: "STABLE" },
        NOW,
      ),
    );

    assert.equal(r.clinicalOutcome.referralType, PatientType.MATERNAL);
    assert.equal(r.clinicalOutcome.bilirubinMgDl, null);
    assert.equal(r.clinicalOutcome.maternalStatus, "STABLE");
  });

  it("refuses arrival before the referral is sent, and changes nothing", () => {
    const r = makeReferral({ status: ReferralStatus.CREATED });
    const before = structuredClone(r);

    rejected(workflow.confirmArrival(r, {}, NOW), /Invalid transition from CREATED to ARRIVAL_CONFIRMED/);
    assert.deepEqual(r, before);
  });

  it("confirms arrival at a hospital other than the plan, even before anyone replied", () => {
    for (const status of [ReferralStatus.SENT, ReferralStatus.REJECTED]) {
      const r = applied(
        workflow.confirmArrival(
          makeReferral({ status, toFacility: "Sanjeevani" }),
          { atFacility: "Karuna", verifiedBy: "Nurse" },
          NOW,
        ),
      );
      assert.equal(r.status, ReferralStatus.ARRIVAL_CONFIRMED);
      assert.equal(r.toFacility, "Karuna");
      assert.equal(r.redirectHistory.at(-1).divertedFrom, "Sanjeevani");
    }
  });

  it("floats a declined referral until the patient chooses a hospital", () => {
    const declined = applied(
      workflow.rejectReferral(
        makeReferral({ status: ReferralStatus.SENT, toFacility: "Sanjeevani" }),
        { reason: "Full" },
        NOW,
      ),
    );
    assert.equal(workflow.isFloating(declined), true);
    assert.equal(workflow.getDestination(declined), "No hospital chosen yet");
    assert.deepEqual(declined.declinedBy, ["Sanjeevani"]);

    rejected(workflow.recordPatientChoice(declined, { toFacility: "Sanjeevani" }, NOW), /already declined/);

    const chosen = applied(workflow.recordPatientChoice(declined, { toFacility: "Karuna" }, NOW));
    assert.equal(chosen.status, ReferralStatus.SENT);
    assert.equal(chosen.toFacility, "Karuna");
    assert.equal(chosen.patientChoice.recordedBy, "Patient or family");
    assert.equal(chosen.auditTrail.at(-1).role, AuditRole.PATIENT);

    const again = applied(workflow.rejectReferral(chosen, { reason: "Full" }, NOW));
    assert.deepEqual(again.declinedBy, ["Sanjeevani", "Karuna"]);
    assert.equal(again.patientChoice, null);
  });

  it("records a coordinator as only recording the patient's choice", () => {
    const declined = makeReferral({ status: ReferralStatus.REJECTED, toFacility: "Sanjeevani" });
    const chosen = applied(
      workflow.recordPatientChoice(declined, { toFacility: "Karuna", recordedBy: "Care Coordinator" }, NOW),
    );
    assert.equal(chosen.auditTrail.at(-1).actor, "Care Coordinator");
    assert.equal(chosen.auditTrail.at(-1).role, AuditRole.COORDINATOR);
  });

  it("refuses a choice on a referral that isn't floating", () => {
    const sent = makeReferral({ status: ReferralStatus.SENT });
    rejected(workflow.recordPatientChoice(sent, { toFacility: "Karuna" }, NOW), /Only a floating/);
    rejected(workflow.recordPatientGoingElsewhere(sent, { place: "Clinic" }, NOW), /Only a floating/);
  });

  it("keeps the case open when the patient goes somewhere not on the list", () => {
    const declined = makeReferral({ status: ReferralStatus.REJECTED });
    rejected(workflow.recordPatientGoingElsewhere(declined, { place: "  " }, NOW), /Say where/);

    const r = applied(workflow.recordPatientGoingElsewhere(declined, { place: "Town clinic" }, NOW));
    assert.equal(workflow.isFloating(r), true);
    assert.equal(r.patientChoice.elsewhere, "Town clinic");
    assert.equal(r.timeline.at(-1).status, ReferralStatus.REJECTED);
    assert.equal(r.timeline.at(-1).date, NOW);
    assert.equal(workflow.getDestination(r), "Town clinic");
  });

  it("refuses an outcome before physical arrival", () => {
    for (const status of [ReferralStatus.SENT, ReferralStatus.ACKNOWLEDGED, ReferralStatus.COMPLETED]) {
      rejected(workflow.recordClinicalOutcome(makeReferral({ status }), {}, NOW), /Invalid transition/);
    }
  });

  it("refuses repeating an action, so the timeline gets no duplicates", () => {
    const acknowledged = makeReferral({ status: ReferralStatus.ACKNOWLEDGED });
    rejected(workflow.acknowledgeReferral(acknowledged, {}, NOW), /Already ACKNOWLEDGED/);

    const arrived = makeReferral({ status: ReferralStatus.ARRIVAL_CONFIRMED });
    rejected(workflow.confirmArrival(arrived, { room: "Other" }, NOW), /Already ARRIVAL_CONFIRMED/);
  });

  it("rejects a referral and records the reason", () => {
    const r = applied(
      workflow.rejectReferral(
        makeReferral({ status: ReferralStatus.SENT }),
        { actor: "Nurse", reason: "NICU full" },
        NOW,
      ),
    );

    assert.equal(r.status, ReferralStatus.REJECTED);
    assert.equal(r.rejectionReason, "NICU full");
    assert.equal(r.auditTrail.at(-1).action, "FACILITY_REJECTED");
  });

  it("redirects a rejected referral and re-queues it at the new facility", () => {
    const r = applied(
      workflow.redirectReferral(
        makeReferral({ status: ReferralStatus.REJECTED }),
        { toFacility: "Vidyaranya Institute", reason: "No beds" },
        NOW,
      ),
    );

    assert.equal(r.status, ReferralStatus.SENT);
    assert.equal(r.toFacility, "Vidyaranya Institute");
    assert.deepEqual(
      r.redirectHistory.map((h) => [h.divertedFrom, h.divertedTo]),
      [["Sanjeevani", "Vidyaranya Institute"]],
    );
    assert.deepEqual(
      r.timeline.slice(-2).map((e) => e.status),
      [ReferralStatus.REDIRECTED, ReferralStatus.SENT],
    );
  });

  it("refuses to redirect a completed referral, to the same facility, or to nowhere", () => {
    rejected(
      workflow.redirectReferral(makeReferral({ status: ReferralStatus.COMPLETED }), { toFacility: "Vidyaranya" }, NOW),
      /Invalid transition from COMPLETED/,
    );
    rejected(
      workflow.redirectReferral(makeReferral({ status: ReferralStatus.SENT }), { toFacility: "Sanjeevani" }, NOW),
      /already addressed/,
    );
    rejected(workflow.redirectReferral(makeReferral({ status: ReferralStatus.SENT }), {}, NOW), /destination/);
  });
});

describe("Transport actions", () => {
  const withTransit = (status) =>
    makeReferral({
      status: ReferralStatus.ACKNOWLEDGED,
      transit: createTransportRequest({ id: "TR-1", referralId: "REF-TEST", status, driver: "Manjunath Gowda" }),
    });

  it("dispatches with no transit, or from a request, a failure or a cancellation", () => {
    const payload = { vehicle: "Van", driver: "D" };
    assert.equal(
      applied(workflow.dispatchTransport(makeReferral(), payload, NOW)).transit.status,
      TransportStatus.DISPATCHED,
    );

    for (const status of [
      TransportStatus.REQUESTED,
      TransportStatus.ASSIGNED,
      TransportStatus.FAILED,
      TransportStatus.CANCELLED,
    ]) {
      const r = applied(workflow.dispatchTransport(withTransit(status), payload, NOW));
      assert.equal(r.transit.status, TransportStatus.DISPATCHED);
      assert.equal(r.transit.failedReason, null);
      assert.equal(r.transit.vehicle, "Van");
    }
  });

  it("refuses to dispatch a vehicle already moving or arrived", () => {
    for (const status of [TransportStatus.DISPATCHED, TransportStatus.PICKED_UP, TransportStatus.ARRIVED]) {
      rejected(workflow.dispatchTransport(withTransit(status), { vehicle: "Van" }, NOW), /Cannot dispatch/);
    }
  });

  it("refuses to dispatch without a vehicle instead of throwing", () => {
    rejected(workflow.dispatchTransport(makeReferral(), undefined, NOW), /vehicle is required/);
  });

  it("resolves only open transport barriers on dispatch", () => {
    const r = applied(
      workflow.dispatchTransport(
        makeReferral({
          barriers: [
            createBarrier({ id: "T-OPEN", category: BarrierCategory.TRANSPORT, status: BarrierStatus.IN_PROGRESS }),
            createBarrier({
              id: "T-DONE",
              category: BarrierCategory.TRANSPORT,
              status: BarrierStatus.RESOLVED,
              resolutionNotes: "Original note",
            }),
            createBarrier({ id: "LANG", category: BarrierCategory.LINGUISTIC, status: BarrierStatus.IN_PROGRESS }),
          ],
        }),
        { vehicle: "Van", driver: "D" },
        NOW,
      ),
    );
    const byId = Object.fromEntries(r.barriers.map((b) => [b.id, b]));

    assert.equal(byId["T-OPEN"].status, BarrierStatus.RESOLVED);
    assert.equal(byId["T-DONE"].resolutionNotes, "Original note");
    assert.equal(byId.LANG.status, BarrierStatus.IN_PROGRESS);
  });

  it("allows pickup only after dispatch", () => {
    assert.equal(
      applied(workflow.recordTransportPickup(withTransit(TransportStatus.DISPATCHED), NOW)).transit.pickedUpAt,
      NOW,
    );
    rejected(
      workflow.recordTransportPickup(withTransit(TransportStatus.REQUESTED), NOW),
      /Invalid transport transition/,
    );
    rejected(workflow.recordTransportPickup(makeReferral(), NOW), /No transport/);
  });

  it("records a failure in transit but not after arrival, and leaves the referral open", () => {
    const r = applied(workflow.recordTransportFailure(withTransit(TransportStatus.DISPATCHED), "Snow squall", NOW));
    assert.equal(r.transit.status, TransportStatus.FAILED);
    assert.equal(r.transit.failedReason, "Snow squall");
    assert.equal(r.status, ReferralStatus.ACKNOWLEDGED);

    rejected(
      workflow.recordTransportFailure(withTransit(TransportStatus.ARRIVED), "x", NOW),
      /Invalid transport transition/,
    );
  });

  it("does not overwrite a transit in progress with a new request", () => {
    rejected(workflow.requestTransport(withTransit(TransportStatus.DISPATCHED), {}, NOW), /already DISPATCHED/);

    const r = applied(workflow.requestTransport(withTransit(TransportStatus.FAILED), { pickupAddress: "1 Elm" }, NOW));
    assert.equal(r.transit.status, TransportStatus.REQUESTED);
    assert.equal(r.transit.pickupAddress, "1 Elm");
  });

  it("closes a moving vehicle on arrival but leaves other transit states as recorded", () => {
    const dispatched = applied(workflow.confirmArrival(withTransit(TransportStatus.DISPATCHED), {}, NOW));
    assert.equal(dispatched.transit.status, TransportStatus.ARRIVED);
    assert.equal(dispatched.transit.pickedUpAt, NOW);

    const failed = applied(workflow.confirmArrival(withTransit(TransportStatus.FAILED), {}, NOW));
    assert.equal(failed.transit.status, TransportStatus.FAILED);

    assert.equal(
      applied(workflow.confirmArrival(makeReferral({ status: ReferralStatus.ACKNOWLEDGED }), {}, NOW)).transit,
      null,
    );
  });
});

describe("Barrier actions", () => {
  const withBarrier = (status) =>
    makeReferral({ barriers: [createBarrier({ id: "BAR-1", title: "Childcare gap", status, resolvedAt: null })] });

  it("adds a barrier and logs it", () => {
    const result = workflow.identifyBarrier(
      makeReferral(),
      { title: "No safe newborn transport", category: BarrierCategory.TRANSPORT },
      NOW,
    );
    const r = applied(result);

    assert.equal(result.barrier.title, "No safe newborn transport");
    assert.equal(r.barriers.length, 1);
    assert.equal(lastTimelineStatus(r), TimelineEvent.BARRIER_FLAGGED);
    assert.equal(r.auditTrail.at(-1).role, AuditRole.COORDINATOR);
    assert.equal(r.auditTrail.at(-1).actor, "Care Coordinator");
  });

  it("applies the barrier rules", () => {
    const r = applied(
      workflow.updateBarrierStatus(
        withBarrier(BarrierStatus.IN_PROGRESS),
        "BAR-1",
        BarrierStatus.RESOLVED,
        "Done",
        NOW,
      ),
    );
    assert.equal(r.barriers[0].status, BarrierStatus.RESOLVED);
    assert.equal(r.barriers[0].resolvedAt, NOW);
    assert.equal(r.barriers[0].resolutionNotes, "Done");

    rejected(
      workflow.updateBarrierStatus(withBarrier(BarrierStatus.IDENTIFIED), "BAR-1", BarrierStatus.UNRESOLVED, "", NOW),
      /Invalid barrier transition/,
    );
  });

  it("logs nothing for a barrier that does not exist", () => {
    rejected(
      workflow.updateBarrierStatus(
        withBarrier(BarrierStatus.IN_PROGRESS),
        "BAR-GENERIC",
        BarrierStatus.RESOLVED,
        "",
        NOW,
      ),
      /not found/,
    );
  });

  it("clears the resolved time when a barrier is reopened", () => {
    const resolved = applied(
      workflow.updateBarrierStatus(withBarrier(BarrierStatus.IN_PROGRESS), "BAR-1", BarrierStatus.RESOLVED, "", NOW),
    );
    const reopened = applied(
      workflow.updateBarrierStatus(resolved, "BAR-1", BarrierStatus.IDENTIFIED, "Recurred", NOW),
    );

    assert.equal(reopened.barriers[0].resolvedAt, null);
  });

  it("resolves by id or title, and never falls back to another barrier", () => {
    assert.equal(
      applied(workflow.resolveBarrier(withBarrier(BarrierStatus.IN_PROGRESS), "BAR-1", "", NOW)).barriers[0].status,
      BarrierStatus.RESOLVED,
    );
    assert.equal(
      applied(workflow.resolveBarrier(withBarrier(BarrierStatus.IN_PROGRESS), "Childcare", "", NOW)).barriers[0].status,
      BarrierStatus.RESOLVED,
    );

    rejected(workflow.resolveBarrier(withBarrier(BarrierStatus.IN_PROGRESS), "typo", "", NOW), /No barrier matches/);
    rejected(workflow.resolveBarrier(withBarrier(BarrierStatus.IN_PROGRESS), "", "", NOW), /No barrier matches/);
  });
});

describe("Continuity of care actions", () => {
  const withPlan = () => {
    const r = makeReferral({ status: ReferralStatus.COMPLETED });
    return {
      ...r,
      followUpPlan: createFollowUpPlan({ referralId: r.id, referralType: PatientType.MATERNAL }),
    };
  };

  it("completes a planned touchpoint and attributes it", () => {
    const start = withPlan();
    const taskId = start.followUpPlan.tasks[0].id;
    const r = applied(workflow.completeFollowUpTask(start, taskId, "Lactation good", NOW));
    const task = r.followUpPlan.tasks[0];

    assert.equal(task.status, FollowUpStatus.COMPLETED);
    assert.equal(task.completedAt, NOW);
    assert.equal(task.notes, "Lactation good");
    assert.equal(task.completedBy, "Care Coordinator");
    assert.equal(r.followUpPlan.status, "ACTIVE");
  });

  it("marks the plan complete only after the last touchpoint", () => {
    let r = withPlan();
    for (const { id } of r.followUpPlan.tasks) {
      assert.equal(r.followUpPlan.status, "ACTIVE");
      r = applied(workflow.completeFollowUpTask(r, id, "", NOW));
    }
    assert.equal(r.followUpPlan.status, "COMPLETED");
  });

  it("refuses completing twice, an unknown touchpoint, or a missing plan", () => {
    const start = withPlan();
    const taskId = start.followUpPlan.tasks[0].id;
    const done = applied(workflow.completeFollowUpTask(start, taskId, "", NOW));

    rejected(workflow.completeFollowUpTask(done, taskId, "", NOW), /Already COMPLETED/);
    rejected(workflow.completeFollowUpTask(start, "NOPE", "", NOW), /not found/);
    rejected(workflow.completeFollowUpTask(makeReferral(), taskId, "", NOW), /no continuing care plan/);
  });

  it("logs contact attempts, with defaults when no details are given", () => {
    const r = applied(
      workflow.recordContactAttempt(
        makeReferral(),
        { method: "SMS", outcome: "Voicemail Left", notes: "n", actor: "Priya" },
        NOW,
      ),
    );
    assert.deepEqual(
      [r.contactLogs[0].method, r.contactLogs[0].outcome, r.contactLogs[0].actor],
      ["SMS", "Voicemail Left", "Priya"],
    );
    assert.equal(r.auditTrail.at(-1).action, "CONTACT_ATTEMPT");

    assert.equal(
      applied(workflow.recordContactAttempt(makeReferral(), undefined, NOW)).contactLogs[0].method,
      "Phone Call",
    );
  });
});

describe("UI bug regressions", () => {
  const transportBarrier = (status) => ({ id: "B1", title: "Van broke down", category: "TRANSPORT", status });

  it("refuses transport once the patient has arrived or the referral was declined", () => {
    for (const status of [
      ReferralStatus.ARRIVAL_CONFIRMED,
      ReferralStatus.CLINICAL_ASSESSMENT_RECORDED,
      ReferralStatus.COMPLETED,
      ReferralStatus.REJECTED,
    ]) {
      const referral = makeReferral({ status, transit: null });
      assert.equal(workflow.canDispatchTransport(referral), false, status);
      assert.equal(workflow.dispatchTransport(referral, { vehicle: "V" }, NOW).success, false, status);
      assert.equal(workflow.requestTransport(referral, {}, NOW).success, false, status);
    }
    assert.equal(
      workflow.canDispatchTransport(makeReferral({ status: ReferralStatus.ACKNOWLEDGED, transit: null })),
      true,
    );
  });

  it("puts a case on the transport board only for a transport barrier", () => {
    const base = makeReferral({ transitBarrier: false });
    const transport = workflow.identifyBarrier(base, { title: "T", category: "TRANSPORT" }, NOW);
    const financial = workflow.identifyBarrier(base, { title: "F", category: "FINANCIAL" }, NOW);
    assert.equal(transport.referral.transitBarrier, true);
    assert.equal(financial.referral.transitBarrier, false);
  });

  it("refuses a second open barrier with the same title, but allows one after it is resolved", () => {
    const open = makeReferral({ barriers: [transportBarrier("IDENTIFIED")] });
    assert.equal(workflow.identifyBarrier(open, { title: "Van broke down" }, NOW).success, false);

    const resolved = makeReferral({ barriers: [transportBarrier("RESOLVED")] });
    assert.equal(workflow.identifyBarrier(resolved, { title: "Van broke down" }, NOW).success, true);
  });

  it("reopens the resolved transport barrier when the vehicle fails", () => {
    const referral = makeReferral({
      barriers: [transportBarrier("RESOLVED")],
      transit: createTransportRequest({ referralId: "R", status: TransportStatus.DISPATCHED }),
    });
    const r = applied(workflow.recordTransportFailure(referral, "Flat tyre", NOW));
    assert.deepEqual(
      r.barriers.map((b) => [b.status, b.resolvedAt, b.description]),
      [["IDENTIFIED", null, "Flat tyre"]],
    );
    assert.equal(r.transitBarrier, true);
  });

  it("adds a transport barrier when a failed vehicle had none, and never a second open one", () => {
    const transit = createTransportRequest({ referralId: "R", status: TransportStatus.DISPATCHED });
    const none = applied(workflow.recordTransportFailure(makeReferral({ barriers: [], transit }), "Flat tyre", NOW));
    assert.deepEqual(
      none.barriers.map((b) => [b.category, b.status]),
      [["TRANSPORT", "IDENTIFIED"]],
    );

    const open = makeReferral({ barriers: [transportBarrier("IN_PROGRESS")], transit });
    const still = applied(workflow.recordTransportFailure(open, "Flat tyre", NOW));
    assert.deepEqual(
      still.barriers.map((b) => b.status),
      ["IN_PROGRESS"],
    );
  });
});
