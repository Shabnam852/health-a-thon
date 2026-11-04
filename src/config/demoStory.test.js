import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialFacilities, initialSeedReferrals } from "../data/seedData.js";
import { demoStorySteps, STORY_FACILITY_ID, STORY_REFERRAL_ID } from "./demoStory.js";
import { isRouteAllowedForRole, RoleId } from "./navigationConfig.js";

describe("demoStorySteps", () => {
  it("never lands on the access-denied screen", () => {
    for (const step of demoStorySteps) {
      const pathname = step.path.split("?")[0];
      assert.ok(isRouteAllowedForRole(step.role, pathname), `${step.role} cannot open ${pathname}`);
    }
  });

  it("visits every role", () => {
    assert.deepEqual(new Set(demoStorySteps.map((s) => s.role)), new Set(Object.values(RoleId)));
  });

  it("follows a referral that exists in the seed data", () => {
    assert.ok(initialSeedReferrals.some((r) => r.id === STORY_REFERRAL_ID));
  });

  it("opens intake at the hospital the story's patient is heading to", () => {
    const referral = initialSeedReferrals.find((r) => r.id === STORY_REFERRAL_ID);
    const facility = initialFacilities.find((f) => f.id === STORY_FACILITY_ID);
    assert.equal(facility?.name, referral.toFacility);
    const intake = demoStorySteps.find((s) => s.path.startsWith("/facility"));
    assert.equal(new URLSearchParams(intake.path.split("?")[1]).get("facility"), STORY_FACILITY_ID);
  });
});

describe("demo step titles", () => {
  it("gives every step a short title", () => {
    for (const step of demoStorySteps) assert.ok(step.title && step.title.length <= 40, step.text);
  });
});
