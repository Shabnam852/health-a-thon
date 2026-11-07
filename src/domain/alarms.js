/**
 * NAVEXA HEALTH — TIME-BASED ALARMS
 * Worked out from the clock each time they are read, so nothing has to run in the
 * background and a reloaded page shows the same alarms.
 */

import {
  FOLLOW_UP_ESCALATED_AFTER_DAYS,
  FOLLOW_UP_MISSED_AFTER_DAYS,
  RESPONSE_LIMIT_MINUTES,
} from "../config/timeLimits.js";
import { FollowUpStatus, ReferralStatus } from "./enums.js";

export const AlarmKind = Object.freeze({
  NO_HOSPITAL_REPLY: "NO_HOSPITAL_REPLY",
  NO_PATIENT_CHOICE: "NO_PATIENT_CHOICE",
  FOLLOW_UP_MISSED: "FOLLOW_UP_MISSED",
});

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

const CLOCK_STATUS_TO_ALARM = {
  [ReferralStatus.SENT]: AlarmKind.NO_HOSPITAL_REPLY,
  [ReferralStatus.REJECTED]: AlarmKind.NO_PATIENT_CHOICE,
};

const toTime = (value) => new Date(value).getTime();

export const formatMinutes = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr`;
  const days = Math.floor(minutes / 1440);
  return `${days} ${days === 1 ? "day" : "days"}`;
};

// The clock restarts when the case enters its current state.
const getWaitingSince = (referral) => {
  const entry = (referral.timeline || []).findLast((t) => t.status === referral.status);
  return toTime(entry?.date || referral.createdAt);
};

/** How long is left for the hospital or patient to act, or null if nobody is on the clock. */
export const getResponseClock = (referral, now = Date.now()) => {
  const kind = CLOCK_STATUS_TO_ALARM[referral.status];
  const limit = RESPONSE_LIMIT_MINUTES[referral.priority];
  if (!kind || !limit) return null;

  const minutesLeft = limit - Math.floor((toTime(now) - getWaitingSince(referral)) / MS_PER_MINUTE);
  return { kind, minutesLeft, isOverdue: minutesLeft < 0 };
};

/** Where a follow-up visit stands today. A completed visit stays completed. */
export const getFollowUpState = (task, now = Date.now()) => {
  if (task.status === FollowUpStatus.COMPLETED) return FollowUpStatus.COMPLETED;

  // A due date is a local calendar day. Count calendar days, not 24-hour blocks,
  // so a clock change cannot move the day boundary by an hour.
  const dueDay = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`);
  const today = new Date(now);
  const daysLate = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate())) /
      MS_PER_DAY,
  );
  if (daysLate < 0) return FollowUpStatus.PLANNED;
  if (daysLate >= FOLLOW_UP_ESCALATED_AFTER_DAYS) return FollowUpStatus.ESCALATED;
  if (daysLate >= FOLLOW_UP_MISSED_AFTER_DAYS) return FollowUpStatus.MISSED;
  return FollowUpStatus.DUE;
};

const referralAlarm = (referral, now) => {
  const clock = getResponseClock(referral, now);
  if (!clock?.isOverdue) return null;

  const over = formatMinutes(-clock.minutesLeft);
  const elsewhere = referral.patientChoice?.elsewhere;
  const noChoiceTitle = elsewhere ? `Not confirmed at ${elsewhere}` : "Hasn't chosen a hospital";
  return {
    id: `${referral.id}-${clock.kind}`,
    kind: clock.kind,
    referral,
    title: clock.kind === AlarmKind.NO_PATIENT_CHOICE ? noChoiceTitle : `${referral.toFacility} hasn't replied`,
    detail: `${over} past the limit`,
  };
};

const followUpAlarms = (referral, now) =>
  (referral.followUpPlan?.tasks || [])
    .map((task) => ({ task, state: getFollowUpState(task, now) }))
    .filter(({ state }) => state === FollowUpStatus.MISSED || state === FollowUpStatus.ESCALATED)
    .map(({ task, state }) => ({
      id: `${referral.id}-${task.id}`,
      kind: AlarmKind.FOLLOW_UP_MISSED,
      referral,
      title: task.title,
      detail: state === FollowUpStatus.ESCALATED ? "Escalated: still not done" : "Missed visit",
    }));

/** Everything the Coordinator must act on now. */
export const getAlarms = (referrals, now = Date.now()) =>
  referrals.flatMap((referral) => {
    const alarm = referralAlarm(referral, now);
    return [...(alarm ? [alarm] : []), ...followUpAlarms(referral, now)];
  });
