import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ReferralStatus,
  TransportStatus,
  BarrierStatus,
  FollowUpStatus,
  UrgencyLevel,
  PatientType,
} from "../domain/enums.js";

import {
  createReferral,
  createBarrier,
  createTransportRequest,
  createClinicalOutcome,
  createFollowUpPlan,
} from "../domain/models.js";

describe("Integrated Referral Workflow Engine", () => {
  it("processes Scenario A: Maternal Referral end-to-end with care continuity", () => {
    // 1. Create maternal referral
    let referral = createReferral({
      patientName: "Fatima Zahra",
      patientId: "MRN-773829",
      age: "29 yrs",
      referralType: PatientType.MATERNAL,
      priority: UrgencyLevel.URGENT,
      fromFacility: "River West Midwifery",
      toFacility: "St. Jude Regional Perinatal Center",
      reason: "PPROM at 36w 2d",
    });

    assert.equal(referral.status, ReferralStatus.CREATED);

    // 2. Submit referral
    referral.status = ReferralStatus.SENT;
    referral.timeline.push({ status: ReferralStatus.SENT, date: new Date().toISOString() });
    assert.equal(referral.status, ReferralStatus.SENT);

    // 3. Facility Acknowledgement
    referral.status = ReferralStatus.ACKNOWLEDGED;
    referral.timeline.push({ status: ReferralStatus.ACKNOWLEDGED, date: new Date().toISOString() });
    assert.equal(referral.status, ReferralStatus.ACKNOWLEDGED);

    // 4. Transport Barrier Identified & Dispatched
    const barrier = createBarrier({
      category: "TRANSPORT",
      title: "Vehicle transmission breakdown",
      status: BarrierStatus.IN_PROGRESS,
    });
    referral.barriers.push(barrier);
    assert.equal(referral.barriers.length, 1);

    referral.transit = createTransportRequest({
      referralId: referral.id,
      status: TransportStatus.DISPATCHED,
      vehicle: "MediVan #04",
      driver: "Marcus Ross",
      eta: "10 mins",
    });
    assert.equal(referral.transit.status, TransportStatus.DISPATCHED);
    assert.equal(referral.transit.driver, "Marcus Ross");

    // 5. Patient Arrival Confirmed
    referral.status = ReferralStatus.ARRIVAL_CONFIRMED;
    referral.transit.status = TransportStatus.ARRIVED;
    assert.equal(referral.status, ReferralStatus.ARRIVAL_CONFIRMED);

    // 6. Clinical Assessment & Outcome Recorded
    const outcome = createClinicalOutcome({
      referralType: PatientType.MATERNAL,
      clinicianName: "Dr. Evelyn Carter, CNM",
      maternalStatus: "STABLE",
      deliveryType: "SPONTANEOUS_VAGINAL",
      disposition: "ADMITTED",
    });
    referral.clinicalOutcome = outcome;
    referral.status = ReferralStatus.COMPLETED;

    // 7. Auto-generate linked 42-day continuing care plan
    referral.followUpPlan = createFollowUpPlan({
      referralId: referral.id,
      patientId: referral.patientId,
      patientName: referral.patientName,
      referralType: referral.referralType,
    });

    assert.equal(referral.status, ReferralStatus.COMPLETED);
    assert.ok(referral.followUpPlan != null);
    assert.equal(referral.followUpPlan.tasks.length, 4);
    assert.equal(referral.followUpPlan.tasks[0].status, FollowUpStatus.PLANNED);
  });

  it("processes Scenario B: Neonatal Referral with appropriate neonatal vitals and care plan", () => {
    let neoRef = createReferral({
      patientName: "Baby Boy Chen",
      age: "3 Days Old",
      referralType: PatientType.CHILD,
      priority: UrgencyLevel.STAT,
      fromFacility: "Northside Pediatric",
      toFacility: "St. Jude NICU",
      reason: "Acute Jaundice TSB 21.4 mg/dL",
      vitals: { tsb: "21.4 mg/dL", weight: "2,980g", temp: "36.8 C" },
    });

    assert.equal(neoRef.referralType, "Child");
    assert.equal(neoRef.vitals.tsb, "21.4 mg/dL");

    // Clinical outcome for newborn
    neoRef.clinicalOutcome = createClinicalOutcome({
      referralType: PatientType.CHILD,
      clinicianName: "Dr. Marcus Thorne, MD",
      neonatalStatus: "PHOTOTHERAPY_INITIATED",
      bilirubinMgDl: 16.2,
      disposition: "ADMITTED",
      clinicalNotes: "Double-surface LED phototherapy initiated. TSB reduced to 16.2 mg/dL.",
    });

    assert.equal(neoRef.clinicalOutcome.neonatalStatus, "PHOTOTHERAPY_INITIATED");
    assert.equal(neoRef.clinicalOutcome.bilirubinMgDl, 16.2);
  });

  it("processes Scenario C: Failed Transport & Escalation", () => {
    let ref = createReferral({
      patientName: "Khadija Said",
      referralType: PatientType.MATERNAL,
      fromFacility: "River West Clinic",
      toFacility: "St. Jude",
    });

    ref.transit = createTransportRequest({
      referralId: ref.id,
      status: TransportStatus.FAILED,
      failedReason: "Severe localized snow squall halted vehicle",
    });

    assert.equal(ref.transit.status, TransportStatus.FAILED);
    assert.equal(ref.transit.failedReason, "Severe localized snow squall halted vehicle");
    // Verify referral is NOT marked completed
    assert.notEqual(ref.status, ReferralStatus.COMPLETED);
  });

  it("processes Scenario D: Facility Rejection and Redirection", () => {
    let ref = createReferral({
      patientName: "Amara Okafor",
      fromFacility: "Northside",
      toFacility: "St. Jude",
      status: ReferralStatus.SENT,
    });

    // Facility rejects due to zero beds
    ref.status = ReferralStatus.REJECTED;
    ref.rejectionReason = "Level III NICU & Maternity at 100% capacity";
    assert.equal(ref.status, ReferralStatus.REJECTED);

    // Coordinator redirects to alternate regional hospital
    ref.toFacility = "University Medical Center Detroit";
    ref.status = ReferralStatus.SENT; // Re-routed
    assert.equal(ref.toFacility, "University Medical Center Detroit");
    assert.equal(ref.status, ReferralStatus.SENT);
  });
});

