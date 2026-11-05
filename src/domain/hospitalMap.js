/**
 * NAVEXA HEALTH — MAP TO THE HOSPITAL
 * Builds the map links from the hospital's location only. The patient's address
 * stays out of these URLs, because they go to outside map services.
 */

import { ReferralStatus } from "./enums.js";

// How far the map shows around the hospital, in degrees.
const MAP_SPAN = { lat: 0.015, lng: 0.02 };

export const getDirectionsUrl = ({ coordinates: { lat, lng } }) =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: `${lat},${lng}` })}`;

/** The hospital a referral sends the patient to, with map links, or null if there is none to show. */
export const getHospitalMap = (referral, facilities = []) => {
  if (!referral?.toFacility || referral.status === ReferralStatus.REJECTED) return null;

  const hospital = facilities.find((f) => f.name === referral.toFacility);
  if (!hospital?.coordinates) return null;

  const { lat, lng } = hospital.coordinates;
  const box = [lng - MAP_SPAN.lng, lat - MAP_SPAN.lat, lng + MAP_SPAN.lng, lat + MAP_SPAN.lat];
  const embed = new URLSearchParams({ bbox: box.join(","), layer: "mapnik", marker: `${lat},${lng}` });

  return {
    name: hospital.name,
    embedUrl: `https://www.openstreetmap.org/export/embed.html?${embed}`,
    directionsUrl: getDirectionsUrl(hospital),
  };
};
