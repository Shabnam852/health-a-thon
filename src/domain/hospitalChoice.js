/**
 * NAVEXA HEALTH — THE PATIENT'S CHOICE OF HOSPITAL
 * When a hospital declines, the referral floats and the patient chooses where to go.
 * The suitability rule is a demo rule. It needs clinical review before real use.
 */

import { isHighAcuity, PatientType } from "./enums.js";
import { getDirectionsUrl } from "./hospitalMap.js";

// A mother and baby referred together need a hospital that treats them both.
const treatsCase = (hospital, referralType) =>
  (referralType === PatientType.DYAD ? [PatientType.MATERNAL, PatientType.CHILD] : [referralType]).every((type) =>
    hospital.treats.includes(type),
  );

/** Whether a hospital can treat this kind of case at this urgency. Beds are checked separately. */
export const canTakeCase = (hospital, referral) =>
  treatsCase(hospital, referral.referralType) && (!isHighAcuity(referral.priority) || hospital.takesUrgent);

/** Hospitals a new referral can be sent to: they take urgent cases, and aren't the hospital sending it. */
export const getReferralDestinations = (facilities = [], fromFacility = "") =>
  facilities
    .filter((hospital) => hospital.takesUrgent && hospital.name !== fromFacility)
    .map((hospital) => hospital.name);

/** Hospitals to offer a floating patient: not one that declined, with a free bed, most beds first. */
export const getHospitalOptions = (referral, facilities = []) =>
  facilities
    .filter(
      (hospital) =>
        !(referral.declinedBy || []).includes(hospital.name) &&
        hospital.name !== referral.fromFacility &&
        hospital.bedsAvailable > 0 &&
        canTakeCase(hospital, referral),
    )
    .sort((a, b) => b.bedsAvailable - a.bedsAvailable)
    .map((hospital) => ({ ...hospital, directionsUrl: getDirectionsUrl(hospital) }));
