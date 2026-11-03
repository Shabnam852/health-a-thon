import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialFacilities, initialSeedReferrals } from "../data/seedData.js";
import { PatientType, ReferralStatus, UrgencyLevel } from "./enums.js";
import {
  fitsNeeds,
  getHospitalRow,
  getInboundLoad,
  getMedianReplyMinutes,
  getNetworkSummary,
  getOccupancy,
  Pressure,
  SERVICES,
} from "./network.js";

const hospital = (overrides = {}) => ({
  name: "H",
  treats: [PatientType.MATERNAL, PatientType.CHILD],
  takesUrgent: true,
  bedsAvailable: 5,
  totalBeds: 10,
  services: ["NICU"],
  ...overrides,
});
const referral = (status, overrides = {}) => ({ toFacility: "H", status, timeline: [], ...overrides });

describe("hospital network", () => {
  it("counts patients waiting on a reply and patients on the way, for this hospital only", () => {
    const refs = [
      referral(ReferralStatus.SENT),
      referral(ReferralStatus.ACKNOWLEDGED),
      referral(ReferralStatus.ACKNOWLEDGED),
      referral(ReferralStatus.ARRIVAL_CONFIRMED),
      referral(ReferralStatus.SENT, { toFacility: "Other" }),
    ];
    assert.deepEqual(getInboundLoad(hospital(), refs), { awaitingReply: 1, onTheWay: 2, inCare: 1 });
  });

  it("keeps a bed held from acceptance until the case is completed", () => {
    const accepted = [referral(ReferralStatus.ACKNOWLEDGED)];
    const arrived = [referral(ReferralStatus.ARRIVAL_CONFIRMED)];
    const completed = [referral(ReferralStatus.COMPLETED)];
    // Arriving must not hand the bed back: the listed free beds do not change on arrival.
    assert.equal(getOccupancy(hospital(), accepted).freeAfterArrivals, 4);
    assert.equal(getOccupancy(hospital(), arrived).freeAfterArrivals, 4);
    assert.equal(getOccupancy(hospital(), completed).freeAfterArrivals, 5);
  });

  it("holds a bed for each accepted patient on the way", () => {
    const refs = [referral(ReferralStatus.ACKNOWLEDGED), referral(ReferralStatus.ACKNOWLEDGED)];
    assert.equal(getOccupancy(hospital(), refs).freeAfterArrivals, 3);
    // More on the way than free beds: none left, never negative.
    assert.equal(getOccupancy(hospital({ bedsAvailable: 1 }), refs).freeAfterArrivals, 0);
  });

  it("marks a hospital busy from 75% and full from 90%", () => {
    assert.equal(getOccupancy(hospital({ bedsAvailable: 4 })).pressure, Pressure.OPEN);
    assert.equal(getOccupancy(hospital({ bedsAvailable: 2 })).pressure, Pressure.BUSY);
    assert.equal(getOccupancy(hospital({ bedsAvailable: 1 })).pressure, Pressure.FULL);
    assert.equal(getOccupancy(hospital({ bedsAvailable: 0, totalBeds: 0 })).pressure, Pressure.FULL);
  });

  it("times a reply from the last send before the acceptance, and takes the median", () => {
    const timed = (sentAt, acceptedAt) =>
      referral(ReferralStatus.ARRIVAL_CONFIRMED, {
        timeline: [
          { status: ReferralStatus.SENT, date: "2026-10-31T08:00:00Z" },
          { status: ReferralStatus.SENT, date: `2026-10-31T${sentAt}:00Z` },
          { status: ReferralStatus.ACKNOWLEDGED, date: `2026-10-31T${acceptedAt}:00Z` },
        ],
      });
    const refs = [timed("09:00", "09:10"), timed("09:00", "09:30"), timed("09:00", "10:00")];
    assert.equal(getMedianReplyMinutes(hospital(), refs), 30);
    assert.equal(getMedianReplyMinutes(hospital(), refs.slice(0, 2)), 20);
    assert.equal(getMedianReplyMinutes(hospital(), [referral(ReferralStatus.SENT)]), null);
  });

  it("fits a hospital to the patient's needs only when it has a bed after arrivals", () => {
    const row = getHospitalRow(hospital(), []);
    const urgentBaby = { referralType: PatientType.CHILD, priority: UrgencyLevel.URGENT };
    assert.equal(fitsNeeds(row, urgentBaby), true);
    assert.equal(fitsNeeds(row, { ...urgentBaby, service: "ECMO" }), false);
    assert.equal(fitsNeeds({ ...row, takesUrgent: false }, urgentBaby), false);
    assert.equal(fitsNeeds({ ...row, treats: [PatientType.MATERNAL] }, urgentBaby), false);
    assert.equal(fitsNeeds({ ...row, freeAfterArrivals: 0 }, urgentBaby), false);
    // Priority alone still rules out a hospital that takes no urgent cases.
    assert.equal(fitsNeeds({ ...row, takesUrgent: false }, { priority: UrgencyLevel.STAT }), false);
    assert.equal(fitsNeeds({ ...row, takesUrgent: false }, { priority: UrgencyLevel.ROUTINE }), true);
    // No needs chosen: nothing is filtered out.
    assert.equal(fitsNeeds({ ...row, freeAfterArrivals: 0 }, {}), true);
  });

  it("gives every seed hospital known services and a total that adds up", () => {
    const known = new Set(SERVICES.map((s) => s.id));
    for (const f of initialFacilities) for (const s of f.services) assert.ok(known.has(s), `${f.name}: ${s}`);
    const rows = initialFacilities.map((f) => getHospitalRow(f, initialSeedReferrals));
    const summary = getNetworkSummary(rows);
    assert.equal(
      summary.bedsFree,
      rows.reduce((n, r) => n + r.freeAfterArrivals, 0),
    );
    assert.ok(summary.bedsFree <= initialFacilities.reduce((n, f) => n + f.bedsAvailable, 0));
  });
});
