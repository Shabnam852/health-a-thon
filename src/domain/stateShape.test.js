import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanAbdmDoc, cleanDomainDoc } from "./stateShape.js";

const good = { id: "R1", status: "SENT", timeline: [], auditTrail: [] };

describe("cleanDomainDoc", () => {
  it("keeps a usable document as it is", () => {
    const doc = { referrals: [good], accounts: [{ id: "A", phone: "9845011223", referralId: "R1" }] };
    assert.deepEqual(cleanDomainDoc(doc), doc);
  });

  it("drops items a screen would crash on", () => {
    const doc = {
      referrals: [good, null, { id: "R2", status: "NOPE" }, { id: "R3", status: "SENT", timeline: "x" }],
      accounts: [null, { id: "A" }, { id: "B", phone: "9845011223" }],
      notifications: [null, 7, { id: "N1" }],
      linkRequests: [{ id: "L1" }],
      messages: [{ id: "M1", referralId: "R1", body: "hi" }, { id: "M2" }],
    };
    assert.deepEqual(cleanDomainDoc(doc), {
      referrals: [good],
      accounts: [{ id: "B", phone: "9845011223" }],
      notifications: [{ id: "N1" }],
      linkRequests: [],
      messages: [{ id: "M1", referralId: "R1", body: "hi" }],
    });
  });

  it("leaves out a list of the wrong type so the seed fills it", () => {
    assert.deepEqual(cleanDomainDoc({ referrals: [good], accounts: "x" }), { referrals: [good] });
  });

  it("refuses a document with no usable referral", () => {
    assert.equal(cleanDomainDoc({ referrals: [null] }), null);
    assert.equal(cleanDomainDoc({ referrals: "x" }), null);
    assert.equal(cleanDomainDoc(null), null);
  });
});

describe("cleanAbdmDoc", () => {
  it("drops broken consents and links", () => {
    const consent = { id: "C1", referralId: "R1", status: "GRANTED", createdAt: "2026-11-06T00:00:00Z" };
    const doc = { abhaLinks: { R1: { abhaAddress: "a@abdm" }, R2: null }, consents: [null, consent, { id: "C2" }] };
    assert.deepEqual(cleanAbdmDoc(doc), { abhaLinks: { R1: { abhaAddress: "a@abdm" } }, consents: [consent] });
  });

  it("refuses something that isn't an ABDM document", () => {
    assert.equal(cleanAbdmDoc({ abhaLinks: [], consents: [] }), null);
    assert.equal(cleanAbdmDoc({ abhaLinks: {} }), null);
  });
});
