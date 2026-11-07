import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PatientType } from "./enums.js";
import { describeVisitForFamily, getCheckUpsSummary } from "./familyVisits.js";
import { createFollowUpPlan } from "./models.js";

// Abbreviations and terms a family should not have to know.
const CLINICAL = /\b(PPH|EPDS|BP|bilirubin|neonatal|metabolic|preeclampsia|cesarean|lactation|postpartum)\b/i;

describe("describeVisitForFamily", () => {
  it("gives every default visit a plain name and plain checks", () => {
    for (const referralType of [PatientType.MATERNAL, PatientType.CHILD, PatientType.DYAD]) {
      const plan = createFollowUpPlan({ referralId: "R", patientId: "P", patientName: "A", referralType });
      for (const task of plan.tasks) {
        const visit = describeVisitForFamily(task);
        assert.doesNotMatch(visit.name, CLINICAL, task.title);
        assert.doesNotMatch(visit.checks, CLINICAL, task.title);
        assert.doesNotMatch(visit.who || "", CLINICAL, task.title);
      }
    }
  });

  it("never falls back to the clinical focus for an unknown visit", () => {
    const visit = describeVisitForFamily({ title: "Day 5 Special visit", clinicalFocus: "Rule out PPH" });
    assert.equal(visit.name, "Special visit");
    assert.doesNotMatch(visit.checks, /PPH/);
  });
});

describe("getCheckUpsSummary", () => {
  it("reads the next visit and the emergency line", () => {
    const text = getCheckUpsSummary({
      next: { title: "Day 7 BP & Surgical Healing" },
      nextLabel: "Next check-up",
      nextDate: "Saturday, 31 October",
      missed: false,
      total: 4,
      done: 1,
    });
    assert.match(text, /Blood pressure and healing check/);
    assert.match(text, /Call 108 now/);
    assert.ok(text.length <= 1000);
  });
});
