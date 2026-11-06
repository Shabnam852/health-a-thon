/**
 * A patient or family member makes their own account with their mobile number. Demo grade, but the
 * one rule that matters is real: typing a referral number never shows a case on its own.
 *
 * - If the mobile is the one recorded on that referral (patient or emergency contact), the account
 *   is linked straight away: the clinic already wrote this number down for this case.
 * - Otherwise a link request goes to the care coordinator, who checks with the family (a phone call)
 *   and approves or declines it. Until then the account sees no case.
 *
 * Every function takes the whole saved document ({ referrals, accounts, linkRequests,
 * notifications }) and returns a new one, so it is shared through /api/state like everything else.
 */

import { AuditRole } from "./enums.js";
import { createAuditEvent } from "./models.js";
import { isIndianMobile, normaliseMobile } from "./phoneAccounts.js";

export const LinkStatus = Object.freeze({ PENDING: "PENDING", APPROVED: "APPROVED", DECLINED: "DECLINED" });

/** Referral numbers as people type them: any case, spaces, a missing dash. */
export const findReferralByNumber = (referrals, typed) => {
  const wanted = String(typed ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!wanted) return null;
  return (
    referrals.find(
      (r) =>
        String(r.id)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "") === wanted,
    ) ?? null
  );
};

const phonesOn = (referral) =>
  [referral.patientPhone, referral.caregiverContact].map(normaliseMobile).filter(isIndianMobile);

const isOnReferral = (referral, phone) => phonesOn(referral).includes(phone);

const notification = (now, title, message, link) => ({
  id: `NOTIF-${now}-${Math.random().toString(36).slice(2, 7)}`,
  timestamp: "Just now",
  type: "INFO",
  title,
  message,
  link,
  read: false,
});

const withAudit = (referral, now, details, actor, role) => ({
  ...referral,
  auditTrail: [
    ...(referral.auditTrail ?? []),
    createAuditEvent({ actor, role, action: "FAMILY_ACCOUNT_LINKED", details, timestamp: new Date(now).toISOString() }),
  ],
});

/** Checks the form before the code is used up, so a typo doesn't cost the family a new code. */
export const checkRegistration = (data, { phone, name, reference }, isTaken) => {
  const digits = normaliseMobile(phone);
  if (!isIndianMobile(digits)) return { ok: false, error: "Enter a 10-digit mobile number." };
  if (isTaken(digits)) return { ok: false, error: "This number already has an account. Sign in instead." };
  if (!String(name ?? "").trim()) return { ok: false, error: "Enter your name." };
  if (String(reference ?? "").trim() && !findReferralByNumber(data.referrals, reference)) {
    return { ok: false, error: "We can't find that referral number. Check the slip, or leave it empty for now." };
  }
  return { ok: true, phone: digits };
};

/**
 * Links an account to a referral, or asks the coordinator to. Returns
 * { ok, data, linked, pending } or { ok: false, error }.
 */
export const requestLink = (data, { accountId, reference, now = Date.now() }) => {
  const accounts = data.accounts ?? [];
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return { ok: false, error: "Account not found." };
  const referral = findReferralByNumber(data.referrals, reference);
  if (!referral) return { ok: false, error: "We can't find that referral number. Check the slip from your clinic." };

  if (isOnReferral(referral, account.phone)) {
    return {
      ok: true,
      linked: true,
      pending: false,
      data: {
        ...data,
        accounts: accounts.map((a) => (a.id === accountId ? { ...a, referralId: referral.id } : a)),
        referrals: data.referrals.map((r) =>
          r.id === referral.id
            ? withAudit(
                r,
                now,
                `${account.name} (${account.relation === "self" ? "patient" : account.relation}) signed up with the mobile on this referral and was linked.`,
                account.name,
                AuditRole.PATIENT,
              )
            : r,
        ),
      },
    };
  }

  const requests = data.linkRequests ?? [];
  // One open request per account: asking again replaces the last one.
  const request = {
    id: `LINK-${now.toString(36).toUpperCase()}-${accountId.slice(-4)}`,
    accountId,
    phone: account.phone,
    name: account.name,
    relation: account.relation,
    referralId: referral.id,
    status: LinkStatus.PENDING,
    createdAt: new Date(now).toISOString(),
  };
  return {
    ok: true,
    linked: false,
    pending: true,
    request,
    data: {
      ...data,
      linkRequests: [
        request,
        ...requests.filter((r) => !(r.accountId === accountId && r.status === LinkStatus.PENDING)),
      ],
      notifications: [
        notification(
          now,
          "Family asks to be linked",
          `${account.name} (${account.relation === "self" ? "says they are the patient" : account.relation}) asks to follow ${referral.patientName}'s referral. Call them to check before you approve.`,
          "/coordinator",
        ),
        ...(data.notifications ?? []),
      ],
    },
  };
};

/** A new account made by the family. Returns { ok, data, account, linked, pending } or { ok: false, error }. */
export const registerAccount = (data, { phone, name, relation = "self", reference = "", now = Date.now() }) => {
  const account = {
    id: `SELF-${now.toString(36).toUpperCase()}-${phone.slice(-4)}`,
    phone,
    name: String(name).trim(),
    relation: relation === "self" ? "self" : String(relation).trim() || "Family",
    referralId: null,
    selfRegistered: true,
    createdAt: new Date(now).toISOString(),
  };
  const withAccount = { ...data, accounts: [account, ...(data.accounts ?? []).filter((a) => a.phone !== phone)] };
  if (!String(reference).trim()) return { ok: true, data: withAccount, account, linked: false, pending: false };
  const linked = requestLink(withAccount, { accountId: account.id, reference, now });
  if (!linked.ok) return { ok: true, data: withAccount, account, linked: false, pending: false };
  return { ...linked, account };
};

/** The coordinator's answer to a link request. */
export const decideLink = (data, { requestId, approve, decidedBy, reason = "", now = Date.now() }) => {
  const requests = data.linkRequests ?? [];
  const request = requests.find((r) => r.id === requestId);
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== LinkStatus.PENDING) return { ok: false, error: "This request was already answered." };
  const decided = {
    ...request,
    status: approve ? LinkStatus.APPROVED : LinkStatus.DECLINED,
    decidedBy,
    decidedAt: new Date(now).toISOString(),
    reason: approve ? "" : String(reason).trim(),
  };
  const next = { ...data, linkRequests: requests.map((r) => (r.id === requestId ? decided : r)) };
  if (!approve) return { ok: true, data: next, request: decided };
  return {
    ok: true,
    request: decided,
    data: {
      ...next,
      accounts: (data.accounts ?? []).map((a) =>
        a.id === request.accountId ? { ...a, referralId: request.referralId } : a,
      ),
      referrals: data.referrals.map((r) =>
        r.id === request.referralId
          ? withAudit(
              r,
              now,
              `${request.name} (${request.relation === "self" ? "patient" : request.relation}, ${request.phone}) linked after a check by ${decidedBy}.`,
              decidedBy,
              AuditRole.COORDINATOR,
            )
          : r,
      ),
    },
  };
};

/** The newest request for an account, for the family's waiting screen. */
export const latestRequestFor = (data, accountId) =>
  (data.linkRequests ?? [])
    .filter((r) => r.accountId === accountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

export const pendingRequests = (data) => (data.linkRequests ?? []).filter((r) => r.status === LinkStatus.PENDING);
