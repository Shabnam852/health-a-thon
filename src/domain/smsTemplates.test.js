import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PatientType, ReferralStatus, TransportStatus } from "./enums.js";
import { createReferral } from "./models.js";
import {
  addFamilyTexts,
  DEFAULT_TEMPLATE_ID,
  messagesForChange,
  messagesForReferral,
  renderTemplate,
  SMS_SIMULATED,
  SMS_TEMPLATES,
  SmsEvent,
  smsEventsForChange,
  smsRecipient,
  templateSlots,
} from "./smsTemplates.js";
import * as workflow from "./workflow.js";

const NOW = "2026-11-06T10:00:00.000Z";
const CONDITION = "Severe pre-eclampsia";
const TO = "Sanjeevani Regional Perinatal Centre";
const FROM = "Malleshwaram PHC";

// createReferral keeps only known fields, so the private-phone consent is added after it.
const referral = ({ phoneIsPrivate, ...overrides } = {}) => ({
  ...createReferral({
    id: "REF-2024-0001",
    patientName: "Ananya Reddy",
    condition: CONDITION,
    reason: CONDITION,
    fromFacility: FROM,
    toFacility: TO,
    status: ReferralStatus.SENT,
    caregiverContact: "Karthik Reddy (Spouse) - +91 90000 21049",
    patientPhone: "+91 90000 21048",
    navigator: { name: "Priya Raman, MSW", phone: "+91 90000 11111" },
    ...overrides,
  }),
  ...(phoneIsPrivate ? { phoneIsPrivate } : {}),
});

const ok = (result) => {
  assert.equal(result.success, true, result.reason);
  return result.referral;
};

const DISPATCH = { vehicle: "VAN-01", driver: "Ravi", driverPhone: "+91 90000 33333", eta: "12 mins" };

// Walks one referral through every change the family hears about, collecting the texts.
const fullJourney = (overrides) => {
  const sent = referral(overrides);
  const texts = [...messagesForChange(null, sent, NOW)];
  const step = (before, after) => {
    texts.push(...messagesForChange(before, after, NOW));
    return after;
  };
  let r = step(sent, ok(workflow.acknowledgeReferral(sent)));
  r = step(r, ok(workflow.requestTransport(r, {})));
  r = step(r, ok(workflow.dispatchTransport(r, DISPATCH)));
  r = step(r, ok(workflow.confirmArrival(r, { verifiedBy: "Nurse Lata" })));
  step(r, ok(workflow.recordClinicalOutcome(r, { clinicianName: "Dr Rao", disposition: "Admitted" })));
  return texts;
};

describe("text templates", () => {
  it("ends every registered template with the do-not-reply line", () => {
    for (const [id, template] of Object.entries(SMS_TEMPLATES)) {
      assert.match(id, /^NX-STATUS-\d{2}$/);
      assert.ok(template.body.endsWith("Do not reply. Call {number}."), id);
    }
  });

  it("keeps the default template to the reference, 'status updated' and a number", () => {
    assert.deepEqual(templateSlots(DEFAULT_TEMPLATE_ID), ["ref", "number"]);
    assert.ok(SMS_TEMPLATES[DEFAULT_TEMPLATE_ID].body.includes("status updated"));
  });

  it("refuses an unregistered template or a missing slot", () => {
    assert.throws(() => renderTemplate("NX-FREE-TEXT", {}));
    assert.throws(() => renderTemplate(DEFAULT_TEMPLATE_ID, { ref: "REF-1" }));
    assert.equal(
      renderTemplate(DEFAULT_TEMPLATE_ID, { ref: "REF-1", number: "+91 1" }),
      "Navexa: referral REF-1 status updated. Do not reply. Call +91 1.",
    );
  });
});

describe("texts for status changes", () => {
  it("texts the family at sent, accepted, ride dispatched, arrival and completion", () => {
    const texts = fullJourney();
    assert.deepEqual(
      texts.map((t) => t.event),
      [SmsEvent.SENT, SmsEvent.ACCEPTED, SmsEvent.RIDE_DISPATCHED, SmsEvent.ARRIVED, SmsEvent.COMPLETED],
    );
    assert.equal(new Set(texts.map((t) => t.id)).size, texts.length);
    for (const text of texts) {
      assert.equal(text.status, SMS_SIMULATED);
      assert.equal(text.referralId, "REF-2024-0001");
      assert.equal(text.to, "+91 90000 21048");
      assert.equal(text.createdAt, NOW);
      assert.ok(text.templateId in SMS_TEMPLATES);
    }
  });

  it("by default says nothing about the condition, the hospital or the patient", () => {
    for (const text of fullJourney()) {
      assert.equal(text.templateId, DEFAULT_TEMPLATE_ID);
      assert.equal(text.body, "Navexa: referral REF-2024-0001 status updated. Do not reply. Call +91 90000 11111.");
      for (const secret of [CONDITION, TO, FROM, "Ananya", "pre-eclampsia"]) {
        assert.ok(!text.body.includes(secret), `${text.event} names ${secret}`);
      }
    }
  });

  it("uses status words and the hospital only when the phone is private", () => {
    const texts = fullJourney({ phoneIsPrivate: true });
    assert.deepEqual(
      texts.map((t) => t.templateId),
      ["NX-STATUS-02", "NX-STATUS-03", "NX-STATUS-05", "NX-STATUS-06", "NX-STATUS-07"],
    );
    assert.equal(
      texts[1].body,
      `Navexa REF-2024-0001: ${TO} has agreed to see you. Do not reply. Call +91 90000 11111.`,
    );
    for (const text of texts) {
      assert.ok(text.body.endsWith("Do not reply. Call +91 90000 11111."));
      assert.ok(!text.body.includes(CONDITION));
    }
  });

  it("says 'your baby' for a newborn on a private phone", () => {
    const [text] = messagesForChange(null, referral({ referralType: PatientType.CHILD, phoneIsPrivate: true }), NOW);
    assert.match(text.body, /the referral for your baby has been sent/);
  });

  it("texts on a decline, and again when the patient picks a new hospital", () => {
    const sent = referral();
    const declined = ok(workflow.rejectReferral(sent));
    assert.deepEqual(smsEventsForChange(sent, declined), [SmsEvent.DECLINED]);
    const chosen = ok(workflow.recordPatientChoice(declined, { toFacility: "Victoria Hospital" }));
    assert.deepEqual(smsEventsForChange(declined, chosen), [SmsEvent.SENT]);
  });

  it("texts when the referral is redirected while still sent", () => {
    const sent = referral();
    const redirected = ok(workflow.redirectReferral(sent, { toFacility: "Victoria Hospital" }));
    assert.equal(redirected.status, ReferralStatus.SENT);
    assert.deepEqual(smsEventsForChange(sent, redirected), [SmsEvent.SENT]);
  });

  it("stays quiet for changes the family does not need a text about", () => {
    const sent = referral();
    assert.deepEqual(smsEventsForChange(null, referral({ status: ReferralStatus.CREATED })), []);
    assert.deepEqual(smsEventsForChange(sent, ok(workflow.requestTransport(sent, {}))), []);
    assert.deepEqual(smsEventsForChange(sent, ok(workflow.saveHandoff(sent, { situation: "Summary" }))), []);
    const dispatched = { ...sent, transit: { status: TransportStatus.DISPATCHED } };
    assert.deepEqual(smsEventsForChange(dispatched, { ...dispatched }), []);
  });

  it("falls back to the caregiver's number, and sends nothing with no number", () => {
    assert.equal(smsRecipient(referral({ patientPhone: "" })), "+91 90000 21049");
    assert.deepEqual(messagesForChange(null, referral({ patientPhone: "", caregiverContact: "Neighbour" }), NOW), []);
  });
});

describe("the outbox", () => {
  it("adds texts to the shared data and leaves it alone when there are none", () => {
    const data = { referrals: [], messages: [] };
    const sent = referral();
    const next = addFamilyTexts(data, null, sent, NOW);
    assert.equal(next.messages.length, 1);
    assert.equal(data.messages.length, 0);
    assert.equal(addFamilyTexts(next, sent, { ...sent }, NOW), next);
  });

  it("lists one referral's texts, newest first", () => {
    const messages = [
      { id: "a", referralId: "R1" },
      { id: "b", referralId: "R2" },
      { id: "c", referralId: "R1" },
    ];
    assert.deepEqual(
      messagesForReferral(messages, "R1").map((m) => m.id),
      ["c", "a"],
    );
    assert.deepEqual(messagesForReferral(undefined, "R1"), []);
  });
});
