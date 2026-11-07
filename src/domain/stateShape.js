/**
 * What a saved document must look like before any screen reads it. Used by the server before it
 * stores a document and by every browser before it uses one, so one bad save can't break the app
 * for everyone. Items that don't fit are dropped, not repaired; whole lists of the wrong type are
 * left out so the seed fills them in.
 */

import { ReferralStatus } from "./enums.js";

const STATUSES = new Set(Object.values(ReferralStatus));

export const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const hasId = (item) => isPlainObject(item) && (typeof item.id === "string" || typeof item.id === "number");

const optionalArray = (v) => v === undefined || Array.isArray(v);
const optionalObject = (v) => v === undefined || v === null || isPlainObject(v);
const optionalString = (v) => v === undefined || v === null || typeof v === "string";

// Fields the screens and rules read on every referral.
const REFERRAL_ARRAYS = ["timeline", "auditTrail", "barriers", "declinedBy", "redirectHistory", "contactHistory"];
const REFERRAL_OBJECTS = [
  "vitals",
  "transit",
  "arrival",
  "clinicalOutcome",
  "followUpPlan",
  "navigator",
  "patientChoice",
  "arrivalReport",
  "callBackRequest",
  "handoff",
];
const REFERRAL_STRINGS = ["patientName", "toFacility", "fromFacility", "priority", "patientPhone", "caregiverContact"];

const isUsableReferral = (r) =>
  hasId(r) &&
  STATUSES.has(r.status) &&
  REFERRAL_ARRAYS.every((k) => optionalArray(r[k])) &&
  REFERRAL_OBJECTS.every((k) => optionalObject(r[k])) &&
  REFERRAL_STRINGS.every((k) => optionalString(r[k])) &&
  (r.followUpPlan == null || optionalArray(r.followUpPlan.tasks)) &&
  (r.timeline ?? []).every(isPlainObject) &&
  (r.auditTrail ?? []).every(isPlainObject) &&
  (r.barriers ?? []).every(isPlainObject);

const isUsableAccount = (a) => hasId(a) && typeof a.phone === "string" && optionalString(a.referralId);

const ITEM_RULES = {
  referrals: isUsableReferral,
  accounts: isUsableAccount,
  navigators: isPlainObject,
  fleet: hasId,
  notifications: hasId,
  linkRequests: (r) => hasId(r) && typeof r.accountId === "string" && typeof r.status === "string",
  messages: (m) => hasId(m) && typeof m.referralId === "string" && typeof m.body === "string",
};

/**
 * The referrals document with every unusable item dropped, or null when no usable referral is left.
 * Lists of the wrong type are left out, so the caller's seed fills them.
 */
export const cleanDomainDoc = (doc) => {
  if (!isPlainObject(doc)) return null;
  const clean = {};
  for (const [key, rule] of Object.entries(ITEM_RULES)) {
    if (Array.isArray(doc[key])) clean[key] = doc[key].filter(rule);
  }
  return clean.referrals?.length ? clean : null;
};

const isUsableConsent = (c) =>
  isPlainObject(c) &&
  typeof c.id === "string" &&
  typeof c.referralId === "string" &&
  typeof c.status === "string" &&
  typeof c.createdAt === "string" &&
  optionalArray(c.records) &&
  optionalArray(c.hiTypes);

const isUsableLink = (l) => isPlainObject(l) && typeof l.abhaAddress === "string";

/** The ABDM document with unusable links and consents dropped, or null if it isn't one. */
export const cleanAbdmDoc = (doc) => {
  if (!isPlainObject(doc) || !isPlainObject(doc.abhaLinks) || !Array.isArray(doc.consents)) return null;
  return {
    abhaLinks: Object.fromEntries(Object.entries(doc.abhaLinks).filter(([, link]) => isUsableLink(link))),
    consents: doc.consents.filter(isUsableConsent),
  };
};
