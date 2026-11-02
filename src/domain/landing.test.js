import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialSeedReferrals } from "../data/seedData.js";
import { BarrierCategory, BarrierStatus, PatientType, ReferralStatus, TransportStatus, UrgencyLevel } from "./enums.js";
import { getFamilyUpdate, getJourneyHeadline, getLandingStats, getReferralJourney, JourneyState } from "./landing.js";

const { DONE, ACTIVE, AT_RISK, UPCOMING } = JourneyState;
const statesOf = (referral) => getReferralJourney(referral).map((step) => step.state);
const seed = (id) => initialSeedReferrals.find((r) => r.id === id);

const openTransportBarrier = {
  id: "B1",
  category: BarrierCategory.TRANSPORT,
  title: "No vehicle",
  status: BarrierStatus.IN_PROGRESS,
};

describe("getLandingStats", () => {
  it("counts the seed data the way the workspaces do", () => {
    assert.deepEqual(getLandingStats(initialSeedReferrals, "Sanjeevani Regional Perinatal Centre"), {
      urgentNotArrived: 5,
      expectedArrivals: 3,
    });
  });

  it("leaves out completed and arrived cases, and arrivals for other facilities", () => {
    const referrals = [
      { priority: UrgencyLevel.STAT, status: ReferralStatus.COMPLETED },
      { priority: UrgencyLevel.STAT, status: ReferralStatus.ARRIVAL_CONFIRMED },
      { priority: UrgencyLevel.ROUTINE, status: ReferralStatus.ACKNOWLEDGED, toFacility: "Other Hospital" },
    ];
    const stats = getLandingStats(referrals, "Sanjeevani");
    assert.equal(stats.urgentNotArrived, 0);
    assert.equal(stats.expectedArrivals, 0);
  });
});

describe("getReferralJourney", () => {
  it("flags transport as at risk for the story patient", () => {
    assert.deepEqual(statesOf(seed("NX-9042")), [DONE, DONE, AT_RISK, UPCOMING, UPCOMING]);
  });

  it("shows a moving ride as active when nothing is in the way", () => {
    assert.deepEqual(statesOf(seed("MRN-773829")), [DONE, DONE, ACTIVE, UPCOMING, UPCOMING]);
  });

  it("marks arrival done once confirmed, even if the ride was never closed", () => {
    const referral = { status: ReferralStatus.ARRIVAL_CONFIRMED, transit: { status: TransportStatus.DISPATCHED } };
    assert.deepEqual(statesOf(referral), [DONE, DONE, DONE, DONE, UPCOMING]);
  });

  it("shows follow-up as active on a completed referral with a plan", () => {
    assert.deepEqual(statesOf(seed("NAV-2026-003")), [DONE, DONE, DONE, DONE, ACTIVE]);
  });

  it("flags the acknowledgement step on a rejected referral", () => {
    assert.equal(statesOf({ status: ReferralStatus.REJECTED })[1], AT_RISK);
  });

  it("flags transport when the ride failed", () => {
    const referral = { status: ReferralStatus.ACKNOWLEDGED, transit: { status: TransportStatus.FAILED } };
    assert.equal(statesOf(referral)[2], AT_RISK);
  });

  it("starts on the first step for a draft", () => {
    assert.deepEqual(statesOf({ status: ReferralStatus.CREATED }), [ACTIVE, UPCOMING, UPCOMING, UPCOMING, UPCOMING]);
  });
});

describe("getJourneyHeadline", () => {
  it("says the story patient is accepted but not there", () => {
    assert.equal(getJourneyHeadline(seed("NX-9042")), "The hospital said yes. The baby still isn't there.");
  });

  it("stops warning once the patient has arrived, even with a barrier left open", () => {
    const referral = {
      status: ReferralStatus.ARRIVAL_CONFIRMED,
      referralType: PatientType.MATERNAL,
      barriers: [openTransportBarrier],
    };
    assert.equal(getJourneyHeadline(referral), "The patient has arrived.");
  });

  it("reports a moving ride", () => {
    assert.equal(getJourneyHeadline(seed("MRN-773829")), "The patient is on the way.");
  });
});

describe("getFamilyUpdate", () => {
  it("gives the ride ETA for the story patient", () => {
    assert.equal(getFamilyUpdate(seed("NX-9042")), "Your ride arrives in 12 mins");
  });

  it("follows the referral through a failed ride and arrival", () => {
    assert.equal(
      getFamilyUpdate({ status: ReferralStatus.ACKNOWLEDGED, transit: { status: TransportStatus.FAILED } }),
      "Another ride is being arranged",
    );
    assert.equal(getFamilyUpdate({ status: ReferralStatus.ARRIVAL_CONFIRMED }), "You've arrived at the hospital");
    assert.equal(getFamilyUpdate({ status: ReferralStatus.SENT }), "Your ride is being arranged");
  });
});
