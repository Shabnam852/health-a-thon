import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  applyExpiry,
  ConsentStatus,
  consentsForReferral,
  getAbdmState,
  HiType,
  isValidAbha,
  linkAbha,
  requestAbhaCode,
  requestConsent,
  resetAbdmData,
  respondToConsent,
  revokeConsent,
  unlinkAbha,
} from "./abdm/abdmService.js";
import { buildMockRecords } from "./abdm/mockRecords.js";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-05T10:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const REQUESTER = { name: "Dr Kavya Menon", hprId: "71-4410-2290-5583", facility: "Sanjeevani" };
const ask = (over = {}) =>
  requestConsent({
    referralId: "NX-9042",
    hiTypes: [HiType.OP_CONSULTATION, HiType.DIAGNOSTIC_REPORT],
    fromDate: iso(NOW - 365 * DAY),
    toDate: iso(NOW),
    requester: REQUESTER,
    now: NOW,
    ...over,
  });

describe("abdmService (demo stand-in for ABDM)", () => {
  beforeEach(() => {
    store.clear();
    resetAbdmData();
  });

  it("starts with the story patient's ABHA linked", () => {
    assert.equal(getAbdmState(NOW).abhaLinks["NX-9042"].abhaAddress, "shalini.naidu@sbx");
  });

  it("asks for records for care management and waits for the family", async () => {
    const { ok, consent } = await ask();
    assert.equal(ok, true);
    assert.equal(consent.purpose.code, "CAREMGT");
    assert.equal(consent.status, ConsentStatus.REQUESTED);
    assert.equal(consent.requester.hprId, REQUESTER.hprId);
    assert.deepEqual(consent.records, []);
    assert.equal(consentsForReferral(getAbdmState(NOW), "NX-9042").length, 1);
  });

  it("refuses a request with no ABHA, no record types, a reversed range or a future end date", async () => {
    assert.equal((await ask({ referralId: "NX-9051" })).ok, false);
    assert.equal((await ask({ hiTypes: [] })).ok, false);
    assert.equal((await ask({ fromDate: iso(NOW), toDate: iso(NOW - DAY) })).ok, false);
    assert.equal((await ask({ toDate: iso(NOW + 10 * DAY) })).ok, false);
  });

  it("shares only the approved record types, inside the dates", async () => {
    const { consent } = await ask({ hiTypes: [HiType.PRESCRIPTION], fromDate: iso(NOW - 60 * DAY) });
    const { consent: granted } = await respondToConsent({ consentId: consent.id, approve: true, now: NOW });
    assert.equal(granted.status, ConsentStatus.GRANTED);
    assert.ok(granted.records.length > 0);
    assert.ok(granted.records.every((r) => r.hiType === HiType.PRESCRIPTION));
    assert.ok(granted.records.every((r) => Date.parse(r.date) >= NOW - 60 * DAY));
  });

  it("sets a delete-by date when the family approves", async () => {
    const { consent } = await ask({ keepDays: 7 });
    const { consent: granted } = await respondToConsent({ consentId: consent.id, approve: true, now: NOW });
    assert.equal(Date.parse(granted.dataEraseAt), NOW + 7 * DAY);
  });

  it("shares nothing when the family declines, and a request is answered once", async () => {
    const { consent } = await ask();
    const { consent: denied } = await respondToConsent({ consentId: consent.id, approve: false, now: NOW });
    assert.equal(denied.status, ConsentStatus.DENIED);
    assert.deepEqual(denied.records, []);
    assert.equal((await respondToConsent({ consentId: consent.id, approve: true, now: NOW })).ok, false);
  });

  it("deletes the records when the family stops sharing", async () => {
    const { consent } = await ask();
    await respondToConsent({ consentId: consent.id, approve: true, now: NOW });
    const { consent: revoked } = await revokeConsent({ consentId: consent.id, now: NOW });
    assert.equal(revoked.status, ConsentStatus.REVOKED);
    assert.deepEqual(revoked.records, []);
    assert.equal((await revokeConsent({ consentId: consent.id, now: NOW })).ok, false);
  });

  it("deletes the records on the delete-by date", async () => {
    const { consent } = await ask({ keepDays: 1 });
    await respondToConsent({ consentId: consent.id, approve: true, now: NOW });
    const later = getAbdmState(NOW + 2 * DAY);
    const expired = later.consents.find((c) => c.id === consent.id);
    assert.equal(expired.status, ConsentStatus.EXPIRED);
    assert.deepEqual(expired.records, []);
  });

  it("leaves the state untouched when nothing has expired", () => {
    const state = { abhaLinks: {}, consents: [{ id: "x", status: ConsentStatus.REQUESTED }] };
    assert.equal(applyExpiry(state, NOW), state);
  });

  it("links an ABHA only with the right code, and unlinks it", async () => {
    assert.equal((await requestAbhaCode({ abhaAddress: "not an abha" })).ok, false);
    const { demoCode } = await requestAbhaCode({ abhaAddress: "Sunita.Yadav@sbx" });
    const base = { referralId: "NX-9051", abhaAddress: "sunita.yadav@sbx", holderName: "Sunita Yadav" };
    assert.equal((await linkAbha({ ...base, code: "000000" === demoCode ? "111111" : "000000" })).ok, false);
    assert.equal((await linkAbha({ ...base, code: demoCode })).ok, true);
    assert.equal(getAbdmState().abhaLinks["NX-9051"].abhaAddress, "sunita.yadav@sbx");
    await unlinkAbha({ referralId: "NX-9051" });
    assert.equal(getAbdmState().abhaLinks["NX-9051"], undefined);
  });

  it("accepts ABHA addresses and 14-digit numbers", () => {
    assert.equal(isValidAbha("shalini.naidu@sbx"), true);
    assert.equal(isValidAbha("91-1234-5678-9012"), true);
    assert.equal(isValidAbha("shalini"), false);
  });

  it("counts the end date in full when picking records", () => {
    const records = buildMockRecords({
      referralId: "R",
      hiTypes: [HiType.OP_CONSULTATION],
      dateRange: { from: iso(NOW - 18 * DAY), to: iso(NOW - 18 * DAY) },
      now: NOW,
    });
    assert.equal(records.length, 1);
  });
});
