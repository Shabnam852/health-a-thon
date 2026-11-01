import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { StorageAdapter } from "./storageAdapter.js";
import { ReferralStatus } from "../domain/enums.js";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const SEED = {
  referrals: [{ id: "SEED-1", status: ReferralStatus.SENT }],
  notifications: [{ id: "N-1" }],
  facilities: [{ id: "F-1" }],
};
const save = (value) => store.set("navexa_domain_v4", typeof value === "string" ? value : JSON.stringify(value));

describe("StorageAdapter", () => {
  beforeEach(() => store.clear());

  it("uses the seed when nothing is saved", () => {
    assert.deepEqual(StorageAdapter.loadData(SEED), SEED);
  });

  it("round-trips saved data", () => {
    const saved = { ...SEED, referrals: [{ id: "SAVED-1", status: ReferralStatus.COMPLETED }] };
    StorageAdapter.saveData(saved);
    assert.deepEqual(StorageAdapter.loadData(SEED), saved);
  });

  it("uses the seed for corrupt JSON", (t) => {
    t.mock.method(console, "warn", () => {});
    save("{not json");
    assert.deepEqual(StorageAdapter.loadData(SEED), SEED);
  });

  it("uses the seed when a saved referral has no id or an unknown status", () => {
    save({ referrals: [{ id: "X", status: "FOLLOW_UP_REQUIRED" }] });
    assert.deepEqual(StorageAdapter.loadData(SEED), SEED);

    save({ referrals: [{ status: ReferralStatus.SENT }] });
    assert.deepEqual(StorageAdapter.loadData(SEED), SEED);
  });

  it("fills in missing collections from the seed", () => {
    save({ referrals: [{ id: "SAVED-1", status: ReferralStatus.SENT }], notifications: "broken" });
    const loaded = StorageAdapter.loadData(SEED);

    assert.equal(loaded.referrals[0].id, "SAVED-1");
    assert.deepEqual(loaded.notifications, SEED.notifications);
    assert.deepEqual(loaded.facilities, SEED.facilities);
  });

  it("keeps the usable referrals when one saved referral is bad", () => {
    save({ referrals: [{ id: "GOOD", status: ReferralStatus.SENT }, { id: "BAD", status: "FOLLOW_UP_REQUIRED" }] });
    assert.deepEqual(StorageAdapter.loadData(SEED).referrals.map((r) => r.id), ["GOOD"]);
  });

  it("clears the data from the old storage key", () => {
    store.set("navexa_domain_v3", "{}");
    StorageAdapter.loadData(SEED);
    assert.equal(store.has("navexa_domain_v3"), false);
  });

  it("round-trips checklists and clears them with the demo data", () => {
    assert.deepEqual(StorageAdapter.getChecklists(), {});
    StorageAdapter.saveChecklists({ R1: { 1: true } });
    assert.deepEqual(StorageAdapter.getChecklists(), { R1: { 1: true } });
    StorageAdapter.clearData();
    assert.deepEqual(StorageAdapter.getChecklists(), {});
  });

  it("returns a stored role only if it is a real role", () => {
    assert.equal(StorageAdapter.getRole(), "coordinator");

    StorageAdapter.setRole("patient");
    assert.equal(StorageAdapter.getRole(), "patient");

    StorageAdapter.setRole("admin");
    assert.equal(StorageAdapter.getRole(), "coordinator");
  });
});
