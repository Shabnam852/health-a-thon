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

export const seedShape = () => ({
  referrals: initialSeedReferrals,
  navigators: initialNavigators,
  fleet: initialFleet,
  notifications: initialNotifications,
  accounts: [],
  linkRequests: [],
  // Simulated texts to families (FR-45). Never really sent.
  messages: [],
});

/** A fresh demo with referral times worked out from now. */
export const freshDomainState = () => ({ ...seedShape(), referrals: buildSeedReferrals() });
