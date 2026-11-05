/**
 * Sign-in for the demo. Every call is async and returns { ok, ... } or { ok: false, error }, the same
 * shape the Mythic version will have, so the screens don't change when this file is swapped for one
 * that calls Navexa's server (which then calls Mythic's /oauth and /api/patient-portal routes).
 *
 * Mythic's dev stack returns the phone code in its response; this mock does the same, so the demo
 * can show the code on screen instead of sending a text.
 */

import { RoleId } from "../../config/navigationConfig.js";
import {
  DEFAULT_ACCOUNT_FOR_ROLE,
  DEMO_PASSWORD,
  findAccountById,
  findPhoneAccount,
  findStaffByEmail,
  normalisePhone,
} from "./demoAccounts.js";

const SESSION_KEY = "navexa_session";
const PRIVACY_KEY = "navexa_privacy_accepted";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

// Codes waiting to be typed, by phone number. In memory only: a reload asks for a new code.
const pendingCodes = new Map();

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage. The session then lasts until the tab closes.
  }
};

/** What the app knows about whoever is signed in. Never holds a password. */
export const sessionFor = (account) => {
  const isStaff = Boolean(account.email);
  return {
    accountId: account.id,
    kind: isStaff ? "staff" : "phone",
    role: isStaff ? account.role : RoleId.PATIENT,
    name: account.name,
    jobTitle: account.jobTitle ?? null,
    facilityId: account.facilityId ?? null,
    hprId: account.hprId ?? null,
    referralId: account.referralId ?? null,
    relation: account.relation ?? null,
    signedInAt: new Date().toISOString(),
  };
};

const startSession = (account) => {
  const session = sessionFor(account);
  writeJson(SESSION_KEY, session);
  return { ok: true, session };
};

export const getSession = () => {
  const session = readJson(SESSION_KEY, null);
  // A session for an account that no longer exists is dropped rather than trusted.
  return session && findAccountById(session.accountId) ? session : null;
};

export const signOut = async () => {
  writeJson(SESSION_KEY, null);
  return { ok: true };
};

export const signInStaff = async ({ email, password }) => {
  const account = findStaffByEmail(email);
  // One message for both cases, so the screen doesn't reveal which emails exist.
  if (!account || password !== DEMO_PASSWORD) return { ok: false, error: "Email or password is not right." };
  return startSession(account);
};

export const requestPhoneCode = async ({ phone, now = Date.now() }) => {
  const digits = normalisePhone(phone);
  if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: "Enter a 10-digit mobile number." };
  const account = findPhoneAccount(digits);
  if (!account) return { ok: false, error: "This number isn't linked to a patient yet. Ask your care coordinator." };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingCodes.set(digits, { code, expiresAt: now + OTP_TTL_MS, attempts: 0 });
  return { ok: true, demoCode: code, expiresInSeconds: OTP_TTL_MS / 1000 };
};

export const verifyPhoneCode = async ({ phone, code, now = Date.now() }) => {
  const digits = normalisePhone(phone);
  const pending = pendingCodes.get(digits);
  if (!pending) return { ok: false, error: "Ask for a new code." };
  if (now > pending.expiresAt) {
    pendingCodes.delete(digits);
    return { ok: false, error: "That code has run out. Ask for a new one." };
  }
  pending.attempts += 1;
  if (String(code ?? "").trim() !== pending.code) {
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      pendingCodes.delete(digits);
      return { ok: false, error: "Too many wrong codes. Ask for a new one." };
    }
    return { ok: false, error: "That code is not right." };
  }
  pendingCodes.delete(digits);
  return startSession(findPhoneAccount(digits));
};

/** Demo only: sign straight in as a role's usual account, for the guided demo and the "sign in as" menu. */
export const signInAsDemoRole = (role) => {
  const account = findAccountById(DEFAULT_ACCOUNT_FOR_ROLE[role]);
  return account ? startSession(account) : { ok: false, error: "No demo account for that role." };
};

/** Demo only: sign straight in as one account. */
export const signInAsDemoAccount = (accountId) => {
  const account = findAccountById(accountId);
  return account ? startSession(account) : { ok: false, error: "No such demo account." };
};

// The privacy notice is accepted once per account on this browser.
export const hasAcceptedPrivacy = (accountId) => readJson(PRIVACY_KEY, []).includes(accountId);

export const acceptPrivacy = (accountId) => {
  const accepted = readJson(PRIVACY_KEY, []);
  if (!accepted.includes(accountId)) writeJson(PRIVACY_KEY, [...accepted, accountId]);
};

export const clearAuthData = () => {
  writeJson(SESSION_KEY, null);
  writeJson(PRIVACY_KEY, null);
  pendingCodes.clear();
};
