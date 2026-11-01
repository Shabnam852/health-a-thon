import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ReferralStatus,
  TransportStatus,
  BarrierStatus,
  FollowUpStatus,
  UrgencyLevel,
  PatientType,
  TimelineEvent,
  AuditRole,
  isHighAcuity,
  sortByAcuity,
} from "./enums.js";

import { createReferral, createBarrier, createClinicalOutcome, createFollowUpPlan } from "./models.js";

import {
  validateReferralTransition,
  validateTransportTransition,
  validateBarrierTransition,
  validateFollowUpTransition,
} from "./transitions.js";

import { initialSeedReferrals } from "../data/seedData.js";

describe("Domain Enums & Models", () => {
  it("creates a maternal referral with valid defaults", () => {
    const ref = createReferral({
      patientName: "Fathima Begum",
      referralType: PatientType.MATERNAL,
      fromFacility: "Kaveri Midwifery",
      toFacility: "Sanjeevani Regional Perinatal Centre",
      priority: UrgencyLevel.URGENT,
      reason: "PPROM at 36w 2d",
    });

    assert.equal(ref.patientName, "Fathima Begum");
    assert.equal(ref.status, ReferralStatus.CREATED);
    assert.equal(ref.condition, "PPROM at 36w 2d");
    assert.ok(ref.id.startsWith("REF-2024"));
    assert.deepEqual(ref.timeline.map((e) => e.status), [ReferralStatus.CREATED]);
    assert.equal(ref.auditTrail[0].action, "REFERRAL_CREATED");
    assert.match(ref.auditTrail[0].details, /Fathima Begum \(URGENT Acuity\)/);
  });

  it("does not invent an age or parity when none is given", () => {
    const ref = createReferral({ patientName: "A", age: undefined, parity: undefined });
    assert.equal(ref.age, "Not recorded");
    assert.equal(ref.parity, "Not recorded");
  });

  it("gives a referral created past CREATED a timeline that reaches its status", () => {
    const ref = createReferral({ patientName: "A", status: ReferralStatus.SENT });
    assert.deepEqual(ref.timeline.map((e) => e.status), [ReferralStatus.CREATED, ReferralStatus.SENT]);
  });

  it("keeps maternal and neonatal outcome fields apart", () => {
    const maternal = createClinicalOutcome({
      referralType: PatientType.MATERNAL,
      maternalStatus: "ICU",
      deliveryType: "CESAREAN",
      neonatalStatus: "NICU_ADMITTED",
      bilirubinMgDl: 16,
    });
    assert.equal(maternal.maternalStatus, "ICU");
    assert.equal(maternal.deliveryType, "CESAREAN");
    assert.equal(maternal.neonatalStatus, null);
    assert.equal(maternal.bilirubinMgDl, null);

    const neonatal = createClinicalOutcome({
      referralType: PatientType.CHILD,
      maternalStatus: "ICU",
      deliveryType: "CESAREAN",
      neonatalStatus: "NICU_ADMITTED",
      bilirubinMgDl: 16,
    });
    assert.equal(neonatal.maternalStatus, null);
    assert.equal(neonatal.deliveryType, null);
    assert.equal(neonatal.neonatalStatus, "NICU_ADMITTED");
    assert.equal(neonatal.bilirubinMgDl, 16);
  });

  it("keeps both sets of outcome fields for a dyad", () => {
    const dyad = createClinicalOutcome({ referralType: PatientType.DYAD, maternalStatus: "ICU", bilirubinMgDl: 16 });
    assert.equal(dyad.maternalStatus, "ICU");
    assert.equal(dyad.bilirubinMgDl, 16);
  });

  it("generates the maternal plan on days 3, 7, 14 and 42, due on those days", () => {
    const before = Date.now();
    const plan = createFollowUpPlan({ referralId: "REF-TEST-01", patientId: "P-101", referralType: PatientType.MATERNAL });

    assert.equal(plan.referralId, "REF-TEST-01");
    assert.deepEqual(plan.tasks.map((t) => t.dayOffset), [3, 7, 14, 42]);
    plan.tasks.forEach((t) => {
      const expected = new Date(before + t.dayOffset * 86400000).toISOString().slice(0, 10);
      assert.equal(t.dueDate, expected);
    });
  });

  it("generates a different plan for a neonate", () => {
    const plan = createFollowUpPlan({ referralId: "R", referralType: PatientType.CHILD });
    assert.deepEqual(plan.tasks.map((t) => t.dayOffset), [3, 7, 14, 28]);
    assert.match(plan.tasks[0].title, /Neonatal/);
  });

  it("gives a dyad both plans, in day order", () => {
    const plan = createFollowUpPlan({ referralId: "R", referralType: PatientType.DYAD });
    assert.deepEqual(plan.tasks.map((t) => t.dayOffset), [3, 3, 7, 7, 14, 14, 28, 42]);
    assert.ok(plan.tasks.some((t) => /Maternal/.test(t.title)));
    assert.ok(plan.tasks.some((t) => /Neonatal/.test(t.title)));
  });

  it("does not throw when a factory gets no arguments", () => {
    assert.equal(createBarrier().status, BarrierStatus.IDENTIFIED);
    assert.equal(createClinicalOutcome().disposition, "ADMITTED");
  });

  it("sorts the most urgent first, keeping the order of equal cases", () => {
    const sorted = sortByAcuity([
      { id: 1, priority: UrgencyLevel.ROUTINE },
      { id: 2, priority: UrgencyLevel.URGENT },
      { id: 3, priority: UrgencyLevel.STAT },
      { id: 4, priority: UrgencyLevel.PRIORITY },
      { id: 5, priority: UrgencyLevel.URGENT },
    ]);
    assert.deepEqual(sorted.map((r) => r.id), [3, 2, 5, 4, 1]);
  });

  it("treats only URGENT and STAT as high acuity", () => {
    const high = Object.values(UrgencyLevel).filter(isHighAcuity);
    assert.deepEqual(high, [UrgencyLevel.URGENT, UrgencyLevel.STAT]);
  });
});

describe("Seed data", () => {
  it("has high-acuity cases that the dashboard rule counts", () => {
    assert.equal(initialSeedReferrals.filter((r) => isHighAcuity(r.priority)).length, 6);
  });

  it("uses only enum values, with a timeline that ends at the referral's status", () => {
    for (const r of initialSeedReferrals) {
      assert.ok(Object.values(ReferralStatus).includes(r.status), r.id);
      assert.ok(Object.values(PatientType).includes(r.referralType), r.id);
      assert.ok(Object.values(UrgencyLevel).includes(r.priority), r.id);
      assert.equal(r.timeline.at(-1).status, r.status, r.id);
    }
  });

  it("uses only known timeline labels and audit roles", () => {
    const labels = [...Object.values(ReferralStatus), ...Object.values(TimelineEvent)];
    for (const r of initialSeedReferrals) {
      r.timeline.forEach((e) => assert.ok(labels.includes(e.status), `${r.id}: ${e.status}`));
      r.auditTrail.forEach((e) => assert.ok(Object.values(AuditRole).includes(e.role), `${r.id}: ${e.role}`));
    }
  });
});

// Checks every pair of statuses, so an added or removed rule always fails a test.
const assertExactRules = (validate, statuses, rules) => {
  for (const from of statuses) {
    for (const to of statuses) {
      const expected = (rules[from] || []).includes(to);
      const result = validate(from, to);
      assert.equal(result.valid, expected, `${from} -> ${to}`);
      if (!expected) assert.ok(result.reason, `${from} -> ${to} needs a reason`);
    }
  }
};

describe("Domain State Transitions", () => {
  it("allows exactly the documented referral transitions", () => {
    const S = ReferralStatus;
    assertExactRules(validateReferralTransition, Object.values(S), {
      [S.CREATED]: [S.SENT, S.REJECTED],
      [S.SENT]: [S.ACKNOWLEDGED, S.REJECTED, S.REDIRECTED],
      [S.ACKNOWLEDGED]: [S.ARRIVAL_CONFIRMED, S.REJECTED, S.REDIRECTED],
      [S.REJECTED]: [S.REDIRECTED],
      [S.REDIRECTED]: [S.SENT],
      [S.ARRIVAL_CONFIRMED]: [S.CLINICAL_ASSESSMENT_RECORDED],
      [S.CLINICAL_ASSESSMENT_RECORDED]: [S.COMPLETED],
      [S.COMPLETED]: [],
    });
  });

  it("allows exactly the documented transport transitions", () => {
    const S = TransportStatus;
    assertExactRules(validateTransportTransition, Object.values(S), {
      [S.NOT_REQUIRED]: [S.REQUESTED],
      [S.REQUESTED]: [S.ASSIGNED, S.CANCELLED],
      [S.ASSIGNED]: [S.DISPATCHED, S.CANCELLED],
      [S.DISPATCHED]: [S.PICKED_UP, S.FAILED, S.CANCELLED],
      [S.PICKED_UP]: [S.ARRIVED, S.FAILED],
      [S.ARRIVED]: [],
      [S.CANCELLED]: [S.REQUESTED],
      [S.FAILED]: [S.REQUESTED],
    });
  });

  it("allows exactly the documented barrier transitions", () => {
    const S = BarrierStatus;
    assertExactRules(validateBarrierTransition, Object.values(S), {
      [S.IDENTIFIED]: [S.ASSIGNED, S.IN_PROGRESS, S.RESOLVED],
      [S.ASSIGNED]: [S.IN_PROGRESS, S.RESOLVED],
      [S.IN_PROGRESS]: [S.RESOLVED, S.UNRESOLVED],
      [S.UNRESOLVED]: [S.IN_PROGRESS, S.RESOLVED],
      [S.RESOLVED]: [S.IDENTIFIED],
    });
  });

  it("allows exactly the documented follow-up transitions", () => {
    const S = FollowUpStatus;
    assertExactRules(validateFollowUpTransition, Object.values(S), {
      [S.PLANNED]: [S.SCHEDULED, S.DUE, S.COMPLETED],
      [S.SCHEDULED]: [S.DUE, S.COMPLETED, S.MISSED],
      [S.DUE]: [S.COMPLETED, S.MISSED, S.ESCALATED],
      [S.MISSED]: [S.ESCALATED, S.SCHEDULED],
      [S.ESCALATED]: [S.SCHEDULED, S.COMPLETED],
      [S.COMPLETED]: [],
    });
  });

  it("explains a rejected transition", () => {
    const check = validateReferralTransition(ReferralStatus.SENT, ReferralStatus.COMPLETED);
    assert.match(check.reason, /Invalid transition from SENT to COMPLETED/);
  });
});
