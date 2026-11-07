/**
 * What the family can tell the care team from their own screen (FR-46, Q9): that they have
 * arrived at a hospital, and that they want a call back. Both are evidence, never a status
 * change: only the hospital confirms arrival (workflow.confirmArrival). Each action returns
 * { success, referral, alerts } like recordFamilyReport, where alerts are staff notifications.
 */

import { AuditRole, ReferralStatus, TimelineEvent } from "./enums.js";
import { createAuditEvent } from "./models.js";
import { hasArrivedAtFacility, isFloating, PATIENT_OR_FAMILY } from "./workflow.js";

const nowIso = () => new Date().toISOString();
const fail = (reason) => ({ success: false, reason });
const MAX_REASON_CHARS = 200;

/** What staff see wherever the case is shown, so a report can't be read as a confirmed arrival. */
export const ARRIVAL_REPORTED_LABEL = "Arrival reported by family, not confirmed";
export const CALL_BACK_LABEL = "Family asked for a call back";

const withEvents = (referral, { timeline = [], audit = [] }) => ({
  ...referral,
  timeline: [...(referral.timeline || []), ...timeline],
  auditTrail: [...(referral.auditTrail || []), ...audit],
});

/** The family said they arrived and no hospital has confirmed it yet. Confirmation clears it. */
export const isArrivalReportedOnly = (referral) => Boolean(referral?.arrivalReport) && !hasArrivedAtFacility(referral);

/**
 * The family can say they arrived while the referral is on its way: sent or accepted, or
 * declined with the patient's own plan to go somewhere else. Any hospital may be the one.
 */
export const canReportArrival = (referral) => {
  if (!referral || hasArrivedAtFacility(referral) || referral.arrivalReport) return false;
  if (isFloating(referral)) return Boolean(referral.patientChoice?.elsewhere);
  return [ReferralStatus.SENT, ReferralStatus.ACKNOWLEDGED].includes(referral.status);
};

export const reportArrival = (referral, { reportedBy = PATIENT_OR_FAMILY, place = "" } = {}, now = nowIso()) => {
  if (hasArrivedAtFacility(referral)) return fail(`Arrival is already confirmed at ${referral.toFacility}.`);
  if (referral.arrivalReport) return fail("Arrival has already been reported. The hospital will confirm it.");
  if (!canReportArrival(referral)) return fail("This referral is not on its way to a hospital yet.");

  const where = String(place || "")
    .trim()
    .slice(0, MAX_REASON_CHARS);
  const said = `Family says they have arrived${where ? ` at ${where}` : " at a hospital"}.`;
  return {
    success: true,
    alerts: [
      {
        type: "INFO",
        title: "Family reported arrival",
        message: `${referral.patientName}: ${said} Not confirmed yet. The hospital confirms at reception.`,
      },
    ],
    referral: withEvents(
      { ...referral, arrivalReport: { reportedBy, reportedAt: now, place: where || null } },
      {
        timeline: [
          {
            status: TimelineEvent.ARRIVAL_REPORTED,
            date: now,
            notes: `${said} Not confirmed: only the hospital can confirm arrival.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: reportedBy,
            role: AuditRole.PATIENT,
            action: "ARRIVAL_REPORTED",
            details: `${said} Status unchanged until the hospital confirms.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

/** A call back is open until someone logs a contact with the family after it was asked for. */
export const hasOpenCallBack = (referral) => {
  const asked = referral?.callBackRequest?.requestedAt;
  if (!asked) return false;
  return !(referral.contactLogs || []).some((log) => log.date >= asked);
};

export const requestCallBack = (referral, { reason = "", requestedBy = PATIENT_OR_FAMILY } = {}, now = nowIso()) => {
  if (hasOpenCallBack(referral)) return fail("You have already asked for a call back.");

  const why = String(reason || "")
    .trim()
    .slice(0, MAX_REASON_CHARS);
  const note = `${CALL_BACK_LABEL}.${why ? ` Reason: "${why}".` : ""}`;
  return {
    success: true,
    alerts: [
      {
        type: "WARNING",
        title: CALL_BACK_LABEL,
        message: `Call ${referral.patientName}'s family.${why ? ` They said: "${why}".` : ""}`,
      },
    ],
    referral: withEvents(
      { ...referral, callBackRequest: { requestedBy, requestedAt: now, reason: why || null } },
      {
        timeline: [{ status: TimelineEvent.CALL_BACK_REQUESTED, date: now, notes: note }],
        audit: [
          createAuditEvent({
            actor: requestedBy,
            role: AuditRole.PATIENT,
            action: "CALL_BACK_REQUESTED",
            details: note,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

/** Staff-facing lines for what the family has told the team and is still open. */
export const familyFlags = (referral) =>
  [isArrivalReportedOnly(referral) && ARRIVAL_REPORTED_LABEL, hasOpenCallBack(referral) && CALL_BACK_LABEL].filter(
    Boolean,
  );
