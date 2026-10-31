/**
 * NAVEXA HEALTH — DOMAIN TRANSITIONS & STATE MACHINE RULES
 * Strict operational and clinical safety transition validation.
 */

import { ReferralStatus, TransportStatus, BarrierStatus, FollowUpStatus } from "./enums.js";

/**
 * Valid transitions map for Referrals
 */
const ALLOWED_REFERRAL_TRANSITIONS = {
  [ReferralStatus.CREATED]: [ReferralStatus.SENT, ReferralStatus.REJECTED],
  [ReferralStatus.SENT]: [ReferralStatus.ACKNOWLEDGED, ReferralStatus.REJECTED, ReferralStatus.REDIRECTED],
  [ReferralStatus.ACKNOWLEDGED]: [
    ReferralStatus.ARRIVAL_CONFIRMED,
    ReferralStatus.REJECTED,
    ReferralStatus.REDIRECTED,
  ],
  [ReferralStatus.REJECTED]: [ReferralStatus.REDIRECTED],
  [ReferralStatus.REDIRECTED]: [ReferralStatus.SENT],
  [ReferralStatus.ARRIVAL_CONFIRMED]: [
    ReferralStatus.CLINICAL_ASSESSMENT_RECORDED,
    ReferralStatus.COMPLETED,
  ],
  [ReferralStatus.CLINICAL_ASSESSMENT_RECORDED]: [ReferralStatus.COMPLETED],
  [ReferralStatus.COMPLETED]: [], // Terminal referral state (continuous care handles follow-up)
};

/**
 * Valid transitions map for Transport
 */
const ALLOWED_TRANSPORT_TRANSITIONS = {
  [TransportStatus.NOT_REQUIRED]: [TransportStatus.REQUESTED],
  [TransportStatus.REQUESTED]: [TransportStatus.ASSIGNED, TransportStatus.CANCELLED],
  [TransportStatus.ASSIGNED]: [TransportStatus.DISPATCHED, TransportStatus.CANCELLED],
  [TransportStatus.DISPATCHED]: [TransportStatus.PICKED_UP, TransportStatus.FAILED, TransportStatus.CANCELLED],
  [TransportStatus.PICKED_UP]: [TransportStatus.ARRIVED, TransportStatus.FAILED],
  [TransportStatus.ARRIVED]: [],
  [TransportStatus.CANCELLED]: [TransportStatus.REQUESTED],
  [TransportStatus.FAILED]: [TransportStatus.REQUESTED], // Can re-request transport
};

/**
 * Valid transitions map for Barriers
 */
const ALLOWED_BARRIER_TRANSITIONS = {
  [BarrierStatus.IDENTIFIED]: [BarrierStatus.ASSIGNED, BarrierStatus.IN_PROGRESS, BarrierStatus.RESOLVED],
  [BarrierStatus.ASSIGNED]: [BarrierStatus.IN_PROGRESS, BarrierStatus.RESOLVED],
  [BarrierStatus.IN_PROGRESS]: [BarrierStatus.RESOLVED, BarrierStatus.UNRESOLVED],
  [BarrierStatus.UNRESOLVED]: [BarrierStatus.IN_PROGRESS, BarrierStatus.RESOLVED],
  [BarrierStatus.RESOLVED]: [BarrierStatus.IDENTIFIED], // Re-opened if recurred
};

/**
 * Valid transitions map for Follow-up tasks
 */
const ALLOWED_FOLLOW_UP_TRANSITIONS = {
  [FollowUpStatus.PLANNED]: [FollowUpStatus.SCHEDULED, FollowUpStatus.DUE],
  [FollowUpStatus.SCHEDULED]: [FollowUpStatus.DUE, FollowUpStatus.COMPLETED, FollowUpStatus.MISSED],
  [FollowUpStatus.DUE]: [FollowUpStatus.COMPLETED, FollowUpStatus.MISSED, FollowUpStatus.ESCALATED],
  [FollowUpStatus.MISSED]: [FollowUpStatus.ESCALATED, FollowUpStatus.SCHEDULED],
  [FollowUpStatus.ESCALATED]: [FollowUpStatus.SCHEDULED, FollowUpStatus.COMPLETED],
  [FollowUpStatus.COMPLETED]: [],
};

/**
 * Validates a proposed referral status transition.
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateReferralTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return { valid: true };
  }
  const allowed = ALLOWED_REFERRAL_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
    };
  }
  return { valid: true };
};

/**
 * Validates a proposed transport status transition.
 */
export const validateTransportTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return { valid: true };
  }
  const allowed = ALLOWED_TRANSPORT_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid transport transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
    };
  }
  return { valid: true };
};

/**
 * Validates a proposed barrier status transition.
 */
export const validateBarrierTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return { valid: true };
  }
  const allowed = ALLOWED_BARRIER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid barrier transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
    };
  }
  return { valid: true };
};

/**
 * Validates a proposed follow-up task status transition.
 */
export const validateFollowUpTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return { valid: true };
  }
  const allowed = ALLOWED_FOLLOW_UP_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid follow-up transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
    };
  }
  return { valid: true };
};

