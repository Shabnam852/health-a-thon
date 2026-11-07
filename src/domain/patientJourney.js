/**
 * What the patient and family see about their own case: the five journey steps, the
 * next thing to do, and the ride. Shared by the patient screens and the assistant,
 * so both always tell the family the same thing.
 */

import { PatientType, ReferralStatus, TransportStatus } from "./enums.js";
import { hasArrivedAtFacility, isFloating, isRideMoving } from "./workflow.js";

export const RIDE_STAGES = ["Ride requested", "Ride on the way", "Picked up", "Arrived at hospital"];

const RIDE_STAGE_BY_STATUS = {
  [TransportStatus.REQUESTED]: 1,
  [TransportStatus.ASSIGNED]: 1,
  [TransportStatus.DISPATCHED]: 2,
  [TransportStatus.PICKED_UP]: 3,
  [TransportStatus.ARRIVED]: 4,
};

export const getPatientJourney = (referral, facilities = []) => {
  const isChild = referral.referralType === PatientType.CHILD;
  const who = isChild ? "your baby" : "you";
  const tr = referral.transit;
  const nav = referral.navigator;
  const floating = isFloating(referral);
  // A hospital that declined is not where the patient is going.
  const hospital = floating ? null : referral.toFacility;
  const hospitalPhone = facilities.find((f) => f.name === hospital)?.phone;

  const status = referral.status;
  const isArrivalConfirmed = hasArrivedAtFacility(referral);
  const isTransitActive = isRideMoving(tr);
  const hasOwnTransport = !tr && !referral.transitBarrier;
  const isRideFailed = tr?.status === TransportStatus.FAILED && !isArrivalConfirmed;

  const steps = [
    {
      label: "Doctor sent the referral",
      done: status !== ReferralStatus.CREATED,
      next: "The doctor is sending your referral.",
      nextKey: "nextSending",
    },
    {
      label: "Hospital is ready for you",
      done: status === ReferralStatus.ACKNOWLEDGED || isArrivalConfirmed,
      next: floating ? "Choose a hospital to go to." : "The hospital is checking your referral.",
      nextKey: floating ? "nextChoose" : "nextChecking",
    },
    {
      label: "Ride to the hospital",
      done: tr?.status === TransportStatus.ARRIVED || isArrivalConfirmed,
      next: isTransitActive
        ? "Be ready at the door and keep your phone with you."
        : isRideFailed
          ? `${nav?.name?.split(",")[0] || "Your care navigator"} is arranging another ride.`
          : hasOwnTransport
            ? "Travel with your own transport. Tell your care navigator if that changes."
            : "Your ride is being arranged.",
      nextKey: isTransitActive
        ? "nextBeReady"
        : isRideFailed
          ? "nextRideRetry"
          : hasOwnTransport
            ? "nextOwnTransport"
            : "nextArranging",
      nextVars: { name: nav?.name?.split(",")[0] || "" },
    },
    {
      label: "Check in at the hospital",
      done: isArrivalConfirmed,
      next: `At the hospital, give case ID ${referral.id} at the reception desk.`,
      nextKey: "nextCheckIn",
      nextVars: { id: referral.id },
    },
    {
      label: "Care and follow-up",
      done: status === ReferralStatus.COMPLETED,
      next: `The care team will look after ${who}. Follow-up visits are planned before you go home.`,
      nextKey: isChild ? "nextCareBaby" : "nextCareYou",
    },
  ];
  const nextStep = steps.find((s) => !s.done) || steps[steps.length - 1];

  const rideStage = isArrivalConfirmed ? RIDE_STAGES.length : RIDE_STAGE_BY_STATUS[tr?.status] || 0;
  const rideSummary =
    !tr && !isArrivalConfirmed
      ? "No ride booked yet"
      : isRideFailed
        ? "Your ride had a problem"
        : RIDE_STAGES[rideStage - 1] || "Your ride is being arranged";
  // The same summary as a key into the family strings, so the screen can show it in the family's language.
  const rideSummaryKey =
    !tr && !isArrivalConfirmed ? "noRideYet" : isRideFailed ? "rideProblem" : rideStage > 0 ? null : "rideArranging";
  const showEta = Boolean(tr?.eta) && !isArrivalConfirmed && !isRideFailed;

  return {
    isChild,
    who,
    tr,
    nav,
    floating,
    hospital,
    hospitalPhone,
    isArrivalConfirmed,
    isTransitActive,
    isRideFailed,
    steps,
    nextStep,
    rideStage,
    rideSummary,
    rideSummaryKey,
    showEta,
  };
};
