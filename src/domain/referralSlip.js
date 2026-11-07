/**
 * NAVEXA HEALTH — REFERRAL SLIP (FR-65)
 * The one-page slip the family takes home. It carries only what helps them get there and sign up:
 * no clinical handover text and no priority, because the slip leaves the hospital.
 */

import { qrcode } from "qrcode-generator";
import { ReferralStatus } from "./enums.js";
import { getDestination, isFloating } from "./workflow.js";

export const EMERGENCY_LINE = "108 / 112";

// The coordinator the case page shows when a referral has none recorded.
const DEFAULT_COORDINATOR = { name: "Priya Raman, MSW", phone: "+91 90000 21049" };

/** The sign-in page, opened on sign-up with this referral number filled in. */
export const slipSignUpUrl = (origin, referralId) => {
  const params = new URLSearchParams({ as: "phone", signup: "1", ref: String(referralId ?? "") });
  return `${String(origin ?? "").replace(/\/+$/, "")}/login?${params}`;
};

// "Bengaluru, Karnataka • Central Hub" -> "Bengaluru, Karnataka". The part after the dot is a note
// (a distance or a role), not where the hospital is.
const placeOf = (facility) => facility?.location?.split("•")[0].trim() || "";

const hospital = (name, facilities) => ({
  name,
  address: placeOf(facilities.find((f) => f.name === name)),
});

/** When the referral went out: the "sent" step if there is one, else when it was made. */
const sentAt = (referral) =>
  (referral.timeline || []).find((t) => t.status === ReferralStatus.SENT)?.date || referral.createdAt || null;

/** Everything printed on the slip, worked out from the referral and the hospital list. */
export const buildReferralSlip = (referral, facilities = [], origin = "") => {
  const destination = getDestination(referral);
  // A hospital that declined is not where the family goes, so its department means nothing either.
  const choseNone = isFloating(referral) && !referral.patientChoice?.elsewhere;
  return {
    number: referral.id,
    patientName: referral.patientName,
    from: hospital(referral.fromFacility, facilities),
    to: choseNone ? { name: destination, address: "" } : hospital(destination, facilities),
    department: isFloating(referral) ? "" : referral.department || "",
    sentAt: sentAt(referral),
    coordinator: {
      name: referral.navigator?.name || DEFAULT_COORDINATOR.name,
      phone: referral.navigator?.phone || DEFAULT_COORDINATOR.phone,
    },
    emergency: EMERGENCY_LINE,
    signUpUrl: slipSignUpUrl(origin, referral.id),
  };
};

/**
 * A QR code as one SVG path, `size` modules square: one rectangle per run of dark modules in a row.
 * Drawn by the page itself, so no image is fetched and the colour comes from the theme.
 */
export const qrCodePath = (text) => {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!qr.isDark(row, col)) continue;
      const start = col;
      while (col + 1 < size && qr.isDark(row, col + 1)) col += 1;
      const run = col - start + 1;
      path += `M${start} ${row}h${run}v1h-${run}z`;
    }
  }
  return { size, path };
};
