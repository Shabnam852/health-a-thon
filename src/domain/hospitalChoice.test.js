import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialFacilities, initialFleet, initialSeedReferrals } from "../data/seedData.js";
import { PatientType, ReferralStatus, TransportStatus, UrgencyLevel } from "./enums.js";
import { buildDispatch, getFreeVans, getVanStatuses } from "./fleet.js";
import { getHospitalOptions, getReferralDestinations } from "./hospitalChoice.js";

const hospital = (name, overrides = {}) => ({
  name,
  treats: [PatientType.MATERNAL, PatientType.CHILD],
  takesUrgent: true,
  bedsAvailable: 2,
  coordinates: { lat: 12, lng: 77 },
  ...overrides,
});
const names = (referral, facilities) => getHospitalOptions(referral, facilities).map((h) => h.name);
const urgentBaby = { referralType: PatientType.CHILD, priority: UrgencyLevel.URGENT, declinedBy: [] };

describe("hospital options for a floating patient", () => {
  it("leaves out hospitals that declined, referred, are full or can't treat this case", () => {
    const facilities = [
      hospital("Declined"),
      hospital("Referrer"),
      hospital("Full", { bedsAvailable: 0 }),
      hospital("Mothers only", { treats: [PatientType.MATERNAL] }),
      hospital("Not for urgent", { takesUrgent: false }),
      hospital("Suitable"),
    ];
    const referral = { ...urgentBaby, declinedBy: ["Declined"], fromFacility: "Referrer" };
    assert.deepEqual(names(referral, facilities), ["Suitable"]);
  });

  it("counts beds held for accepted patients, so it never offers a hospital the network board shows as full", () => {
    const facilities = [hospital("Held", { bedsAvailable: 2, totalBeds: 10 }), hospital("Open", { bedsAvailable: 1 })];
    const held = (status) => ({ id: "X", toFacility: "Held", status });
    const referrals = [held(ReferralStatus.ACKNOWLEDGED), held(ReferralStatus.ARRIVAL_CONFIRMED)];
    const options = getHospitalOptions(urgentBaby, facilities, referrals);
    assert.deepEqual(
      options.map((h) => h.name),
      ["Open"],
    );
    // One held bed: still offered, with the free count the board shows.
    const one = getHospitalOptions(urgentBaby, facilities, referrals.slice(0, 1));
    assert.deepEqual(
      one.map((h) => [h.name, h.bedsAvailable]),
      [
        ["Held", 1],
        ["Open", 1],
      ],
    );
  });

  it("offers mother and baby together only hospitals that treat both", () => {
    const facilities = [hospital("Both"), hospital("Mothers only", { treats: [PatientType.MATERNAL] })];
    assert.deepEqual(names({ ...urgentBaby, referralType: PatientType.DYAD }, facilities), ["Both"]);
  });

  it("offers a routine case the hospitals that don't take urgent ones", () => {
    const facilities = [hospital("Clinic", { takesUrgent: false })];
    assert.deepEqual(names({ ...urgentBaby, priority: UrgencyLevel.ROUTINE }, facilities), ["Clinic"]);
  });

  it("lists most free beds first, with directions", () => {
    const options = getHospitalOptions(urgentBaby, [hospital("Two"), hospital("Five", { bedsAvailable: 5 })]);
    assert.deepEqual(
      options.map((h) => h.name),
      ["Five", "Two"],
    );
    assert.match(options[0].directionsUrl, /destination=12%2C77/);
  });

  it("gives the seeded floating patient somewhere to go", () => {
    const floating = initialSeedReferrals.filter((r) => r.status === ReferralStatus.REJECTED);
    assert.equal(floating.length, 1);
    assert.ok(getHospitalOptions(floating[0], initialFacilities).length > 0);
  });
});

describe("hospitals a new referral can go to", () => {
  it("are the seeded ones that take urgent cases, not the referrer", () => {
    assert.deepEqual(getReferralDestinations(initialFacilities, "Kaveri Midwifery & Birth Clinic"), [
      "Sanjeevani Regional Perinatal Centre",
      "Vidyaranya Institute of Medical Sciences",
      "Karuna Women & Children's Hospital",
    ]);
    const referrer = hospital("Referrer");
    assert.deepEqual(getReferralDestinations([referrer, hospital("Other")], "Referrer"), ["Other"]);
  });
});

describe("vans", () => {
  const fleet = [
    { id: "A", name: "Van A", driver: "Asha" },
    { id: "B", name: "Van B", driver: "Ben" },
  ];
  const riding = (status) => ({ patientName: "Meera", transit: { status, vanId: "A", vehicle: "Van A (Asha)" } });

  it("is busy only while a ride is moving", () => {
    assert.equal(getVanStatuses(fleet, [riding(TransportStatus.DISPATCHED)])[0].busyWith, "Meera");
    assert.equal(getVanStatuses(fleet, [riding(TransportStatus.PICKED_UP)])[0].busyWith, "Meera");
    for (const status of [TransportStatus.ARRIVED, TransportStatus.FAILED]) {
      assert.equal(getVanStatuses(fleet, [riding(status)])[0].busyWith, null, status);
    }
  });

  it("offers only free vans, and a dispatched van stops being free", () => {
    assert.deepEqual(
      getFreeVans(fleet, [riding(TransportStatus.DISPATCHED)]).map((v) => v.id),
      ["B"],
    );

    const dispatch = buildDispatch({ referralType: PatientType.CHILD, patientName: "Meera" }, fleet[1], "9 mins");
    assert.equal(dispatch.eta, "9 mins");
    assert.equal(dispatch.requiresNeonatalKit, true);
    assert.equal(buildDispatch({ referralType: PatientType.DYAD }, fleet[1], "9 mins").requiresNeonatalKit, true);
    assert.equal(buildDispatch({ referralType: PatientType.MATERNAL }, fleet[1], "9 mins").requiresNeonatalKit, false);
    const after = [{ patientName: "Meera", transit: { status: TransportStatus.DISPATCHED, vanId: dispatch.vanId } }];
    assert.equal(getFreeVans(fleet, after).length, 1);
    assert.equal(getFreeVans(fleet, after)[0].id, "A");
  });

  it("doesn't confuse vans whose names overlap", () => {
    const vans = [
      { id: "1", name: "Van #1" },
      { id: "10", name: "Van #10" },
    ];
    const ride = {
      patientName: "Meera",
      transit: { status: TransportStatus.DISPATCHED, vanId: "10", vehicle: "Van #10" },
    };
    assert.deepEqual(
      getVanStatuses(vans, [ride]).map((v) => v.busyWith),
      [null, "Meera"],
    );
  });

  it("matches every moving seed ride to a van", () => {
    const moving = initialSeedReferrals.filter((r) =>
      [TransportStatus.DISPATCHED, TransportStatus.PICKED_UP].includes(r.transit?.status),
    );
    const busy = getVanStatuses(initialFleet, initialSeedReferrals).filter((v) => v.busyWith);
    assert.equal(busy.length, moving.length);
  });
});
