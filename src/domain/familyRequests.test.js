import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AuditRole, PatientType, ReferralStatus, TimelineEvent, UrgencyLevel } from "./enums.js";
import {
  ARRIVAL_REPORTED_LABEL,
  CALL_BACK_LABEL,
  canReportArrival,
  familyFlags,
  hasOpenCallBack,
  isArrivalReportedOnly,
  reportArrival,
  requestCallBack,
} from "./familyRequests.js";
import { createReferral } from "./models.js";
import * as workflow from "./workflow.js";

const NOW = "2026-11-06T10:00:00.000Z";
const LATER = "2026-11-06T10:30:00.000Z";

const makeReferral = (overrides = {}) =>
  createReferral({
    id: "REF-FAM",
    patientName: "Sunita Devi",
    referralType: PatientType.MATERNAL,
    priority: UrgencyLevel.URGENT,
    fromFacility: "Kaveri",
    toFacility: "Sanjeevani",
    status: ReferralStatus.ACKNOWLEDGED,
    ...overrides,
  });

const applied = (result) => {
  assert.equal(result.success, true, result.reason);
  return result.referral;
};

describe("Family reports arrival", () => {
  it("records arrival_reported evidence without changing the status", () => {
    const before = makeReferral();
    const result = reportArrival(before, {}, NOW);
    const r = applied(result);

    assert.equal(r.status, ReferralStatus.ACKNOWLEDGED);
    assert.equal(r.toFacility, "Sanjeevani");
    assert.equal(r.arrival, before.arrival);
    assert.deepEqual(r.arrivalReport, { reportedBy: workflow.PATIENT_OR_FAMILY, reportedAt: NOW, place: null });
    assert.equal(r.timeline.at(-1).status, TimelineEvent.ARRIVAL_REPORTED);
    assert.match(r.timeline.at(-1).notes, /not confirmed/i);
    assert.equal(r.auditTrail.at(-1).action, "ARRIVAL_REPORTED");
    assert.equal(r.auditTrail.at(-1).role, AuditRole.PATIENT);
    assert.equal(result.alerts.length, 1);
    assert.match(result.alerts[0].message, /Sunita Devi/);
    assert.equal(before.arrivalReport, undefined, "the input is not mutated");
  });

  it("does not name the referred hospital: the family may have gone elsewhere", () => {
    const result = reportArrival(makeReferral(), {}, NOW);
    assert.doesNotMatch(result.referral.timeline.at(-1).notes, /Sanjeevani/);
    assert.doesNotMatch(result.alerts[0].message, /Sanjeevani/);
    const elsewhere = applied(reportArrival(makeReferral(), { place: "  Taluk Hospital " }, NOW));
    assert.equal(elsewhere.arrivalReport.place, "Taluk Hospital");
    assert.match(elsewhere.timeline.at(-1).notes, /Taluk Hospital/);
  });

  it("is shown as reported, not confirmed, until the hospital confirms arrival", () => {
    const reported = applied(reportArrival(makeReferral(), {}, NOW));
    assert.equal(isArrivalReportedOnly(reported), true);
    assert.deepEqual(familyFlags(reported), [ARRIVAL_REPORTED_LABEL]);

    const confirmed = applied(workflow.confirmArrival(reported, { verifiedBy: "Nurse B", room: "Bay 2" }, LATER));
    assert.equal(confirmed.status, ReferralStatus.ARRIVAL_CONFIRMED);
    assert.equal(isArrivalReportedOnly(confirmed), false);
    assert.deepEqual(familyFlags(confirmed), []);
  });

  it("can be reported while sent or accepted, and when floating with the patient's own plan", () => {
    assert.equal(canReportArrival(makeReferral({ status: ReferralStatus.SENT })), true);
    assert.equal(canReportArrival(makeReferral({ status: ReferralStatus.ACKNOWLEDGED })), true);
    assert.equal(canReportArrival(makeReferral({ status: ReferralStatus.REJECTED })), false);
    assert.equal(
      canReportArrival(
        makeReferral({ status: ReferralStatus.REJECTED, patientChoice: { elsewhere: "Taluk Hospital" } }),
      ),
      true,
    );
    assert.equal(canReportArrival(makeReferral({ status: ReferralStatus.CREATED })), false);
    assert.equal(canReportArrival(makeReferral({ status: ReferralStatus.ARRIVAL_CONFIRMED })), false);
    assert.equal(canReportArrival(makeReferral({ status: ReferralStatus.COMPLETED })), false);
  });

  it("refuses a second report, and a report after arrival is confirmed", () => {
    const reported = applied(reportArrival(makeReferral(), {}, NOW));
    const again = reportArrival(reported, {}, LATER);
    assert.equal(again.success, false);
    assert.match(again.reason, /already been reported/);

    const arrived = reportArrival(makeReferral({ status: ReferralStatus.ARRIVAL_CONFIRMED }), {}, NOW);
    assert.equal(arrived.success, false);
    assert.match(arrived.reason, /already confirmed/);

    const draft = reportArrival(makeReferral({ status: ReferralStatus.CREATED }), {}, NOW);
    assert.equal(draft.success, false);
  });
});

describe("Family asks for a call back", () => {
  it("notes the request in the audit trail and alerts the coordinator", () => {
    const result = requestCallBack(makeReferral(), { reason: "  Need help with the bus fare  " }, NOW);
    const r = applied(result);

    assert.equal(r.status, ReferralStatus.ACKNOWLEDGED);
    assert.equal(r.callBackRequest.reason, "Need help with the bus fare");
    assert.equal(r.auditTrail.at(-1).action, "CALL_BACK_REQUESTED");
    assert.match(
      r.auditTrail.at(-1).details,
      /^Family asked for a call back\. Reason: "Need help with the bus fare"\.$/,
    );
    assert.equal(r.timeline.at(-1).status, TimelineEvent.CALL_BACK_REQUESTED);
    assert.equal(result.alerts[0].title, CALL_BACK_LABEL);
    assert.match(result.alerts[0].message, /Sunita Devi/);
  });

  it("works without a reason, and keeps a long reason short", () => {
    const plain = applied(requestCallBack(makeReferral(), {}, NOW));
    assert.equal(plain.auditTrail.at(-1).details, "Family asked for a call back.");
    assert.equal(plain.callBackRequest.reason, null);

    const long = applied(requestCallBack(makeReferral(), { reason: "a".repeat(500) }, NOW));
    assert.equal(long.callBackRequest.reason.length, 200);
  });

  it("stays open until a contact with the family is logged after it", () => {
    const asked = applied(requestCallBack(makeReferral(), {}, NOW));
    assert.equal(hasOpenCallBack(asked), true);
    assert.deepEqual(familyFlags(asked), [CALL_BACK_LABEL]);

    const repeat = requestCallBack(asked, {}, LATER);
    assert.equal(repeat.success, false);
    assert.match(repeat.reason, /already asked/);

    const called = applied(workflow.recordContactAttempt(asked, { notes: "Called the family back." }, LATER));
    assert.equal(hasOpenCallBack(called), false);
    assert.deepEqual(familyFlags(called), []);
    // Once answered, the family can ask again.
    applied(requestCallBack(called, {}, "2026-11-06T11:00:00.000Z"));
  });

  it("is not closed by a contact logged before the request", () => {
    const earlier = applied(workflow.recordContactAttempt(makeReferral(), {}, "2026-11-06T09:00:00.000Z"));
    assert.equal(hasOpenCallBack(applied(requestCallBack(earlier, {}, NOW))), true);
  });
});
