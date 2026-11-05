/**
 * How long a case may wait before the Coordinator is alarmed.
 * DEMO VALUES ONLY: these need sign-off from a clinician before real use.
 */

import { UrgencyLevel } from "../domain/enums.js";

// How long a hospital may take to reply, and a floating patient to choose a hospital.
export const RESPONSE_LIMIT_MINUTES = {
  [UrgencyLevel.STAT]: 15,
  [UrgencyLevel.URGENT]: 60,
  [UrgencyLevel.PRIORITY]: 240,
  [UrgencyLevel.ROUTINE]: 1440,
};

// Days after a follow-up's due date.
export const FOLLOW_UP_MISSED_AFTER_DAYS = 3;
export const FOLLOW_UP_ESCALATED_AFTER_DAYS = 7;

export const TIME_LIMITS_NOTE = "Demo time limits. They need clinical sign-off.";
