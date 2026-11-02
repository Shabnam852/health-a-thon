/**
 * NAVEXA HEALTH — DOMAIN TRANSITIONS & STATE MACHINE RULES
 * Strict operational and clinical safety transition validation.
 */

import { BarrierStatus, FollowUpStatus, ReferralStatus, TransportStatus } from "./enums.js";

/**
 * Valid transitions map for Referrals.
 * Arrival must pass through a recorded clinical assessment before completion.
 * A patient can reach a hospital at any point before that, whatever the plan said,
 * so arrival is allowed from every open state after the referral is sent.
 */
const ALLOWED_REFERRAL_TRANSITIONS = {
  [ReferralStatus.CREATED]: [ReferralStatus.SENT, ReferralStatus.REJECTED],
  [ReferralStatus.SENT]: [
    ReferralStatus.ACKNOWLEDGED,
    ReferralStatus.ARRIVAL_CONFIRMED,
    ReferralStatus.REJECTED,
    ReferralStatus.REDIRECTED,
  ],
  [ReferralStatus.ACKNOWLEDGED]: [ReferralStatus.ARRIVAL_CONFIRMED, ReferralStatus.REJECTED, ReferralStatus.REDIRECTED],
  [ReferralStatus.REJECTED]: [ReferralStatus.ARRIVAL_CONFIRMED, ReferralStatus.REDIRECTED],
  [ReferralStatus.REDIRECTED]: [ReferralStatus.SENT],
  [ReferralStatus.ARRIVAL_CONFIRMED]: [ReferralStatus.CLINICAL_ASSESSMENT_RECORDED],
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
 * Valid transitions map for Follow-up tasks.
 * A planned touchpoint may be completed directly: nothing in the app moves tasks
 * to SCHEDULED or DUE, and a visit that happened still has to be recordable.
 */
const ALLOWED_FOLLOW_UP_TRANSITIONS = {
  [FollowUpStatus.PLANNED]: [FollowUpStatus.SCHEDULED, FollowUpStatus.DUE, FollowUpStatus.COMPLETED],
  [FollowUpStatus.SCHEDULED]: [FollowUpStatus.DUE, FollowUpStatus.COMPLETED, FollowUpStatus.MISSED],
  [FollowUpStatus.DUE]: [FollowUpStatus.COMPLETED, FollowUpStatus.MISSED, FollowUpStatus.ESCALATED],
  [FollowUpStatus.MISSED]: [FollowUpStatus.ESCALATED, FollowUpStatus.SCHEDULED],
  [FollowUpStatus.ESCALATED]: [FollowUpStatus.SCHEDULED, FollowUpStatus.COMPLETED],
  [FollowUpStatus.COMPLETED]: [],
};

/**
 * Builds a validator. A repeat of the current status is rejected so that a
 * double action cannot append duplicate timeline and audit entries.
 * @returns {(currentStatus: string, nextStatus: string) => { valid: boolean, reason?: string }}
 */
const createValidator = (allowedTransitions, label) => (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return { valid: false, reason: `Already ${currentStatus}.` };
  }
  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid ${label} from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
    };
  }
  return { valid: true };
};

export const validateReferralTransition = createValidator(ALLOWED_REFERRAL_TRANSITIONS, "transition");
export const validateTransportTransition = createValidator(ALLOWED_TRANSPORT_TRANSITIONS, "transport transition");
export const validateBarrierTransition = createValidator(ALLOWED_BARRIER_TRANSITIONS, "barrier transition");
export const validateFollowUpTransition = createValidator(ALLOWED_FOLLOW_UP_TRANSITIONS, "follow-up transition");
