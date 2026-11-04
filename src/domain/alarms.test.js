import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESPONSE_LIMIT_MINUTES } from "../config/timeLimits.js";
import { AlarmKind, formatMinutes, getAlarms, getFollowUpState, getResponseClock } from "./alarms.js";
import { FollowUpStatus, ReferralStatus, UrgencyLevel } from "./enums.js";

const NOW = new Date("2026-11-02T12:00:00Z").getTime();
const minutesBefore = (minutes) => new Date(NOW - minutes * 60 * 1000).toISOString();

const waiting = (status, priority, minutes) => ({
  id: "R-1",
  status,
  priority,
  toFacility: "Sanjeevani",
  timeline: [{ status, date: minutesBefore(minutes) }],
});

describe("response clock", () => {
  it("runs out at each priority's limit, and not before", () => {
    for (const [priority, limit] of Object.entries(RESPONSE_LIMIT_MINUTES)) {
      assert.equal(getResponseClock(waiting(ReferralStatus.SENT, priority, limit), NOW).isOverdue, false, priority);
      assert.equal(getResponseClock(waiting(ReferralStatus.SENT, priority, limit + 1), NOW).isOverdue, true, priority);
    }
  });

  it("stops saying a patient hasn't chosen once they say where they are going", () => {
    const referral = {
      ...waiting(ReferralStatus.REJECTED, UrgencyLevel.STAT, 16),
      patientChoice: { elsewhere: "Town clinic" },
    };
    assert.equal(getAlarms([referral], NOW)[0].title, "Not confirmed at Town clinic");
  });

  it("restarts when the case changes state", () => {
    const referral = waiting(ReferralStatus.REJECTED, UrgencyLevel.STAT, 5);
    referral.timeline.unshift({ status: ReferralStatus.SENT, date: minutesBefore(500) });
    assert.equal(getResponseClock(referral, NOW).minutesLeft, 10);
  });

  it("does not run once the hospital has accepted", () => {
    assert.equal(getResponseClock(waiting(ReferralStatus.ACKNOWLEDGED, UrgencyLevel.STAT, 999), NOW), null);
  });
});

describe("follow-up state", () => {
  const stateOn = (date, status = FollowUpStatus.PLANNED) =>
    getFollowUpState({ dueDate: "2026-11-02", status }, new Date(`${date}T12:00:00`).getTime());

  it("moves from planned to due, missed and escalated", () => {
    assert.equal(stateOn("2026-11-01"), FollowUpStatus.PLANNED);
    assert.equal(stateOn("2026-11-02"), FollowUpStatus.DUE);
    assert.equal(stateOn("2026-11-04"), FollowUpStatus.DUE);
    assert.equal(stateOn("2026-11-05"), FollowUpStatus.MISSED);
    assert.equal(stateOn("2026-11-09"), FollowUpStatus.ESCALATED);
  });

  it("starts the due day at local midnight", () => {
    const task = { dueDate: "2026-11-02", status: FollowUpStatus.PLANNED };
    assert.equal(getFollowUpState(task, new Date("2026-11-01T23:59:00").getTime()), FollowUpStatus.PLANNED);
    assert.equal(getFollowUpState(task, new Date("2026-11-02T00:01:00").getTime()), FollowUpStatus.DUE);
  });

  it("counts calendar days across a clock change, not 24-hour blocks", () => {
    const zone = process.env.TZ;
    process.env.TZ = "America/New_York"; // Clocks go forward on 2026-03-08.
    try {
      const task = { dueDate: "2026-03-06", status: FollowUpStatus.PLANNED };
      // Three calendar days after the due day, 71.5 hours after its midnight.
      assert.equal(getFollowUpState(task, new Date("2026-03-09T00:30:00").getTime()), FollowUpStatus.MISSED);
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  it("leaves a completed visit completed, however late", () => {
    assert.equal(stateOn("2027-01-01", FollowUpStatus.COMPLETED), FollowUpStatus.COMPLETED);
  });
});

describe("alarms", () => {
  it("raises each kind, and nothing for a case on time", () => {
    const kinds = (referral) => getAlarms([referral], NOW).map((a) => a.kind);

    assert.deepEqual(kinds(waiting(ReferralStatus.SENT, UrgencyLevel.URGENT, 90)), [AlarmKind.NO_HOSPITAL_REPLY]);
    assert.deepEqual(kinds(waiting(ReferralStatus.REJECTED, UrgencyLevel.STAT, 16)), [AlarmKind.NO_PATIENT_CHOICE]);
    assert.deepEqual(kinds(waiting(ReferralStatus.SENT, UrgencyLevel.URGENT, 10)), []);
    assert.deepEqual(
      kinds({
        id: "R-2",
        status: ReferralStatus.COMPLETED,
        followUpPlan: {
          tasks: [
            { id: "T1", title: "Day 3", dueDate: "2026-10-20", status: FollowUpStatus.PLANNED },
            { id: "T2", title: "Day 7", dueDate: "2026-10-20", status: FollowUpStatus.COMPLETED },
            { id: "T3", title: "Day 14", dueDate: "2026-12-01", status: FollowUpStatus.PLANNED },
          ],
        },
      }),
      [AlarmKind.FOLLOW_UP_MISSED],
    );
  });

  it("formats waits in plain units", () => {
    assert.equal(formatMinutes(30), "30 min");
    assert.equal(formatMinutes(120), "2 hr");
    assert.equal(formatMinutes(1440), "1 day");
    assert.equal(formatMinutes(2880), "2 days");
  });
});
