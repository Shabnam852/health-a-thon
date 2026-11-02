/**
 * NAVEXA HEALTH — VANS
 * A van is busy while a referral's ride uses it, so its status can't drift from the rides.
 */

import { PatientType } from "./enums.js";
import { isRideMoving } from "./workflow.js";

/** Every van, with the patient it is carrying or null if it is free. */
export const getVanStatuses = (fleet = [], referrals = []) =>
  fleet.map((van) => {
    const trip = referrals.find((r) => isRideMoving(r.transit) && r.transit.vanId === van.id);
    return { ...van, busyWith: trip?.patientName || null };
  });

export const getFreeVans = (fleet, referrals) => getVanStatuses(fleet, referrals).filter((van) => !van.busyWith);

export const buildDispatch = (referral, van, eta) => ({
  vanId: van.id,
  vehicle: `${van.name} (${van.driver})`,
  driver: van.driver,
  driverPhone: van.driverPhone,
  eta,
  requiresNeonatalKit: referral.referralType !== PatientType.MATERNAL, // A dyad's van carries the baby too.
  pickupAddress: referral.patientAddress || "Residence on file",
  destinationFacility: referral.toFacility,
});
