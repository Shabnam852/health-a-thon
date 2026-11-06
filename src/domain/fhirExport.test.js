import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSeedReferrals, initialFacilities } from "../data/seedData.js";
import { PatientType, ReferralStatus, UrgencyLevel } from "./enums.js";
import {
  ABHA_ADDRESS_SYSTEM,
  ABHA_NUMBER_SYSTEM,
  abhaIdentifier,
  buildReferralBundle,
  codeSystem,
  DEMO_TAG,
  fhirExportFileName,
  identifierSystem,
  PRIORITY_MAP,
  prune,
  STATUS_MAP,
  stableUuid,
} from "./fhirExport.js";
import { createArrivalRecord, createAuditEvent, createReferral } from "./models.js";
import { recordPatientChoice, redirectReferral, rejectReferral } from "./workflow.js";

const NOW = "2026-11-06T10:00:00.000Z";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const resources = (bundle) => bundle.entry.map((e) => e.resource);
const ofType = (bundle, type) => resources(bundle).filter((r) => r.resourceType === type);
const one = (bundle, type) => {
  const found = ofType(bundle, type);
  assert.equal(found.length, 1, `expected one ${type}, found ${found.length}`);
  return found[0];
};
const resolve = (bundle, reference) => bundle.entry.find((e) => e.fullUrl === reference?.reference)?.resource;
const lastTask = (bundle) => ofType(bundle, "Task").at(-1);

/** Every `reference` anywhere in a value. */
const collectReferences = (value, found = []) => {
  if (Array.isArray(value)) for (const v of value) collectReferences(v, found);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "reference") found.push(v);
      else collectReferences(v, found);
    }
  }
  return found;
};

/** Paths to every undefined, null, NaN, blank string, empty array or empty object. */
const findEmpty = (value, path = "$", found = []) => {
  if (value === undefined || value === null || Number.isNaN(value)) found.push(path);
  else if (typeof value === "string") {
    if (value.trim() === "") found.push(path);
  } else if (Array.isArray(value)) {
    if (value.length === 0) found.push(path);
    for (const [i, v] of value.entries()) findEmpty(v, `${path}[${i}]`, found);
  } else if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) found.push(path);
    for (const k of keys) findEmpty(value[k], `${path}.${k}`, found);
  }
  return found;
};

/** The structural rules every export must meet. */
const assertWellFormed = (bundle) => {
  assert.equal(bundle.resourceType, "Bundle");
  assert.equal(bundle.type, "collection");
  assert.match(bundle.id, UUID);
  assert.ok(bundle.entry.length > 0);

  const fullUrls = bundle.entry.map((e) => e.fullUrl);
  assert.equal(new Set(fullUrls).size, fullUrls.length, "fullUrls are unique");

  for (const entry of bundle.entry) {
    const r = entry.resource;
    assert.equal(typeof r.resourceType, "string", "every resource has a resourceType");
    assert.match(r.id, UUID, `${r.resourceType} has a UUID id`);
    assert.equal(entry.fullUrl, `urn:uuid:${r.id}`, "fullUrl is urn:uuid of the id");
    assert.deepEqual(r.meta.tag, [DEMO_TAG], `${r.resourceType} carries the HTEST tag (FH-5)`);
  }

  for (const reference of collectReferences(bundle)) {
    assert.match(reference, /^urn:uuid:/, "internal references use urn:uuid");
    assert.ok(fullUrls.includes(reference), `reference ${reference} resolves inside the bundle`);
  }

  assert.deepEqual(findEmpty(bundle), [], "no empty or undefined values");
  assert.deepEqual(JSON.parse(JSON.stringify(bundle)), bundle, "survives a JSON round trip unchanged");
};

const baseReferral = (overrides = {}) =>
  createReferral({
    id: "NX-TEST-1",
    patientName: "Lakshmi Rao",
    patientId: "MRN-1001",
    fromFacility: "Asha Kiran Community Health Centre",
    fromClinician: "Dr. Ravi Venkatesh, MD",
    toFacility: "Sanjeevani Regional Perinatal Centre",
    reason: "Raised blood pressure at 34 weeks.",
    condition: "Pre-eclampsia",
    priority: UrgencyLevel.URGENT,
    createdAt: "2026-11-01T08:00:00Z",
    caregiverName: "Mahesh Rao (Husband)",
    caregiverContact: "+91 90000 11111",
    patientPhone: "+91 90000 22222",
    patientAddress: "12, 1st Main, Malleshwaram",
    language: "Kannada / English",
    vitals: { bp: "150/96", bpStatus: "warning", fhr: "142" },
    ...overrides,
  });

const ARRIVED_STATUSES = new Set([
  ReferralStatus.ARRIVAL_CONFIRMED,
  ReferralStatus.CLINICAL_ASSESSMENT_RECORDED,
  ReferralStatus.COMPLETED,
]);

const referralIn = (status) =>
  baseReferral({
    status,
    arrival: ARRIVED_STATUSES.has(status) ? createArrivalRecord({ arrivedAt: "2026-11-01T10:00:00Z" }) : null,
    clinicalOutcome:
      status === ReferralStatus.CLINICAL_ASSESSMENT_RECORDED || status === ReferralStatus.COMPLETED
        ? { disposition: "ADMITTED", assessedAt: "2026-11-01T12:00:00Z" }
        : null,
    declinedBy: status === ReferralStatus.REJECTED ? ["Sanjeevani Regional Perinatal Centre"] : [],
    rejectionReason: status === ReferralStatus.REJECTED ? "No beds" : null,
  });

// The expected FHIR codes per stored status, written out by hand from REQUIREMENTS §3.
const EXPECTED = {
  CREATED: { sr: "draft", task: null, business: null, encounter: null },
  SENT: { sr: "active", task: "requested", business: "SENT", encounter: null },
  ACKNOWLEDGED: { sr: "active", task: "accepted", business: "ACCEPTED", encounter: null },
  REJECTED: { sr: "active", task: "rejected", business: "DECLINED", encounter: null },
  REDIRECTED: { sr: "active", task: "rejected", business: "REDIRECT_REQUESTED", encounter: null },
  ARRIVAL_CONFIRMED: { sr: "active", task: "in-progress", business: "ARRIVED", encounter: "arrived" },
  CLINICAL_ASSESSMENT_RECORDED: {
    sr: "active",
    task: "in-progress",
    business: "SERVICE_COMPLETED",
    encounter: "in-progress",
  },
  COMPLETED: { sr: "completed", task: "completed", business: "CLOSED", encounter: "finished" },
};

describe("FHIR export: status mapping", () => {
  it("covers every referral status in enums.js and nothing else", () => {
    assert.deepEqual(Object.keys(STATUS_MAP).sort(), Object.values(ReferralStatus).sort());
    assert.deepEqual(Object.keys(EXPECTED).sort(), Object.values(ReferralStatus).sort());
  });

  for (const status of Object.values(ReferralStatus)) {
    it(`maps ${status} to the §3 FHIR codes`, () => {
      const expected = EXPECTED[status];
      const bundle = buildReferralBundle(referralIn(status), { now: NOW, facilities: initialFacilities });
      assertWellFormed(bundle);

      assert.equal(one(bundle, "ServiceRequest").status, expected.sr);

      const tasks = ofType(bundle, "Task");
      if (expected.task === null) {
        assert.equal(tasks.length, 0, "a draft has no Task yet");
      } else {
        assert.equal(tasks.length, 1);
        const [task] = tasks;
        assert.equal(task.status, expected.task);
        assert.deepEqual(task.businessStatus.coding[0].system, codeSystem("navexa-referral-status"));
        assert.equal(task.businessStatus.coding[0].code, expected.business);
        assert.equal(task.intent, "order");
      }

      const encounters = ofType(bundle, "Encounter");
      if (expected.encounter === null) assert.equal(encounters.length, 0);
      else {
        assert.equal(encounters.length, 1);
        assert.equal(encounters[0].status, expected.encounter);
        assert.equal(encounters[0].period.start, "2026-11-01T10:00:00.000Z");
        assert.equal(resolve(bundle, encounters[0].basedOn[0]).resourceType, "ServiceRequest");
      }
    });
  }

  it("refuses a status it does not know, rather than guessing", () => {
    assert.throws(() => buildReferralBundle({ ...baseReferral(), status: "IN_LIMBO" }, { now: NOW }), /Unknown/);
    assert.throws(() => buildReferralBundle({ status: ReferralStatus.SENT }, { now: NOW }), /ID/);
  });

  it("maps every priority onto request-priority", () => {
    assert.deepEqual(Object.keys(PRIORITY_MAP).sort(), Object.values(UrgencyLevel).sort());
    for (const priority of Object.values(UrgencyLevel)) {
      const sr = one(buildReferralBundle(baseReferral({ priority }), { now: NOW }), "ServiceRequest");
      assert.ok(["routine", "urgent", "asap", "stat"].includes(sr.priority));
    }
    const sr = (priority) => one(buildReferralBundle(baseReferral({ priority }), { now: NOW }), "ServiceRequest");
    assert.equal(sr(UrgencyLevel.STAT).priority, "stat");
    assert.equal(sr(UrgencyLevel.URGENT).priority, "urgent");
    assert.equal(sr(UrgencyLevel.ROUTINE).priority, "routine");
  });
});

describe("FHIR export: the referral", () => {
  const bundle = buildReferralBundle(referralIn(ReferralStatus.ACKNOWLEDGED), {
    now: NOW,
    facilities: initialFacilities,
  });
  const sr = one(bundle, "ServiceRequest");

  it("puts the ServiceRequest first, with Navexa identifier, intent order and pathway", () => {
    assert.equal(bundle.entry[0].resource.resourceType, "ServiceRequest");
    assert.deepEqual(sr.identifier, [{ system: identifierSystem("referral"), value: "NX-TEST-1" }]);
    assert.equal(sr.intent, "order");
    assert.equal(sr.category[0].coding[0].system, codeSystem("pathway"));
    assert.equal(sr.category[0].coding[0].code, "maternal");
    assert.equal(sr.authoredOn, "2026-11-01T08:00:00.000Z");
    assert.equal(sr.reasonCode[0].text, "Pre-eclampsia");
    assert.equal(sr.reasonCode[0].coding, undefined, "the reason is never coded by guesswork");
    assert.equal(sr.note[0].text, "Raised blood pressure at 34 weeks.");
  });

  it("points requester at the referring clinician's role at the sending hospital, performer at the receiver", () => {
    const role = resolve(bundle, sr.requester);
    assert.equal(role.resourceType, "PractitionerRole");
    assert.equal(resolve(bundle, role.practitioner).name[0].text, "Dr. Ravi Venkatesh, MD");
    assert.equal(resolve(bundle, role.organization).name, "Asha Kiran Community Health Centre");
    const performer = resolve(bundle, sr.performer[0]);
    assert.equal(performer.resourceType, "Organization");
    assert.equal(performer.name, "Sanjeevani Regional Perinatal Centre");
    assert.deepEqual(performer.identifier, [{ system: identifierSystem("facility"), value: "FAC-SANJEEVANI" }]);
    assert.equal(performer.telecom[0].value, "+91 90000 03321");
  });

  it("ties the Task to the ServiceRequest, the patient and the receiving hospital", () => {
    const task = one(bundle, "Task");
    assert.equal(resolve(bundle, task.focus), sr);
    assert.equal(resolve(bundle, task.for).resourceType, "Patient");
    assert.equal(resolve(bundle, task.owner).name, "Sanjeevani Regional Perinatal Centre");
  });

  it("exports the patient and caregiver with codes only where they are certain", () => {
    const patient = one(bundle, "Patient");
    assert.deepEqual(patient.identifier, [{ system: identifierSystem("patient-local"), value: "MRN-1001" }]);
    assert.equal(patient.name[0].text, "Lakshmi Rao");
    assert.equal(patient.gender, "female");
    assert.equal(patient.birthDate, undefined, "an age in years is not a birth date");
    assert.deepEqual(
      patient.communication.map((c) => c.language.coding[0].code),
      ["kn", "en"],
    );
    const caregiver = one(bundle, "RelatedPerson");
    assert.equal(caregiver.name[0].text, "Mahesh Rao");
    assert.equal(caregiver.relationship[0].coding[0].code, "HUSB");
    assert.equal(caregiver.telecom[0].value, "+91 90000 11111");
    assert.equal(resolve(bundle, caregiver.patient), patient);
  });

  it("does not give a newborn a sex, and links the newborn to the mother's RelatedPerson (FH-6)", () => {
    const b = buildReferralBundle(
      baseReferral({ referralType: PatientType.CHILD, caregiverName: "Shalini Naidu (Mother)", vitals: {} }),
      { now: NOW },
    );
    const patient = one(b, "Patient");
    assert.equal(patient.gender, undefined);
    assert.equal(patient.link[0].type, "seealso");
    const mother = resolve(b, patient.link[0].other);
    assert.equal(mother.resourceType, "RelatedPerson");
    assert.equal(mother.relationship[0].coding[0].code, "MTH");
  });

  it("keeps a caregiver label it cannot read as the name, with no relationship code", () => {
    const b = buildReferralBundle(baseReferral({ caregiverName: "Neighbor / Emergency Contact" }), { now: NOW });
    const person = one(b, "RelatedPerson");
    assert.equal(person.name[0].text, "Neighbor / Emergency Contact");
    assert.equal(person.relationship, undefined);
  });
});

describe("FHIR export: vitals", () => {
  const observation = (bundle, text) => ofType(bundle, "Observation").find((o) => o.code.text === text);

  it("maps blood pressure as the LOINC 85354-9 panel with systolic and diastolic components", () => {
    const b = buildReferralBundle(baseReferral(), { now: NOW });
    const bp = observation(b, "Blood pressure");
    assert.equal(bp.code.coding[0].system, "http://loinc.org");
    assert.equal(bp.code.coding[0].code, "85354-9");
    assert.equal(bp.status, "final");
    assert.equal(bp.category[0].coding[0].code, "vital-signs");
    const [sys, dia] = bp.component;
    assert.equal(sys.code.coding[0].code, "8480-6");
    assert.deepEqual(sys.valueQuantity, {
      value: 150,
      unit: "mmHg",
      system: "http://unitsofmeasure.org",
      code: "mm[Hg]",
    });
    assert.equal(dia.code.coding[0].code, "8462-4");
    assert.equal(dia.valueQuantity.value, 96);
    assert.equal(bp.valueQuantity, undefined, "a panel carries its values in components");
  });

  it("lists every Observation in ServiceRequest.supportingInfo, and skips status flags", () => {
    const b = buildReferralBundle(baseReferral(), { now: NOW });
    const sr = one(b, "ServiceRequest");
    const observations = ofType(b, "Observation");
    assert.equal(observations.length, 2, "bp and fhr; bpStatus is a flag, not a vital");
    assert.deepEqual(
      sr.supportingInfo.map((r) => resolve(b, r)),
      observations,
    );
    for (const o of observations) assert.equal(resolve(b, o.subject).resourceType, "Patient");
  });

  it("maps newborn vitals with UCUM units and keeps any trailing words as a note", () => {
    const b = buildReferralBundle(
      baseReferral({
        referralType: PatientType.CHILD,
        vitals: { tsb: "21.4 mg/dL", weight: "2,700g (-12.8%)", temp: "36.8 °C", hr: "138 bpm" },
      }),
      { now: NOW },
    );
    const byCode = Object.fromEntries(ofType(b, "Observation").map((o) => [o.code.coding[0].code, o]));
    assert.deepEqual(byCode["1975-2"].valueQuantity, {
      value: 21.4,
      unit: "mg/dL",
      system: "http://unitsofmeasure.org",
      code: "mg/dL",
    });
    assert.equal(byCode["1975-2"].category[0].coding[0].code, "laboratory");
    assert.equal(byCode["29463-7"].valueQuantity.value, 2700);
    assert.equal(byCode["29463-7"].valueQuantity.code, "g");
    assert.equal(byCode["29463-7"].note[0].text, 'Recorded as "2,700g (-12.8%)"');
    assert.equal(byCode["8310-5"].valueQuantity.code, "Cel");
    assert.equal(byCode["8867-4"].valueQuantity.value, 138);
    assert.equal(byCode["8867-4"].valueQuantity.code, "/min");
  });

  it("exports values it cannot read as text, and leaves out readings that were not taken", () => {
    const b = buildReferralBundle(
      baseReferral({
        vitals: {
          bp: "high",
          fhr: "N/A (Postpartum)",
          urine: "+2 Protein",
          bpp: "8/8",
          membranes: "Ruptured (Clear)",
          weight: "60",
          infantWeight: "3,350g",
        },
      }),
      { now: NOW },
    );
    assert.equal(observation(b, "Fetal heart rate"), undefined);
    assert.equal(observation(b, "Blood pressure").valueString, "high");
    assert.equal(observation(b, "Blood pressure").code.coding, undefined);
    assert.equal(observation(b, "Urine protein").valueString, "+2 Protein");
    assert.equal(observation(b, "Urine protein").code.coding, undefined, "no LOINC where it is not certain");
    assert.equal(observation(b, "Biophysical profile").valueString, "8/8");
    assert.equal(observation(b, "Membranes").valueString, "Ruptured (Clear)");
    // A weight with no unit could be grams or kilograms, so it stays text.
    assert.equal(observation(b, "Body weight").valueString, "60");
    // The baby's weight on a mother's referral gets no body-weight LOINC: the subject is the mother.
    const baby = observation(b, "Baby's weight");
    assert.equal(baby.code.coding, undefined);
    assert.equal(baby.valueQuantity.value, 3350);
  });

  it("reads a bare fetal heart rate as beats per minute, as the case page does", () => {
    const b = buildReferralBundle(baseReferral({ vitals: { fhr: "132 (Baseline)" } }), { now: NOW });
    const fhr = observation(b, "Fetal heart rate");
    assert.equal(fhr.code.coding[0].code, "55283-6");
    assert.equal(fhr.valueQuantity.value, 132);
    assert.equal(fhr.valueQuantity.code, "/min");
    assert.equal(fhr.note[0].text, 'Recorded as "132 (Baseline)"');
  });
});

describe("FHIR export: redirects, declines and floating", () => {
  it("a declined referral floats: no performer, the Task is rejected with the reason", () => {
    const sent = baseReferral({ status: ReferralStatus.SENT });
    const { referral } = rejectReferral(sent, { reason: "No rehydration chairs free" }, "2026-11-01T09:00:00Z");
    const b = buildReferralBundle(referral, { now: NOW });
    assertWellFormed(b);
    const sr = one(b, "ServiceRequest");
    assert.equal(sr.status, "active");
    assert.equal(sr.performer, undefined);
    const task = one(b, "Task");
    assert.equal(task.status, "rejected");
    assert.equal(task.statusReason.text, "No rehydration chairs free");
    assert.equal(resolve(b, task.owner).name, "Sanjeevani Regional Perinatal Centre");
  });

  it("notes where a floating patient said they will go", () => {
    const declined = rejectReferral(baseReferral({ status: ReferralStatus.SENT }), {}, "2026-11-01T09:00:00Z").referral;
    const b = buildReferralBundle(
      { ...declined, patientChoice: { elsewhere: "District Hospital Tumakuru" } },
      { now: NOW },
    );
    assert.ok(one(b, "ServiceRequest").note.some((n) => n.text.includes("District Hospital Tumakuru")));
  });

  it("gives each earlier destination its own Task under the same ServiceRequest", () => {
    const sent = baseReferral({ status: ReferralStatus.SENT });
    const declined = rejectReferral(sent, { reason: "No beds" }, "2026-11-01T09:00:00Z").referral;
    const chosen = recordPatientChoice(
      declined,
      { toFacility: "Karuna Women & Children's Hospital" },
      "2026-11-01T09:30:00Z",
    ).referral;
    const moved = redirectReferral(
      chosen,
      { toFacility: "Vidyaranya Institute of Medical Sciences", reason: "Open Level IV bed" },
      "2026-11-01T09:45:00Z",
    ).referral;

    const b = buildReferralBundle(moved, { now: NOW, facilities: initialFacilities });
    assertWellFormed(b);
    const sr = one(b, "ServiceRequest");
    const tasks = ofType(b, "Task");
    assert.equal(tasks.length, 3);
    for (const t of tasks) assert.equal(resolve(b, t.focus), sr);

    const owners = tasks.map((t) => resolve(b, t.owner).name);
    assert.deepEqual(owners, [
      "Sanjeevani Regional Perinatal Centre",
      "Karuna Women & Children's Hospital",
      "Vidyaranya Institute of Medical Sciences",
    ]);
    assert.deepEqual(
      tasks.map((t) => t.status),
      ["rejected", "cancelled", "requested"],
    );
    assert.equal(tasks[0].businessStatus.coding[0].code, "DECLINED");
    assert.equal(tasks[1].statusReason.text, "Open Level IV bed");
    assert.equal(tasks[1].authoredOn, "2026-11-01T09:30:00.000Z");
    assert.equal(tasks[1].lastModified, "2026-11-01T09:45:00.000Z");
    assert.equal(resolve(b, sr.performer[0]).name, "Vidyaranya Institute of Medical Sciences");
    assert.equal(lastTask(b).businessStatus.coding[0].code, "SENT");
  });
});

describe("FHIR export: audit trail as Provenance", () => {
  it("writes one Provenance per audit event, naming the human who acted", () => {
    const referral = baseReferral({
      status: ReferralStatus.SENT,
      auditTrail: [
        createAuditEvent({
          actor: "Dr. Ravi Venkatesh, MD",
          role: "referring_clinician",
          action: "REFERRAL_CREATED",
          details: "Referral initiated.",
          timestamp: "2026-11-01T08:00:00Z",
        }),
        createAuditEvent({
          actor: "Care Coordinator",
          role: "coordinator",
          action: "TRANSPORT_REQUESTED",
          details: "Transit requested.",
          timestamp: "2026-11-01T08:10:00Z",
        }),
        createAuditEvent({ actor: "System", role: "system", action: "AUTO", timestamp: "2026-11-01T08:11:00Z" }),
        createAuditEvent({
          actor: "Patient or family",
          role: "patient",
          action: "CHOICE",
          timestamp: "2026-11-01T08:12:00Z",
        }),
        { id: "AUD-BROKEN", actor: "Someone", role: "coordinator", action: "X", timestamp: "not a time" },
      ],
    });
    const b = buildReferralBundle(referral, { now: NOW });
    assertWellFormed(b);
    const provenance = ofType(b, "Provenance");
    assert.equal(provenance.length, 4, "an event with no real time is left out");

    const [created, transport, system, patient] = provenance;
    assert.equal(created.recorded, "2026-11-01T08:00:00.000Z");
    assert.equal(created.activity.coding[0].system, codeSystem("audit-action"));
    assert.equal(created.activity.coding[0].code, "REFERRAL_CREATED");
    assert.equal(created.activity.text, "Referral initiated.");
    assert.equal(created.agent[0].type.coding[0].code, "performer");
    assert.equal(created.agent[0].role[0].coding[0].code, "referring_clinician");

    // The referring clinician is one Practitioner, used by both the requester role and the Provenance.
    const clinician = resolve(b, created.agent[0].who);
    assert.equal(clinician.resourceType, "Practitioner");
    assert.equal(resolve(b, resolve(b, one(b, "ServiceRequest").requester).practitioner), clinician);

    assert.equal(resolve(b, transport.agent[0].who).name[0].text, "Care Coordinator");
    assert.equal(resolve(b, system.agent[0].who).resourceType, "Device");
    assert.equal(resolve(b, patient.agent[0].who).resourceType, "Patient");

    const targets = created.target.map((t) => resolve(b, t).resourceType);
    assert.deepEqual(targets, ["ServiceRequest", "Task"]);
  });

  it("targets only the ServiceRequest while the referral is a draft", () => {
    const b = buildReferralBundle(baseReferral(), { now: NOW });
    const [p] = ofType(b, "Provenance");
    assert.deepEqual(
      p.target.map((t) => resolve(b, t).resourceType),
      ["ServiceRequest"],
    );
  });
});

describe("FHIR export: ABHA (reserved slot, FH-4)", () => {
  it("puts the patient's own ABHA address on the Patient", () => {
    const b = buildReferralBundle(baseReferral(), {
      now: NOW,
      abhaLink: { abhaAddress: "Lakshmi.Rao@sbx", holderName: "Lakshmi Rao", holderRelation: "self" },
    });
    const patient = one(b, "Patient");
    const abha = patient.identifier.find((i) => i.system === ABHA_ADDRESS_SYSTEM);
    assert.equal(abha.value, "lakshmi.rao@sbx");
    assert.equal(abha.type.text, "ABHA address");
  });

  it("formats a 14-digit ABHA number", () => {
    assert.deepEqual(abhaIdentifier("12345678901234"), {
      system: ABHA_NUMBER_SYSTEM,
      type: { text: "ABHA number" },
      value: "12-3456-7890-1234",
    });
    assert.equal(abhaIdentifier(""), undefined);
  });

  it("files a mother's ABHA on her RelatedPerson, never as the newborn's", () => {
    const referral = baseReferral({ referralType: PatientType.CHILD, caregiverName: "Shalini Naidu (Mother)" });
    const b = buildReferralBundle(referral, {
      now: NOW,
      abhaLink: { abhaAddress: "shalini.naidu@sbx", holderName: "Shalini Naidu", holderRelation: "Mother" },
    });
    assertWellFormed(b);
    const patient = one(b, "Patient");
    assert.ok(!patient.identifier.some((i) => i.system === ABHA_ADDRESS_SYSTEM));
    const mother = one(b, "RelatedPerson");
    assert.deepEqual(
      mother.identifier.map((i) => i.value),
      ["shalini.naidu@sbx"],
    );
  });

  it("adds a separate RelatedPerson when the ABHA holder is not the caregiver on file", () => {
    const b = buildReferralBundle(baseReferral({ referralType: PatientType.CHILD }), {
      now: NOW,
      abhaLink: { abhaAddress: "grand.ma@sbx", holderName: "Kamala Rao", holderRelation: "Grandmother" },
    });
    assertWellFormed(b);
    const holder = ofType(b, "RelatedPerson").find((p) => p.identifier);
    assert.equal(holder.name[0].text, "Kamala Rao");
    assert.equal(holder.relationship[0].coding[0].code, "GRMTH");
  });

  it("adds no ABHA when none is linked", () => {
    const b = buildReferralBundle(baseReferral(), { now: NOW });
    assert.equal(one(b, "Patient").identifier.length, 1);
  });
});

describe("FHIR export: seeded referrals", () => {
  const seeds = buildSeedReferrals();
  const abhaLinks = {
    "NX-9042": { abhaAddress: "shalini.naidu@sbx", holderName: "Shalini Naidu", holderRelation: "Mother" },
    "REF-2024-8821": { abhaAddress: "ananya.reddy@sbx", holderName: "Ananya Reddy", holderRelation: "self" },
  };

  for (const referral of seeds) {
    it(`exports ${referral.id} (${referral.status}) as a well-formed bundle`, () => {
      const bundle = buildReferralBundle(referral, {
        now: NOW,
        facilities: initialFacilities,
        abhaLink: abhaLinks[referral.id] ?? null,
      });
      assertWellFormed(bundle);
      assert.equal(bundle.timestamp, NOW);
      assert.equal(one(bundle, "ServiceRequest").status, STATUS_MAP[referral.status].serviceRequest);
      assert.equal(ofType(bundle, "Provenance").length, referral.auditTrail.length);
    });
  }

  it("is deterministic: the same referral gives the same bundle", () => {
    const [first] = seeds;
    assert.deepEqual(
      buildReferralBundle(first, { now: NOW, facilities: initialFacilities }),
      buildReferralBundle(first, { now: NOW, facilities: initialFacilities }),
    );
  });

  it("maps Ananya Reddy's arrival and her linked ABHA", () => {
    const ananya = seeds.find((r) => r.id === "REF-2024-8821");
    const b = buildReferralBundle(ananya, { now: NOW, abhaLink: abhaLinks[ananya.id] });
    assert.equal(one(b, "Encounter").status, "arrived");
    assert.equal(one(b, "Encounter").period.start, "2026-10-31T10:05:00.000Z");
    assert.ok(one(b, "Patient").identifier.some((i) => i.value === "ananya.reddy@sbx"));
    const bp = ofType(b, "Observation").find((o) => o.code.coding?.[0]?.code === "85354-9");
    assert.deepEqual(
      bp.component.map((c) => c.valueQuantity.value),
      [152, 98],
    );
  });

  it("puts the completed case's disposition in Task.output", () => {
    const meera = seeds.find((r) => r.status === ReferralStatus.COMPLETED);
    const task = one(buildReferralBundle(meera, { now: NOW }), "Task");
    assert.equal(task.output[0].valueCodeableConcept.coding[0].code, "DISCHARGED_HOME");
  });
});

describe("FHIR export: helpers", () => {
  it("prune drops blanks and the empty containers they leave", () => {
    assert.deepEqual(prune({ a: "", b: [null, ""], c: { d: undefined }, e: 0, f: false, g: " x " }), {
      e: 0,
      f: false,
      g: "x",
    });
    assert.equal(prune({}), undefined);
  });

  it("stableUuid is a valid, stable, distinct UUID", () => {
    assert.match(stableUuid("a"), UUID);
    assert.equal(stableUuid("a"), stableUuid("a"));
    assert.notEqual(stableUuid("a"), stableUuid("b"));
  });

  it("names the file after the referral", () => {
    assert.equal(fhirExportFileName({ id: "REF-2024-8821" }), "REF-2024-8821.fhir.json");
    assert.equal(fhirExportFileName({ id: "a/b c" }), "a_b_c.fhir.json");
  });
});
