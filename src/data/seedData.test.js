import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { buildSeedReferrals, initialFleet } from "./seedData.js";

describe("seed data", () => {
  it("restarts its clocks each time it is built, so Reset brings back the starting state", () => {
    const clockedCase = (referrals) => referrals.map((r) => r.createdAt);
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-02T10:00:00Z") });
    try {
      const first = clockedCase(buildSeedReferrals());
      mock.timers.setTime(new Date("2026-11-02T12:00:00Z").getTime());
      const later = clockedCase(buildSeedReferrals());
      assert.notDeepEqual(first, later);
    } finally {
      mock.timers.reset();
    }
  });

  it("puts every seeded van ride on a van in the fleet", () => {
    const vanIds = initialFleet.map((van) => van.id);
    for (const r of buildSeedReferrals()) {
      if (r.transit?.vehicle) assert.ok(vanIds.includes(r.transit.vanId), r.id);
    }
  });
});
