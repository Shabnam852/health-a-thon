import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { RoleId } from "../config/navigationConfig.js";
import {
  acceptPrivacy,
  checkPhoneCode,
  clearAuthData,
  getSession,
  hasAcceptedPrivacy,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  requestPhoneCode,
  signInAsDemoRole,
  signInStaff,
  signOut,
  verifyPhoneCode,
} from "./auth/authService.js";
import { DEMO_PASSWORD, normalisePhone, phoneAccounts, staffAccounts } from "./auth/demoAccounts.js";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const SHALINI = phoneAccounts.find((a) => a.id === "PT-SHALINI");
const RAVI = phoneAccounts.find((a) => a.id === "FAM-RAVI");
const KAVYA = staffAccounts.find((a) => a.id === "STAFF-KAVYA");

describe("authService (demo stand-in for Mythic sign-in)", () => {
  beforeEach(() => {
    store.clear();
    clearAuthData();
  });

  it("signs staff in with the demo password and keeps their hospital", async () => {
    const result = await signInStaff({ email: " KAVYA@sanjeevani.demo ", password: DEMO_PASSWORD });
    assert.equal(result.ok, true);
    assert.equal(result.session.role, RoleId.FACILITY);
    assert.equal(result.session.facilityId, KAVYA.facilityId);
    assert.equal(result.session.hprId, KAVYA.hprId);
    assert.deepEqual(getSession(), result.session);
  });

  it("gives the same message for a wrong password and an unknown email", async () => {
    const wrongPassword = await signInStaff({ email: KAVYA.email, password: "nope" });
    const unknown = await signInStaff({ email: "nobody@x.demo", password: DEMO_PASSWORD });
    assert.equal(wrongPassword.ok, false);
    assert.equal(wrongPassword.error, unknown.error);
    assert.equal(getSession(), null);
  });

  it("never stores a password in the session", async () => {
    await signInStaff({ email: KAVYA.email, password: DEMO_PASSWORD });
    assert.ok(![...store.values()].some((v) => v.includes(DEMO_PASSWORD)));
  });

  it("signs a patient in with a phone code", async () => {
    const asked = await requestPhoneCode({ phone: `+91 ${SHALINI.phone}` });
    assert.equal(asked.ok, true);
    assert.match(asked.demoCode, /^\d{6}$/);
    const result = await verifyPhoneCode({ phone: SHALINI.phone, code: asked.demoCode });
    assert.equal(result.ok, true);
    assert.equal(result.session.role, RoleId.PATIENT);
    assert.equal(result.session.referralId, SHALINI.referralId);
    assert.equal(result.session.relation, "self");
  });

  it("signs a family member in to the patient they are linked to", async () => {
    const asked = await requestPhoneCode({ phone: RAVI.phone });
    const result = await verifyPhoneCode({ phone: RAVI.phone, code: asked.demoCode });
    assert.equal(result.session.referralId, SHALINI.referralId);
    assert.equal(result.session.relation, "Husband");
  });

  it("refuses a number that isn't a mobile number or isn't linked", async () => {
    assert.equal((await requestPhoneCode({ phone: "12345" })).ok, false);
    assert.equal((await requestPhoneCode({ phone: "9000000000" })).ok, false);
  });

  it("says an unknown number has no account, so the screen can offer sign-up", async () => {
    const result = await requestPhoneCode({ phone: "9000000000" });
    assert.equal(result.notRegistered, true);
  });

  it("sends a sign-up code only to a number without an account", async () => {
    assert.equal((await requestPhoneCode({ phone: "9000000000", forSignUp: true })).ok, true);
    assert.match((await requestPhoneCode({ phone: SHALINI.phone, forSignUp: true })).error, /already has an account/);
  });

  it("checks a sign-up code once, without signing anyone in", async () => {
    const asked = await requestPhoneCode({ phone: "9000000001", forSignUp: true });
    assert.deepEqual(await checkPhoneCode({ phone: "9000000001", code: asked.demoCode }), { ok: true });
    assert.equal((await checkPhoneCode({ phone: "9000000001", code: asked.demoCode })).ok, false);
  });

  it("uses a code once only", async () => {
    const asked = await requestPhoneCode({ phone: SHALINI.phone });
    assert.equal((await verifyPhoneCode({ phone: SHALINI.phone, code: asked.demoCode })).ok, true);
    assert.equal((await verifyPhoneCode({ phone: SHALINI.phone, code: asked.demoCode })).ok, false);
  });

  it("drops a code that has run out", async () => {
    const now = 1_000_000;
    const asked = await requestPhoneCode({ phone: SHALINI.phone, now });
    const late = await verifyPhoneCode({ phone: SHALINI.phone, code: asked.demoCode, now: now + OTP_TTL_MS + 1 });
    assert.equal(late.ok, false);
  });

  it("drops a code after too many wrong tries, even if the right one comes next", async () => {
    const asked = await requestPhoneCode({ phone: SHALINI.phone });
    const wrong = asked.demoCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await verifyPhoneCode({ phone: SHALINI.phone, code: wrong });
    assert.equal((await verifyPhoneCode({ phone: SHALINI.phone, code: asked.demoCode })).ok, false);
  });

  it("signs out", async () => {
    signInAsDemoRole(RoleId.COORDINATOR);
    assert.equal(getSession().role, RoleId.COORDINATOR);
    await signOut();
    assert.equal(getSession(), null);
  });

  it("drops a saved session for an account that doesn't exist", () => {
    store.set("navexa_session", JSON.stringify({ accountId: "GONE", role: RoleId.COORDINATOR }));
    assert.equal(getSession(), null);
  });

  it("remembers the privacy notice per account", () => {
    assert.equal(hasAcceptedPrivacy("PT-SHALINI"), false);
    acceptPrivacy("PT-SHALINI");
    assert.equal(hasAcceptedPrivacy("PT-SHALINI"), true);
    assert.equal(hasAcceptedPrivacy("FAM-RAVI"), false);
  });

  it("normalises Indian mobile numbers", () => {
    assert.equal(normalisePhone("+91 98450 11223"), "9845011223");
    assert.equal(normalisePhone("09845011223"), "9845011223");
  });

  it("has a demo account for every role, and every phone account points at a real referral id shape", () => {
    for (const role of Object.values(RoleId)) assert.equal(signInAsDemoRole(role).ok, true);
    for (const a of phoneAccounts) assert.match(a.referralId, /^(NX|REF)-/);
  });
});
