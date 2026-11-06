import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seedShape } from "../data/freshState.js";
import { initialFacilities, initialSeedReferrals } from "../data/seedData.js";
import { cleanDomainDoc } from "../domain/stateShape.js";
import {
  demoStorySteps,
  STORY_FACILITY_ID,
  STORY_LINK_REQUEST_ID,
  STORY_REFERRAL_ID,
  STORY_RELATIVE_NAME,
} from "./demoStory.js";
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

describe("demo step guides", () => {
  it("points every step at one thing on the page", () => {
    for (const step of demoStorySteps) {
      assert.ok(typeof step.target === "string" || typeof step.target === "function", step.title);
    }
  });

  it("can tell when every task is done", () => {
    for (const step of demoStorySteps.filter((s) => s.task)) {
      assert.ok(step.done || step.doneOnPage, `${step.title} has a task it can't tick off`);
    }
  });

  it("starts with the relative's request waiting for the story's referral", () => {
    const request = seedShape().linkRequests.find((r) => r.id === STORY_LINK_REQUEST_ID);
    assert.equal(request?.status, "PENDING");
    assert.equal(request.referralId, STORY_REFERRAL_ID);
    assert.equal(request.name, STORY_RELATIVE_NAME);
    assert.ok(seedShape().accounts.some((a) => a.id === request.accountId && a.referralId === null));
    assert.deepEqual(cleanDomainDoc(seedShape()).linkRequests, seedShape().linkRequests);
  });

  it("ticks off the approval and the arrival from the shared data", () => {
    const approve = demoStorySteps.find((s) => s.task?.startsWith("Press Approve"));
    const pending = { linkRequests: seedShape().linkRequests };
    const approved = { linkRequests: pending.linkRequests.map((r) => ({ ...r, status: "APPROVED" })) };
    assert.equal(Boolean(approve.done({ data: pending })), false);
    assert.equal(approve.done({ data: approved }), true);

    const confirm = demoStorySteps.find((s) => s.role === RoleId.FACILITY);
    assert.equal(confirm.done({ referral: { status: "ACKNOWLEDGED" } }), false);
    assert.equal(confirm.done({ referral: { status: "ARRIVAL_CONFIRMED" } }), true);
  });
});
