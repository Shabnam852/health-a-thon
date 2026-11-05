/**
 * NAVEXA HEALTH — LANDING PAGE SELECTORS
 * Pure read-only views of the referral data, using the same rules as the workspaces
 * they link to, so a number on the landing page matches the screen behind it.
 */

import { BarrierCategory, BarrierStatus, isHighAcuity, PatientType, ReferralStatus, TransportStatus } from "./enums.js";
import { hasArrivedAtFacility, isRideMoving } from "./workflow.js";

export const JourneyState = Object.freeze({
  DONE: "done",
  ACTIVE: "active",
  AT_RISK: "at-risk",
  UPCOMING: "upcoming",
});

const findOpenTransportBarrier = (referral) =>
  (referral.barriers || []).find(
    (b) => b.category === BarrierCategory.TRANSPORT && b.status !== BarrierStatus.RESOLVED,
  );

export const getLandingStats = (referrals, facilityName = "") => {
  const facility = facilityName.toLowerCase();
  const isOpen = (r) => r.status !== ReferralStatus.COMPLETED;

  return {
    // Coordinator: everyone urgent still on the way, whether the Command Center lists them
    // under Act now (alarm raised) or in its attention list. The two lists never repeat a case.
    urgentNotArrived: referrals.filter((r) => isOpen(r) && isHighAcuity(r.priority) && !hasArrivedAtFacility(r)).length,
    // Facility: the Accepted / In-Transit tab.
    expectedArrivals: referrals.filter(
      (r) => r.status === ReferralStatus.ACKNOWLEDGED && r.toFacility?.toLowerCase().includes(facility),
    ).length,
  };
};

const transportState = (referral, accepted, arrived) => {
  const transit = referral.transit;
  if (arrived || transit?.status === TransportStatus.ARRIVED || transit?.status === TransportStatus.NOT_REQUIRED) {
    return JourneyState.DONE;
  }
  if (findOpenTransportBarrier(referral) || transit?.status === TransportStatus.FAILED) return JourneyState.AT_RISK;
  return accepted ? JourneyState.ACTIVE : JourneyState.UPCOMING;
};

/** The five steps of closing the loop, each with its current state. */
export const getReferralJourney = (referral) => {
  const { DONE, ACTIVE, AT_RISK, UPCOMING } = JourneyState;
  const arrived = hasArrivedAtFacility(referral);
  const sent = referral.status !== ReferralStatus.CREATED;
  const accepted = arrived || referral.status === ReferralStatus.ACKNOWLEDGED;
  const transport = transportState(referral, accepted, arrived);
  const plan = referral.followUpPlan;

  const acceptedState = () => {
    if (accepted) return DONE;
    if (referral.status === ReferralStatus.REJECTED) return AT_RISK;
    return sent ? ACTIVE : UPCOMING;
  };
  const arrivalState = () => {
    if (arrived) return DONE;
    return transport === DONE ? ACTIVE : UPCOMING;
  };
  const followUpState = () => {
    if (!plan) return UPCOMING;
    return plan.status === "COMPLETED" ? DONE : ACTIVE;
  };

  return [
    { id: "sent", label: "Sent", state: sent ? DONE : ACTIVE },
    { id: "acknowledged", label: "Acknowledged", state: acceptedState() },
    { id: "transport", label: "Transport", state: transport },
    { id: "arrived", label: "Arrived", state: arrivalState() },
    { id: "follow-up", label: "42-day follow-up", state: followUpState() },
  ];
};

/** One line on where a referral stands right now. */
export const getJourneyHeadline = (referral) => {
  const who = referral.referralType === PatientType.CHILD ? "The baby" : "The patient";

  if (referral.status === ReferralStatus.REJECTED) {
    const elsewhere = referral.patientChoice?.elsewhere;
    return elsewhere
      ? `The hospital said no. The patient plans to go to ${elsewhere}.`
      : "The hospital said no. The patient is choosing another.";
  }
  if (referral.status === ReferralStatus.COMPLETED) return "Treated, with follow-up through day 42.";
  if (hasArrivedAtFacility(referral)) return `${who} has arrived.`;
  if (findOpenTransportBarrier(referral) || referral.transit?.status === TransportStatus.FAILED) {
    return referral.status === ReferralStatus.ACKNOWLEDGED
      ? `The hospital said yes. ${who} still isn't there.`
      : `${who} still isn't at the hospital.`;
  }
  if (isRideMoving(referral.transit)) return `${who} is on the way.`;
  return `${who} still isn't at the hospital.`;
};

/** The latest news for the family, in plain language. */
export const getFamilyUpdate = (referral) => {
  if (hasArrivedAtFacility(referral)) return "You've arrived at the hospital";
  if (referral.status === ReferralStatus.REJECTED) return "Please choose a hospital";
  if (referral.transit?.status === TransportStatus.FAILED) return "Another ride is being arranged";
  if (isRideMoving(referral.transit) && referral.transit.eta) return `Your ride arrives in ${referral.transit.eta}`;
  return "Your ride is being arranged";
};
