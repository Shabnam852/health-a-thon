/**
 * What a fresh demo holds, shared by ReferralProvider and the crash screen's "Reset demo".
 * Hospitals never change while the app runs, so they are not saved.
 */

import {
  buildSeedReferrals,
  initialFleet,
  initialNavigators,
  initialNotifications,
  initialSeedReferrals,
} from "./seedData.js";

// The guided demo's relative: she signed up with the case number, but her phone isn't on the
// referral, so she waits for a coordinator (src/domain/selfRegistration.js).
const seedRelative = {
  id: "SELF-SEED-LAKSHMI",
  phone: "9845011225",
  name: "Lakshmi Naidu",
  relation: "Grandmother",
  referralId: null,
  selfRegistered: true,
  createdAt: "2026-10-31T09:20:00.000Z",
};

const seedLinkRequest = {
  id: "LINK-SEED-LAKSHMI",
  accountId: seedRelative.id,
  phone: seedRelative.phone,
  name: seedRelative.name,
  relation: seedRelative.relation,
  referralId: "NX-9042",
  status: "PENDING",
  createdAt: "2026-10-31T09:20:00.000Z",
};

export const seedShape = () => ({
  referrals: initialSeedReferrals,
  navigators: initialNavigators,
  fleet: initialFleet,
  notifications: initialNotifications,
  accounts: [seedRelative],
  linkRequests: [seedLinkRequest],
  // Simulated texts to families (FR-45). Never really sent.
  messages: [],
});

/** A fresh demo with referral times worked out from now. */
export const freshDomainState = () => ({ ...seedShape(), referrals: buildSeedReferrals() });
