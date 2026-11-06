/**
 * A stand-in for ABDM (India's national health records network), for the demo. Nothing here talks
 * to ABDM. It follows the real steps so the screens are right when it does:
 *
 *   1. The family links their ABHA (health ID) after a code check.
 *   2. Hospital staff ask for past records, for care management (purpose code CAREMGT), for chosen
 *      record types and dates. ABDM would send this to the family's ABHA app.
 *   3. The family approves or declines. In real use they do this in their ABHA app, not in Navexa.
 *   4. On approval the records arrive. They are deleted on the delete-by date, or when the family
 *      stops sharing (revokes).
 *
 * Later this file is replaced by one that calls Mythic's ABDM routes (which call the ABDM gateway).
 * Every call stays async with the same { ok, ... } results.
 */

import { buildMockRecords } from "./mockRecords.js";

const STORE_KEY = "navexa_abdm_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export const ConsentStatus = Object.freeze({
  REQUESTED: "REQUESTED",
  GRANTED: "GRANTED",
  DENIED: "DENIED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
});

/** ABDM's record types, named the way staff and families say them. */
export const HiType = Object.freeze({
  OP_CONSULTATION: "OPConsultation",
  DIAGNOSTIC_REPORT: "DiagnosticReport",
  PRESCRIPTION: "Prescription",
  IMMUNIZATION: "ImmunizationRecord",
  DISCHARGE_SUMMARY: "DischargeSummary",
});

export const HI_TYPE_LABELS = {
  [HiType.OP_CONSULTATION]: "Clinic visits",
  [HiType.DIAGNOSTIC_REPORT]: "Test results and scans",
  [HiType.PRESCRIPTION]: "Medicines",
  [HiType.IMMUNIZATION]: "Vaccines",
  [HiType.DISCHARGE_SUMMARY]: "Hospital stays",
};

export const CARE_MANAGEMENT = { code: "CAREMGT", text: "Care management" };

/** How long shared records stay before they are deleted. */
export const DEFAULT_KEEP_DAYS = 30;

// The demo starts with two patients' health IDs already linked, so staff can ask for records at once.
const seedState = () => ({
  abhaLinks: {
    "NX-9042": {
      abhaAddress: "shalini.naidu@sbx",
      holderName: "Shalini Naidu",
      holderRelation: "Mother",
      linkedAt: "2026-10-30T09:12:00.000Z",
    },
    "REF-2024-8821": {
      abhaAddress: "ananya.reddy@sbx",
      holderName: "Ananya Reddy",
      holderRelation: "self",
      linkedAt: "2026-10-28T11:40:00.000Z",
    },
  },
  consents: [],
});

const pendingAbhaCodes = new Map();

const load = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.abhaLinks === "object" && Array.isArray(parsed.consents)) return parsed;
    }
  } catch {
    // Fall through to a fresh start.
  }
  return seedState();
};

const writeLocal = (state) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be refused in a private window; the demo then forgets on reload.
  }
};

// Told about every save, so AbdmProvider can send it to the server for the other devices.
let saveListener = null;
export const setAbdmSaveListener = (listener) => {
  saveListener = listener;
};

const save = (state) => {
  writeLocal(state);
  saveListener?.(state);
  return state;
};

/** A usable saved copy (from the server), or null. */
export const normaliseAbdmState = (doc) =>
  doc && typeof doc.abhaLinks === "object" && doc.abhaLinks !== null && Array.isArray(doc.consents) ? doc : null;

/** Takes the server's copy, without sending it back. */
export const replaceAbdmState = (state) => writeLocal(state);

/** A fresh start, as the demo begins. */
export const freshAbdmState = () => seedState();

/**
 * A granted consent past its delete-by date becomes EXPIRED and its records are deleted.
 * Pure: returns a new state, and the same object when nothing changed.
 */
export const applyExpiry = (state, now = Date.now()) => {
  let changed = false;
  const consents = state.consents.map((c) => {
    if (c.status === ConsentStatus.GRANTED && Date.parse(c.dataEraseAt) <= now) {
      changed = true;
      return { ...c, status: ConsentStatus.EXPIRED, records: [], updatedAt: new Date(now).toISOString() };
    }
    return c;
  });
  return changed ? { ...state, consents } : state;
};

export const getAbdmState = (now = Date.now()) => {
  const state = load();
  const current = applyExpiry(state, now);
  return current === state ? state : save(current);
};

export const consentsForReferral = (state, referralId) =>
  state.consents.filter((c) => c.referralId === referralId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** An ABHA address (name@sbx) or a 14-digit ABHA number. */
export const isValidAbha = (value) => {
  const v = String(value ?? "").trim();
  return /^[a-z0-9._]{3,32}@(sbx|abdm)$/i.test(v) || /^\d{2}-?\d{4}-?\d{4}-?\d{4}$/.test(v);
};

export const requestAbhaCode = async ({ abhaAddress }) => {
  if (!isValidAbha(abhaAddress)) {
    return { ok: false, error: "Enter an ABHA address like name@sbx, or a 14-digit ABHA number." };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingAbhaCodes.set(abhaAddress.trim().toLowerCase(), code);
  return { ok: true, demoCode: code };
};

export const linkAbha = async ({ referralId, abhaAddress, holderName, holderRelation = "self", code }) => {
  const key = String(abhaAddress ?? "")
    .trim()
    .toLowerCase();
  if (pendingAbhaCodes.get(key) !== String(code ?? "").trim()) return { ok: false, error: "That code is not right." };
  pendingAbhaCodes.delete(key);
  const state = getAbdmState();
  const link = { abhaAddress: key, holderName, holderRelation, linkedAt: new Date().toISOString() };
  save({ ...state, abhaLinks: { ...state.abhaLinks, [referralId]: link } });
  return { ok: true, link };
};

export const unlinkAbha = async ({ referralId }) => {
  const state = getAbdmState();
  const { [referralId]: _removed, ...rest } = state.abhaLinks;
  save({ ...state, abhaLinks: rest });
  return { ok: true };
};

export const requestConsent = async ({
  referralId,
  hiTypes,
  fromDate,
  toDate,
  requester,
  keepDays = DEFAULT_KEEP_DAYS,
  now = Date.now(),
}) => {
  const state = getAbdmState(now);
  const link = state.abhaLinks[referralId];
  if (!link) return { ok: false, error: "This patient has no ABHA linked." };
  if (!hiTypes?.length) return { ok: false, error: "Choose at least one kind of record." };
  if (!fromDate || !toDate || fromDate > toDate)
    return { ok: false, error: "Choose a start date before the end date." };
  // ABDM refuses a date range that ends in the future.
  if (Date.parse(toDate) > now + DAY_MS) return { ok: false, error: "The end date can't be in the future." };

  const consent = {
    id: `CR-${now.toString(36).toUpperCase()}`,
    referralId,
    abhaAddress: link.abhaAddress,
    purpose: CARE_MANAGEMENT,
    hiTypes: [...hiTypes],
    dateRange: { from: fromDate, to: toDate },
    keepDays,
    dataEraseAt: null,
    requester: {
      name: requester.name,
      hprId: requester.hprId ?? null,
      facility: requester.facility ?? null,
    },
    status: ConsentStatus.REQUESTED,
    records: [],
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  save({ ...state, consents: [consent, ...state.consents] });
  return { ok: true, consent };
};

const updateConsent = (consentId, change, now) => {
  const state = getAbdmState(now);
  const consent = state.consents.find((c) => c.id === consentId);
  if (!consent) return { ok: false, error: "Request not found." };
  const result = change(consent);
  if (!result.ok) return result;
  const next = { ...result.consent, updatedAt: new Date(now).toISOString() };
  save({ ...state, consents: state.consents.map((c) => (c.id === consentId ? next : c)) });
  return { ok: true, consent: next };
};

/** The family's answer. In real use this happens in their ABHA app. */
export const respondToConsent = async ({ consentId, approve, now = Date.now() }) =>
  updateConsent(
    consentId,
    (c) => {
      if (c.status !== ConsentStatus.REQUESTED) return { ok: false, error: "This request was already answered." };
      if (!approve) return { ok: true, consent: { ...c, status: ConsentStatus.DENIED } };
      return {
        ok: true,
        consent: {
          ...c,
          status: ConsentStatus.GRANTED,
          dataEraseAt: new Date(now + c.keepDays * DAY_MS).toISOString(),
          // In real use the other hospitals send these, encrypted, after a separate fetch.
          records: buildMockRecords({ referralId: c.referralId, hiTypes: c.hiTypes, dateRange: c.dateRange, now }),
        },
      };
    },
    now,
  );

/** The family stops sharing. The records are deleted straight away. */
export const revokeConsent = async ({ consentId, now = Date.now() }) =>
  updateConsent(
    consentId,
    (c) => {
      if (c.status !== ConsentStatus.GRANTED) return { ok: false, error: "Only shared records can be stopped." };
      return { ok: true, consent: { ...c, status: ConsentStatus.REVOKED, records: [] } };
    },
    now,
  );

export const resetAbdmData = () => {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // Nothing to clear.
  }
  pendingAbhaCodes.clear();
};
