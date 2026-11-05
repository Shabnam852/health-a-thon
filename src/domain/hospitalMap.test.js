import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialFacilities, initialSeedReferrals } from "../data/seedData.js";
import { ReferralStatus } from "./enums.js";
import { getHospitalMap } from "./hospitalMap.js";

const facilities = [{ name: "City Hospital", coordinates: { lat: 12.97, lng: 77.59 } }];
const referral = {
  toFacility: "City Hospital",
  status: ReferralStatus.ACKNOWLEDGED,
  patientAddress: "18, 2nd Cross, Jayanagar",
};

describe("getHospitalMap", () => {
  it("points the map and the directions at the referred hospital", () => {
    const map = getHospitalMap(referral, facilities);
    assert.equal(map.name, "City Hospital");
    assert.equal(new URL(map.embedUrl).searchParams.get("marker"), "12.97,77.59");
    assert.equal(new URL(map.directionsUrl).searchParams.get("destination"), "12.97,77.59");
  });

  it("follows a redirect to another hospital", () => {
    const other = { name: "Other Hospital", coordinates: { lat: 13, lng: 77 } };
    const map = getHospitalMap({ ...referral, toFacility: "Other Hospital" }, [...facilities, other]);
    assert.equal(new URL(map.directionsUrl).searchParams.get("destination"), "13,77");
  });

  it("shows nothing when there is no hospital to travel to", () => {
    assert.equal(getHospitalMap(null, facilities), null);
    assert.equal(getHospitalMap({ ...referral, toFacility: "" }, facilities), null);
    assert.equal(getHospitalMap({ ...referral, toFacility: "Unknown" }, facilities), null);
    assert.equal(getHospitalMap({ ...referral, status: ReferralStatus.REJECTED }, facilities), null);
    assert.equal(getHospitalMap(referral, [{ name: "City Hospital" }]), null);
  });

  it("never puts the patient's address in a URL", () => {
    const map = getHospitalMap(referral, facilities);
    for (const url of [map.embedUrl, map.directionsUrl]) {
      assert.ok(!decodeURIComponent(url).includes("Jayanagar"));
    }
  });

  it("can map every hospital in the seed data", () => {
    for (const facility of initialFacilities) {
      assert.ok(facility.coordinates, facility.name);
    }
    for (const seed of initialSeedReferrals.filter((r) => r.status !== ReferralStatus.REJECTED)) {
      assert.ok(getHospitalMap(seed, initialFacilities), seed.id);
    }
  });
});
