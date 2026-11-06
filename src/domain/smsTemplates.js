/**
 * NAVEXA HEALTH — TEXTS TO THE FAMILY (simulated SMS)
 * FR-45, FR-82, EC-62, EC-91. When a referral changes in a way the family should know about, a text
 * is "sent" to the patient's or caregiver's phone. Nothing leaves the app: each text is only stored
 * in the shared outbox with the status SIMULATED.
 *
 * Every text comes from a registered template below (FR-82): only the {slots} change. By default the
 * text holds the reference, "status updated" and a contact number, nothing else, because the phone
 * may be shared (EC-62). Status words and the hospital name are used only when the record says the
 * phone is private (FR-45). Replies are not read, so every text ends "Do not reply. Call {number}."
 * (EC-91).
 */

import { phoneNumberIn } from "./contact.js";
import { PatientType, ReferralStatus, TransportStatus } from "./enums.js";

export const SMS_SIMULATED = "SIMULATED";

/** The line every text ends with. */
export const DO_NOT_REPLY = "Do not reply. Call {number}.";

/** Called when the record has no navigator number: the coordinator desk. */
export const COORDINATOR_DESK_PHONE = "+91 90000 21049";

/** The changes the family is told about. */
export const SmsEvent = {
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  RIDE_DISPATCHED: "RIDE_DISPATCHED",
  ARRIVED: "ARRIVED",
  COMPLETED: "COMPLETED",
};

/** How staff see what each text was about. */
export const SMS_EVENT_LABELS = {
  [SmsEvent.SENT]: "Referral sent",
  [SmsEvent.ACCEPTED]: "Hospital accepted",
  [SmsEvent.DECLINED]: "Hospital declined",
  [SmsEvent.RIDE_DISPATCHED]: "Ride on the way",
  [SmsEvent.ARRIVED]: "Arrival confirmed",
  [SmsEvent.COMPLETED]: "Care done, follow-up due",
};

/** The template every text uses unless the phone is private. Reference, "status updated", a number. */
export const DEFAULT_TEMPLATE_ID = "NX-STATUS-01";

/** The registered templates (FR-82). The wording follows REQUIREMENTS.md §3. */
export const SMS_TEMPLATES = {
  [DEFAULT_TEMPLATE_ID]: { body: `Navexa: referral {ref} status updated. ${DO_NOT_REPLY}` },
  // Private phone only (FR-45).
  "NX-STATUS-02": {
    event: SmsEvent.SENT,
    body: `Navexa {ref}: the referral for {who} has been sent to {facility}. ${DO_NOT_REPLY}`,
  },
  "NX-STATUS-03": {
    event: SmsEvent.ACCEPTED,
    body: `Navexa {ref}: {facility} has agreed to see {who}. ${DO_NOT_REPLY}`,
  },
  "NX-STATUS-04": {
    event: SmsEvent.DECLINED,
    body: `Navexa {ref}: {facility} cannot take this referral. Open Navexa to choose another hospital. ${DO_NOT_REPLY}`,
  },
  "NX-STATUS-05": {
    event: SmsEvent.RIDE_DISPATCHED,
    body: `Navexa {ref}: a ride for {who} is on its way. Be ready at the door. ${DO_NOT_REPLY}`,
  },
  "NX-STATUS-06": {
    event: SmsEvent.ARRIVED,
    body: `Navexa {ref}: {facility} has recorded that {who} arrived. ${DO_NOT_REPLY}`,
  },
  "NX-STATUS-07": {
    event: SmsEvent.COMPLETED,
    body: `Navexa {ref}: {facility} has recorded that the care for {who} is done. A follow-up visit is due soon. ${DO_NOT_REPLY}`,
  },
};

const PRIVATE_TEMPLATE_BY_EVENT = Object.fromEntries(
  Object.entries(SMS_TEMPLATES)
    .filter(([, template]) => template.event)
    .map(([id, template]) => [template.event, id]),
);

/** The {slots} a template needs. */
export const templateSlots = (templateId) =>
  [...(SMS_TEMPLATES[templateId]?.body || "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

/** Fills a registered template. Anything else, or a missing slot, is refused. */
export const renderTemplate = (templateId, vars = {}) => {
  const template = SMS_TEMPLATES[templateId];
  if (!template) throw new Error(`${templateId} is not a registered text template.`);
  return template.body.replace(/\{(\w+)\}/g, (_, slot) => {
    const value = vars[slot];
    if (value == null || value === "") throw new Error(`Text template ${templateId} needs {${slot}}.`);
    return String(value);
  });
};

/** The phone a text goes to: the patient's, or else the caregiver's. Null when neither has a number. */
export const smsRecipient = (referral) =>
  phoneNumberIn(referral?.patientPhone) || phoneNumberIn(referral?.caregiverContact) || null;

// "you" for an adult patient, "your baby" for a newborn (FR-75).
const whoFor = (referral) =>
  referral.referralType === PatientType.CHILD
    ? "your baby"
    : referral.referralType === PatientType.DYAD
      ? "you and your baby"
      : "you";

const STATUS_EVENTS = {
  [ReferralStatus.SENT]: SmsEvent.SENT,
  [ReferralStatus.ACKNOWLEDGED]: SmsEvent.ACCEPTED,
  [ReferralStatus.REJECTED]: SmsEvent.DECLINED,
  [ReferralStatus.ARRIVAL_CONFIRMED]: SmsEvent.ARRIVED,
  [ReferralStatus.COMPLETED]: SmsEvent.COMPLETED,
};

/** What the family should hear about, comparing a referral before and after a change. Before is null for a new one. */
export const smsEventsForChange = (before, after) => {
  if (!after) return [];
  const events = [];
  const statusChanged = before?.status !== after.status;
  // Sent again to a new hospital counts as sent, even if the status was already "sent".
  const resent = after.status === ReferralStatus.SENT && before && before.toFacility !== after.toFacility;
  if ((statusChanged || resent) && STATUS_EVENTS[after.status]) events.push(STATUS_EVENTS[after.status]);
  if (after.transit?.status === TransportStatus.DISPATCHED && before?.transit?.status !== TransportStatus.DISPATCHED) {
    events.push(SmsEvent.RIDE_DISPATCHED);
  }
  return events;
};

/** The simulated texts for a change to one referral. None when there is no phone to send to. */
export const messagesForChange = (before, after, now = new Date().toISOString()) => {
  const to = smsRecipient(after);
  if (!to) return [];
  const vars = {
    ref: after.id,
    number: phoneNumberIn(after.navigator?.phone) || COORDINATOR_DESK_PHONE,
    who: whoFor(after),
    facility: after.toFacility,
  };
  return smsEventsForChange(before, after).map((event) => {
    const templateId = after.phoneIsPrivate === true ? PRIVATE_TEMPLATE_BY_EVENT[event] : DEFAULT_TEMPLATE_ID;
    return {
      id: `SMS-${after.id}-${event}-${Date.parse(now)}`,
      referralId: after.id,
      to,
      event,
      templateId,
      body: renderTemplate(templateId, vars),
      status: SMS_SIMULATED,
      createdAt: now,
    };
  });
};

/** The shared data with this change's texts added to the outbox. Unchanged when there are none. */
export const addFamilyTexts = (data, before, after, now) => {
  const texts = messagesForChange(before, after, now);
  return texts.length > 0 ? { ...data, messages: [...(data.messages || []), ...texts] } : data;
};

/** One referral's texts, newest first. */
export const messagesForReferral = (messages, referralId) =>
  (messages || []).filter((m) => m.referralId === referralId).reverse();
