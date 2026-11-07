/**
 * NAVEXA HEALTH — THE HOSPITAL NETWORK AT A GLANCE
 * How full each hospital really is, what is already coming its way, and how fast it replies.
 * The thresholds are demo values. They need operational review before real use.
 */

import { getResponseClock } from "./alarms.js";
import { isHighAcuity, ReferralStatus } from "./enums.js";
import { canTakeCase } from "./hospitalChoice.js";

/** Services a coordinator filters by, in the order the services grid shows them. */
export const SERVICES = [
  { id: "NICU", label: "NICU" },
  { id: "SURGICAL_NICU", label: "Surgical NICU" },
  { id: "EMERGENCY_CS", label: "Emergency C-section" },
  { id: "MFM_24_7", label: "24/7 MFM" },
  { id: "MATERNAL_ICU", label: "Maternal ICU" },
  { id: "PHOTOTHERAPY", label: "Phototherapy" },
  { id: "ECMO", label: "ECMO" },
  { id: "FETAL_SURGERY", label: "Fetal surgery" },
  { id: "TELEMETRY", label: "Telemetry" },
  { id: "TRIAGE_BAY", label: "Triage bay" },
  { id: "INTERPRETERS", label: "Interpreters" },
  { id: "BIRTHING", label: "Low-risk birthing" },
  { id: "NST", label: "Antenatal NST" },
  { id: "BILIRUBIN_SCREENING", label: "Bilirubin screening" },
  { id: "WELL_BABY", label: "Well-baby checks" },
  { id: "LACTATION", label: "Lactation support" },
  { id: "SOCIAL_WORK", label: "Social work" },
];

export const CARE_LEVEL_LABELS = { 1: "Primary", 2: "Level II", 3: "Level III", 4: "Level IV" };

export const Pressure = { OPEN: "OPEN", BUSY: "BUSY", FULL: "FULL" };
const BUSY_AT = 0.75;
const FULL_AT = 0.9;

const MS_PER_MINUTE = 60_000;
const toTime = (value) => new Date(value).getTime();

/**
 * Referred patients the hospital still has to answer, has accepted and is waiting for,
 * and has admitted but not yet discharged.
 */
export const getInboundLoad = (hospital, referrals = []) => {
  const inbound = referrals.filter((r) => r.toFacility === hospital.name);
  const count = (status) => inbound.filter((r) => r.status === status).length;
  return {
    awaitingReply: count(ReferralStatus.SENT),
    onTheWay: count(ReferralStatus.ACKNOWLEDGED),
    // The bed stays held while the assessment is recorded, until the case is completed.
    inCare: count(ReferralStatus.ARRIVAL_CONFIRMED) + count(ReferralStatus.CLINICAL_ASSESSMENT_RECORDED),
  };
};

/**
 * Free beds once the hospital's referred patients are counted.
 * bedsAvailable is the hospital's listed figure and does not change when a referred patient
 * arrives, so a bed stays held from acceptance until the case is completed. Counting only
 * patients on the way would hand the bed back the moment the patient arrives.
 */
export const getOccupancy = (hospital, referrals = []) => {
  const { onTheWay, inCare } = getInboundLoad(hospital, referrals);
  const total = hospital.totalBeds || 0;
  const held = onTheWay + inCare;
  const freeAfterArrivals = Math.max(0, (hospital.bedsAvailable || 0) - held);
  const share = total > 0 ? (total - freeAfterArrivals) / total : 1;
  const pressure = share >= FULL_AT ? Pressure.FULL : share >= BUSY_AT ? Pressure.BUSY : Pressure.OPEN;
  return { freeAfterArrivals, held, share, pressure };
};

/** Minutes from a referral being sent to the hospital accepting it. */
const replyMinutes = (referral) => {
  const timeline = referral.timeline || [];
  // Only the current hospital's reply counts: an acceptance after the last send, which went to it.
  // An earlier acceptance belongs to a hospital that later declined, or that the case moved away from.
  const sentAt = timeline.findLastIndex((t) => t.status === ReferralStatus.SENT);
  if (sentAt < 0) return null;
  const accepted = timeline.slice(sentAt + 1).find((t) => t.status === ReferralStatus.ACKNOWLEDGED);
  if (!accepted) return null;
  // A patient who arrived at another hospital moved the case after this acceptance.
  const movedAt = (referral.redirectHistory || []).at(-1)?.date;
  if (movedAt && toTime(movedAt) > toTime(accepted.date)) return null;
  return Math.round((toTime(accepted.date) - toTime(timeline[sentAt].date)) / MS_PER_MINUTE);
};

/** The hospital's median time to accept, or null when it has accepted nobody yet. */
export const getMedianReplyMinutes = (hospital, referrals = []) => {
  const times = referrals
    .filter((r) => r.toFacility === hospital.name)
    .map(replyMinutes)
    .filter((m) => m != null)
    .sort((a, b) => a - b);
  if (times.length === 0) return null;
  const mid = Math.floor(times.length / 2);
  return times.length % 2 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
};

/** Referrals waiting on this hospital past their reply limit. */
export const getLateReplies = (hospital, referrals = [], now = Date.now()) =>
  referrals.filter(
    (r) => r.toFacility === hospital.name && r.status === ReferralStatus.SENT && getResponseClock(r, now)?.isOverdue,
  ).length;

/** One row of the capacity board. */
export const getHospitalRow = (hospital, referrals = [], now = Date.now()) => ({
  ...hospital,
  ...getInboundLoad(hospital, referrals),
  ...getOccupancy(hospital, referrals),
  medianReplyMinutes: getMedianReplyMinutes(hospital, referrals),
  lateReplies: getLateReplies(hospital, referrals, now),
});

/** The numbers across the whole network. */
export const getNetworkSummary = (rows) => ({
  bedsFree: rows.reduce((sum, r) => sum + r.freeAfterArrivals, 0),
  nearlyFull: rows.filter((r) => r.pressure === Pressure.FULL).length,
  inbound: rows.reduce((sum, r) => sum + r.awaitingReply + r.onTheWay, 0),
  lateReplies: rows.reduce((sum, r) => sum + r.lateReplies, 0),
});

/**
 * Whether a hospital fits what the patient needs and has a bed after arrivals. No needs given: every hospital fits.
 * This only narrows the options read to the family. The family chooses.
 */
export const fitsNeeds = (row, { referralType, priority, service } = {}) => {
  if (!referralType && !priority && !service) return true;
  // Urgency and patient type are separate needs: either can be chosen without the other.
  if (isHighAcuity(priority) && !row.takesUrgent) return false;
  if (referralType && !canTakeCase(row, { referralType, priority })) return false;
  if (service && !(row.services || []).includes(service)) return false;
  return row.freeAfterArrivals > 0;
};
