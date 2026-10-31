import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ReferralStatus,
  TransportStatus,
  BarrierStatus,
  FollowUpStatus,
  UrgencyLevel,
  PatientType,
} from "./enums.js";

import {
  createReferral,
  createBarrier,
  createTransportRequest,
  createClinicalOutcome,
  createFollowUpPlan,
} from "./models.js";

import {
  validateReferralTransition,
  validateTransportTransition,
  validateBarrierTransition,
  validateFollowUpTransition,
} from "./transitions.js";

describe("Domain Enums & Models", () => {
  it("creates a maternal referral with valid defaults", () => {
    const ref = createReferral({
      patientName: "Fatima Zahra",
      referralType: PatientType.MATERNAL,
      fromFacility: "River West Midwifery",
      toFacility: "St. Jude Regional Perinatal Center",
      priority: UrgencyLevel.URGENT,
      reason: "PPROM at 36w 2d",
    });

    assert.equal(ref.patientName, "Fatima Zahra");
    assert.equal(ref.referralType, "Maternal");
    assert.equal(ref.status, ReferralStatus.CREATED);
    assert.ok(ref.id.startsWith("REF-2024"));
    assert.equal(ref.timeline.length, 1);
    assert.equal(ref.auditTrail.length, 1);
  });

  it("creates a neonatal referral without maternal vitals", () => {
    const neo = createReferral({
      patientName: "Baby Boy Chen",
      referralType: PatientType.CHILD,
      age: "3 Days Old",
      fromFacility: "Crestview Midwifery",
      toFacility: "St. Jude NICU",
      priority: UrgencyLevel.STAT,
      reason: "Neonatal Hyperbilirubinemia TSB 21.4 mg/dL",
      vitals: { tsb: "21.4 mg/dL", weight: "2980g", temp: "36.8 C" },
    });

    assert.equal(neo.referralType, "Child");
    assert.equal(neo.vitals.tsb, "21.4 mg/dL");
    assert.equal(neo.vitals.bp, undefined); // No obstetric vitals
  });

  it("creates a structured clinical outcome", () => {
    const outcome = createClinicalOutcome({
      referralType: PatientType.MATERNAL,
      clinicianName: "Dr. Evelyn Carter, CNM",
      maternalStatus: "STABLE",
      deliveryType: "SPONTANEOUS_VAGINAL",
      disposition: "ADMITTED",
      clinicalNotes: "Normal delivery without postpartum hemorrhage.",
    });

    assert.equal(outcome.maternalStatus, "STABLE");
    assert.equal(outcome.deliveryType, "SPONTANEOUS_VAGINAL");
    assert.equal(outcome.disposition, "ADMITTED");
  });

  it("generates 42-day postpartum continuing care plan with 4 touchpoints", () => {
    const plan = createFollowUpPlan({
      referralId: "REF-TEST-01",
      patientId: "P-101",
      patientName: "Elena Rostova",
      referralType: PatientType.MATERNAL,
    });

    assert.equal(plan.tasks.length, 4);
    assert.equal(plan.tasks[0].dayOffset, 3);
    assert.equal(plan.tasks[1].dayOffset, 7);
    assert.equal(plan.tasks[2].dayOffset, 14);
    assert.equal(plan.tasks[3].dayOffset, 42);
  });
});

describe("Domain State Transitions", () => {
  it("allows valid referral progression SENT -> ACKNOWLEDGED -> ARRIVAL_CONFIRMED", () => {
    assert.ok(validateReferralTransition(ReferralStatus.SENT, ReferralStatus.ACKNOWLEDGED).valid);
    assert.ok(validateReferralTransition(ReferralStatus.ACKNOWLEDGED, ReferralStatus.ARRIVAL_CONFIRMED).valid);
    assert.ok(validateReferralTransition(ReferralStatus.ARRIVAL_CONFIRMED, ReferralStatus.COMPLETED).valid);
  });

  it("blocks invalid direct leap from SENT to COMPLETED", () => {
    const check = validateReferralTransition(ReferralStatus.SENT, ReferralStatus.COMPLETED);
    assert.equal(check.valid, false);
    assert.ok(check.reason.includes("Invalid transition"));
  });

  it("allows facility rejection and redirection", () => {
    assert.ok(validateReferralTransition(ReferralStatus.SENT, ReferralStatus.REJECTED).valid);
    assert.ok(validateReferralTransition(ReferralStatus.REJECTED, ReferralStatus.REDIRECTED).valid);
    assert.ok(validateReferralTransition(ReferralStatus.REDIRECTED, ReferralStatus.SENT).valid);
  });

  it("validates transport lifecycle and prevents invalid jump", () => {
    assert.ok(validateTransportTransition(TransportStatus.REQUESTED, TransportStatus.ASSIGNED).valid);
    assert.ok(validateTransportTransition(TransportStatus.ASSIGNED, TransportStatus.DISPATCHED).valid);
    assert.ok(validateTransportTransition(TransportStatus.DISPATCHED, TransportStatus.ARRIVED).valid === false); // Must pick up first
  });

  it("validates barrier resolution lifecycle", () => {
    assert.ok(validateBarrierTransition(BarrierStatus.IDENTIFIED, BarrierStatus.IN_PROGRESS).valid);
    assert.ok(validateBarrierTransition(BarrierStatus.IN_PROGRESS, BarrierStatus.RESOLVED).valid);
  });
});

