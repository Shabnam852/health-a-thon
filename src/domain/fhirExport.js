/**
 * FHIR R4 (4.0.1) export of one referral, built in the browser with no FHIR library.
 *
 * Follows docs/REQUIREMENTS.md §5 and §7: one ServiceRequest is the referral, one Task per
 * destination attempt carries the lifecycle (FH-3), identifiers and local codes use Navexa
 * namespaces (FH-4), and every resource carries the HTEST demo tag (FH-5).
 *
 * Pure: the same referral, options and `now` always give the same bundle. Only what the referral
 * holds is mapped. Nothing clinical is inferred, and a value the app cannot read cleanly is
 * exported as the text it holds rather than guessed into a code or a number.
 */

import { PATIENT_TYPE_LABELS, PatientType, ReferralStatus } from "./enums.js";

const NAVEXA = "https://navexa.example/fhir";
export const codeSystem = (name) => `${NAVEXA}/CodeSystem/${name}`;
export const identifierSystem = (name) => `${NAVEXA}/sid/${name}`;

const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";
const UCUM = "http://unitsofmeasure.org";
const BCP47 = "urn:ietf:bcp:47";
const V3_ROLE_CODE = "http://terminology.hl7.org/CodeSystem/v3-RoleCode";
const OBSERVATION_CATEGORY = "http://terminology.hl7.org/CodeSystem/observation-category";
const PROVENANCE_PARTICIPANT = "http://terminology.hl7.org/CodeSystem/provenance-participant-type";
const INTERPRETER_REQUIRED = "http://hl7.org/fhir/StructureDefinition/patient-interpreterRequired";

/** FH-5: every demo resource says it is test data. */
export const DEMO_TAG = Object.freeze({
  system: "http://terminology.hl7.org/CodeSystem/v3-ActReason",
  code: "HTEST",
  display: "test health data",
});

/**
 * ABHA is a reserved identifier slot (FH-4, §10 "fake in demo"). The docs reserve the slot but do not
 * name a national system URI, so it sits in the Navexa namespace until the NRCeS mapping is done.
 * Swap these two constants then; nothing else changes.
 */
export const ABHA_NUMBER_SYSTEM = identifierSystem("abha-number");
export const ABHA_ADDRESS_SYSTEM = identifierSystem("abha-address");

/**
 * Navexa's eight stored statuses, mapped to the §3 status table (13 codes) and its FHIR columns.
 * `businessStatus` is the §3 code (FH-3); `task` is the closest `task-status` code; `serviceRequest`
 * is the `request-status` code; `encounter` is set once a hospital confirmed arrival.
 *
 * - CREATED is a draft: §3 says no Task exists yet.
 * - ACKNOWLEDGED in this app means the hospital accepted the referral and held a bed
 *   (DATA_MODEL §3.1, `acknowledgeReferral` writes "Bed held for patient"), which is §3 ACCEPTED,
 *   not the weaker §3 ACKNOWLEDGED ("not an appointment or bed").
 * - REJECTED is §3 DECLINED. The referral stays open (it floats until the patient chooses), so the
 *   ServiceRequest stays active; only that destination's Task is rejected.
 * - CLINICAL_ASSESSMENT_RECORDED is §3 SERVICE_COMPLETED: the care was recorded, the loop is not closed.
 * - COMPLETED is §3 CLOSED: the referral episode is over, so the arrival Encounter is finished.
 */
export const STATUS_MAP = Object.freeze({
  [ReferralStatus.CREATED]: { businessStatus: "DRAFT", label: "Draft", serviceRequest: "draft", task: null },
  [ReferralStatus.SENT]: {
    businessStatus: "SENT",
    label: "Sent – awaiting acknowledgement",
    serviceRequest: "active",
    task: "requested",
  },
  [ReferralStatus.ACKNOWLEDGED]: {
    businessStatus: "ACCEPTED",
    label: "Accepted",
    serviceRequest: "active",
    task: "accepted",
  },
  [ReferralStatus.REJECTED]: {
    businessStatus: "DECLINED",
    label: "Declined",
    serviceRequest: "active",
    task: "rejected",
  },
  [ReferralStatus.REDIRECTED]: {
    businessStatus: "REDIRECT_REQUESTED",
    label: "Redirect requested",
    serviceRequest: "active",
    task: "rejected",
  },
  [ReferralStatus.ARRIVAL_CONFIRMED]: {
    businessStatus: "ARRIVED",
    label: "Arrival confirmed",
    serviceRequest: "active",
    task: "in-progress",
    encounter: "arrived",
  },
  [ReferralStatus.CLINICAL_ASSESSMENT_RECORDED]: {
    businessStatus: "SERVICE_COMPLETED",
    label: "Service recorded – outcome pending",
    serviceRequest: "active",
    task: "in-progress",
    encounter: "in-progress",
  },
  [ReferralStatus.COMPLETED]: {
    businessStatus: "CLOSED",
    label: "Closed",
    serviceRequest: "completed",
    task: "completed",
    encounter: "finished",
  },
});

/**
 * `request-priority` has no step between routine and urgent, where Navexa's PRIORITY sits.
 * It goes up to urgent: collapsing a level must never under-triage. §7 maps the rest one to one.
 */
export const PRIORITY_MAP = Object.freeze({
  ROUTINE: "routine",
  PRIORITY: "urgent",
  URGENT: "urgent",
  STAT: "stat",
});

const PATHWAY_CODES = {
  [PatientType.MATERNAL]: "maternal",
  [PatientType.CHILD]: "child",
  [PatientType.DYAD]: "dyad",
};

// BCP-47 tags for the languages the app is used in. Anything else travels as text only.
const LANGUAGE_TAGS = {
  english: "en",
  hindi: "hi",
  kannada: "kn",
  tamil: "ta",
  telugu: "te",
  malayalam: "ml",
  marathi: "mr",
  bengali: "bn",
  bangla: "bn",
  gujarati: "gu",
  odia: "or",
  punjabi: "pa",
  urdu: "ur",
  bhojpuri: "bho",
  assamese: "as",
};

// v3-RoleCode, for the relationships a caregiver field names.
const RELATIONSHIPS = {
  mother: ["MTH", "mother"],
  father: ["FTH", "father"],
  spouse: ["SPS", "spouse"],
  husband: ["HUSB", "husband"],
  wife: ["WIFE", "wife"],
  sister: ["SIS", "sister"],
  brother: ["BRO", "brother"],
  grandmother: ["GRMTH", "grandmother"],
  grandfather: ["GRFTH", "grandfather"],
  "mother-in-law": ["MTHINLAW", "mother-in-law"],
  "father-in-law": ["FTHINLAW", "father-in-law"],
  neighbor: ["NBOR", "neighbor"],
  neighbour: ["NBOR", "neighbor"],
  friend: ["FRND", "friend"],
};

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

/** FNV-1a, 32 bits, with a chosen offset basis so four runs give 128 independent-ish bits. */
const fnv1a = (text, basis) => {
  let h = basis >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * A stable UUID for one resource of one referral, so exporting twice gives the same ids. Marked as
 * an RFC 9562 version 8 (custom) UUID, which is what a name-derived, non-SHA UUID is.
 */
export const stableUuid = (key) => {
  const hex = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b]
    .map((basis) => fnv1a(key, basis).toString(16).padStart(8, "0"))
    .join("");
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const text = (value) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());

/** An ISO instant, or undefined when the value is not a real time. */
const instant = (value) => {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
};

/**
 * Drops undefined, null, NaN, blank strings, and the empty arrays and objects they leave behind.
 * FHIR forbids empty elements, so this runs over every resource before it goes in the bundle.
 */
export const prune = (value) => {
  if (Array.isArray(value)) {
    const kept = value.map(prune).filter((v) => v !== undefined);
    return kept.length ? kept : undefined;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const kept = prune(v);
      if (kept !== undefined) out[k] = kept;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof value === "string") return value.trim() || undefined;
  if (value === null || value === undefined || Number.isNaN(value)) return undefined;
  return value;
};

const coding = (system, code, display) => ({ system, code, display });
const localCoding = (name, code, display) => coding(codeSystem(name), code, display);

const languageCommunication = (language) =>
  text(language)
    .split(/[/,;]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => {
      const tag = LANGUAGE_TAGS[name.toLowerCase()];
      return { language: { coding: tag ? [coding(BCP47, tag, name)] : [], text: name } };
    });

const relationshipFor = (word) => RELATIONSHIPS[text(word).toLowerCase()];

/** "Karthik Reddy (Spouse)" -> name "Karthik Reddy", relationship spouse. Unknown words stay in the name. */
const parseCaregiver = (raw) => {
  const full = text(raw);
  const match = full.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (match && relationshipFor(match[2])) return { name: match[1].trim(), relationship: relationshipFor(match[2]) };
  const leading = match ? match[1] : full;
  return { name: full, relationship: relationshipFor(leading) };
};

const formatAbhaNumber = (digits) =>
  `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`;

/** An ABHA number (14 digits) or an ABHA address (name@sbx), as a FHIR identifier. */
export const abhaIdentifier = (value) => {
  const raw = text(value);
  if (!raw) return undefined;
  const digits = raw.replace(/-/g, "");
  if (/^\d{14}$/.test(digits)) {
    return { system: ABHA_NUMBER_SYSTEM, type: { text: "ABHA number" }, value: formatAbhaNumber(digits) };
  }
  return { system: ABHA_ADDRESS_SYSTEM, type: { text: "ABHA address" }, value: raw.toLowerCase() };
};

// ---------------------------------------------------------------------------------------------
// Vitals -> Observation
// ---------------------------------------------------------------------------------------------

const PER_MIN = { unit: "/min", code: "/min", pattern: /^(bpm|\/min|beats\s*\/\s*min)$/i, unitless: true };
const CELSIUS = { unit: "°C", code: "Cel", pattern: /^(°\s*c|c|deg\s*c)$/i };
const GRAMS = { unit: "g", code: "g", pattern: /^(g|grams?)$/i };
const MG_DL = { unit: "mg/dL", code: "mg/dL", pattern: /^mg\s*\/\s*dl$/i };

const VITAL_SIGNS = "vital-signs";
const LABORATORY = "laboratory";

/**
 * What each vital key means. LOINC only where the code is certain; the rest keep their screen
 * name as text. Baby's measurements recorded on a mother's referral get no LOINC, because the
 * Observation's subject is the referred patient and a body-weight code would claim it was hers.
 */
const VITAL_DEFS = {
  fhr: { name: "Fetal heart rate", loinc: ["55283-6", "Fetal Heart rate"], unit: PER_MIN, category: VITAL_SIGNS },
  hr: { name: "Heart rate", loinc: ["8867-4", "Heart rate"], unit: PER_MIN, category: VITAL_SIGNS },
  temp: { name: "Body temperature", loinc: ["8310-5", "Body temperature"], unit: CELSIUS, category: VITAL_SIGNS },
  weight: { name: "Body weight", loinc: ["29463-7", "Body weight"], unit: GRAMS, category: VITAL_SIGNS },
  tsb: {
    name: "Total serum bilirubin",
    loinc: ["1975-2", "Bilirubin.total [Mass/volume] in Serum or Plasma"],
    unit: MG_DL,
    category: LABORATORY,
  },
  urine: { name: "Urine protein" },
  bpp: { name: "Biophysical profile" },
  membranes: { name: "Membranes" },
  infantWeight: { name: "Baby's weight", unit: GRAMS },
  infantTemp: { name: "Baby's temperature", unit: CELSIUS },
  infantHr: { name: "Baby's heart rate", unit: PER_MIN },
};

const keyLabel = (key) => {
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * "2,700g (-12.8%)" -> 2700 g, with the rest kept. Undefined when the value is not a clean number
 * in a unit we know, so it travels as text instead.
 */
const parseQuantity = (raw, unit) => {
  if (!unit) return undefined;
  const match = raw.match(/^([0-9][0-9,]*(?:\.[0-9]+)?)\s*([^\s(]*)\s*(.*)$/);
  if (!match) return undefined;
  const [, number, unitText, rest] = match;
  if (unitText ? !unit.pattern.test(unitText) : !unit.unitless) return undefined;
  const value = Number(number.replace(/,/g, ""));
  if (!Number.isFinite(value)) return undefined;
  return { quantity: { value, unit: unit.unit, system: UCUM, code: unit.code }, rest: rest.trim() };
};

const BP_PATTERN = /^(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mm\s*hg)?\s*(.*)$/i;
const mmHg = (value) => ({ value: Number(value), unit: "mmHg", system: UCUM, code: "mm[Hg]" });

/** Readings that say nothing was measured ("N/A (Postpartum)") are not observations. */
const isNotMeasured = (raw) => /^(n\/?a|not applicable|not recorded|none)\b/i.test(raw);

const vitalObservation = (key, rawValue) => {
  const raw = text(rawValue);
  if (!raw || key.endsWith("Status") || isNotMeasured(raw)) return undefined;

  if (key === "bp") {
    const match = raw.match(BP_PATTERN);
    if (!match) return { code: { text: "Blood pressure" }, valueString: raw };
    return {
      category: VITAL_SIGNS,
      code: {
        coding: [coding(LOINC, "85354-9", "Blood pressure panel with all children optional")],
        text: "Blood pressure",
      },
      component: [
        { code: { coding: [coding(LOINC, "8480-6", "Systolic blood pressure")] }, valueQuantity: mmHg(match[1]) },
        { code: { coding: [coding(LOINC, "8462-4", "Diastolic blood pressure")] }, valueQuantity: mmHg(match[2]) },
      ],
      note: match[3] ? [{ text: `Recorded as "${raw}"` }] : undefined,
    };
  }

  const def = VITAL_DEFS[key] || { name: keyLabel(key) };
  const code = { coding: def.loinc ? [coding(LOINC, ...def.loinc)] : [], text: def.name };
  const parsed = parseQuantity(raw, def.unit);
  if (!parsed) return { category: def.category, code, valueString: raw };
  return {
    category: def.category,
    code,
    valueQuantity: parsed.quantity,
    note: parsed.rest ? [{ text: `Recorded as "${raw}"` }] : undefined,
  };
};

// ---------------------------------------------------------------------------------------------
// The bundle
// ---------------------------------------------------------------------------------------------

/** `<referral id>.fhir.json`, safe as a file name. */
export const fhirExportFileName = (referral) =>
  `${text(referral?.id).replace(/[^A-Za-z0-9._-]/g, "_") || "referral"}.fhir.json`;

/**
 * Builds the export.
 *
 * Bundle type is `collection`, as §5 (Resources: Bundle, Interactions: Export) specifies. A
 * `document` bundle needs a Composition first and stands for one attested clinical document; this
 * is instead a set of linked resources about one ServiceRequest, gathered for handover or audit.
 *
 * @param referral   A Navexa referral (createReferral shape).
 * @param options.facilities  Known facilities, to add their Navexa ID, type and phone.
 * @param options.abhaLink    The demo ABHA link for this referral ({ abhaAddress, holderName, holderRelation }).
 * @param options.now         The export time (ISO), for Bundle.timestamp.
 */
export const buildReferralBundle = (
  referral,
  { facilities = [], abhaLink = null, now = new Date().toISOString() } = {},
) => {
  if (!referral || !text(referral.id)) throw new Error("A referral with an ID is needed for a FHIR export.");
  const mapped = STATUS_MAP[referral.status];
  if (!mapped) throw new Error(`Unknown referral status: ${referral.status}`);

  const entries = [];
  const idFor = (key) => stableUuid(`${referral.id}|${key}`);
  const ref = (resource) => ({ reference: `urn:uuid:${resource.id}` });
  const add = (resource) => {
    entries.push(resource);
    return resource;
  };
  const base = (resourceType, key) => ({ resourceType, id: idFor(key), meta: { tag: [DEMO_TAG] } });

  // Organizations, one per hospital name, so every mention points at the same resource.
  const organizations = new Map();
  const organizationFor = (name) => {
    const key = text(name);
    if (!key) return undefined;
    if (!organizations.has(key)) {
      const facility = facilities.find((f) => f.name === key);
      organizations.set(
        key,
        add({
          ...base("Organization", `org|${key}`),
          identifier: facility?.id ? [{ system: identifierSystem("facility"), value: facility.id }] : [],
          name: key,
          type: facility?.type ? [{ text: facility.type }] : [],
          telecom: facility?.phone ? [{ system: "phone", value: facility.phone, use: "work" }] : [],
        }),
      );
    }
    return organizations.get(key);
  };

  // Practitioners, one per person named on the referral or in its audit trail.
  const practitioners = new Map();
  const practitionerFor = (name) => {
    const key = text(name);
    if (!key) return undefined;
    if (!practitioners.has(key)) {
      practitioners.set(key, add({ ...base("Practitioner", `practitioner|${key}`), name: [{ text: key }] }));
    }
    return practitioners.get(key);
  };

  // The ServiceRequest goes first: it is what the bundle is about.
  const serviceRequest = add(base("ServiceRequest", "service-request"));

  const sending = organizationFor(referral.fromFacility);
  const receiving = organizationFor(referral.toFacility);
  for (const name of referral.declinedBy || []) organizationFor(name);

  // Patient.
  const patient = add({
    ...base("Patient", "patient"),
    extension:
      typeof referral.interpreterNeeded === "boolean"
        ? [{ url: INTERPRETER_REQUIRED, valueBoolean: referral.interpreterNeeded }]
        : [],
    identifier: [{ system: identifierSystem("patient-local"), value: text(referral.patientId) }],
    name: [{ text: text(referral.patientName) }],
    telecom: referral.patientPhone ? [{ system: "phone", value: referral.patientPhone, use: "mobile" }] : [],
    // A mother on a maternal referral is pregnant or postpartum. A newborn's sex is not recorded.
    gender: referral.referralType === PatientType.MATERNAL ? "female" : undefined,
    address: referral.patientAddress ? [{ text: referral.patientAddress }] : [],
    communication: languageCommunication(referral.language),
  });

  // Caregiver.
  let caregiver;
  let caregiverName = "";
  if (text(referral.caregiverName) || text(referral.caregiverContact)) {
    const parsed = parseCaregiver(referral.caregiverName);
    caregiver = add({
      ...base("RelatedPerson", "caregiver"),
      patient: ref(patient),
      relationship: parsed.relationship ? [{ coding: [coding(V3_ROLE_CODE, ...parsed.relationship)] }] : [],
      name: parsed.name ? [{ text: parsed.name }] : [],
      telecom: referral.caregiverContact ? [{ system: "phone", value: referral.caregiverContact }] : [],
    });
    caregiverName = parsed.name;
    // FH-6: a newborn's Patient points at the mother's RelatedPerson record.
    if (referral.referralType === PatientType.CHILD && parsed.relationship?.[0] === "MTH") {
      patient.link = [{ other: ref(caregiver), type: "seealso" }];
    }
  }

  // ABHA. It goes on whoever holds it: the patient for "self", otherwise the family member
  // (a newborn's link is usually the mother's ABHA, which must not be filed as the baby's).
  const abha = abhaIdentifier(abhaLink?.abhaAddress);
  if (abha) {
    const relation = text(abhaLink.holderRelation).toLowerCase();
    if (!relation || relation === "self") {
      patient.identifier.push(abha);
    } else {
      const holderName = text(abhaLink.holderName);
      const sameAsCaregiver = caregiver && (!holderName || holderName.toLowerCase() === caregiverName.toLowerCase());
      const holder =
        sameAsCaregiver && caregiver
          ? caregiver
          : add({
              ...base("RelatedPerson", "abha-holder"),
              patient: ref(patient),
              relationship: relationshipFor(relation)
                ? [{ coding: [coding(V3_ROLE_CODE, ...relationshipFor(relation))] }]
                : [],
              name: holderName ? [{ text: holderName }] : [],
            });
      holder.identifier = [...(holder.identifier || []), abha];
    }
  }

  // Requester: the referring clinician's role at the sending hospital (§5), else the hospital.
  let requester = sending;
  const clinician = practitionerFor(referral.fromClinician);
  if (clinician) {
    requester = add({
      ...base("PractitionerRole", "requester"),
      practitioner: ref(clinician),
      organization: sending ? ref(sending) : undefined,
      code: [{ coding: [localCoding("practitioner-role", "referrer", "Referring clinician")] }],
    });
  }

  // Vitals.
  const observations = Object.entries(referral.vitals || {})
    .map(([key, value]) => [key, vitalObservation(key, value)])
    .filter(([, obs]) => obs)
    .map(([key, obs]) =>
      add({
        ...base("Observation", `vital|${key}`),
        status: "final",
        category: obs.category ? [{ coding: [coding(OBSERVATION_CATEGORY, obs.category)] }] : [],
        code: obs.code,
        subject: ref(patient),
        // The app does not record when a vital was taken, so no effective time is claimed.
        valueQuantity: obs.valueQuantity,
        valueString: obs.valueString,
        component: obs.component,
        note: obs.note,
      }),
    );

  const floating = referral.status === ReferralStatus.REJECTED;
  const authoredOn = instant(referral.createdAt);
  const condition = text(referral.condition) || text(referral.reason);
  const reason = text(referral.reason);
  const elsewhere = text(referral.patientChoice?.elsewhere);

  Object.assign(serviceRequest, {
    identifier: [{ system: identifierSystem("referral"), value: referral.id }],
    status: mapped.serviceRequest,
    intent: "order",
    category: PATHWAY_CODES[referral.referralType]
      ? [
          {
            coding: [
              localCoding("pathway", PATHWAY_CODES[referral.referralType], PATIENT_TYPE_LABELS[referral.referralType]),
            ],
          },
        ]
      : [],
    priority: PRIORITY_MAP[referral.priority],
    code: { coding: [coding(SNOMED, "3457005", "Patient referral")], text: "Referral" },
    subject: ref(patient),
    authoredOn,
    requester: requester ? ref(requester) : undefined,
    // A hospital that declined is not who is asked to perform it. A floating referral has no performer yet.
    performer: !floating && receiving ? [ref(receiving)] : [],
    reasonCode: condition ? [{ text: condition }] : [],
    supportingInfo: observations.map(ref),
    note: [
      reason && reason !== condition ? { text: reason } : undefined,
      floating && elsewhere
        ? { text: `The patient plans to go to ${elsewhere}, which is not on the Navexa list.` }
        : undefined,
    ],
  });

  // Tasks. Each earlier destination is its own Task under the same ServiceRequest (§5, FR-20):
  // rejected when that hospital declined, cancelled when the case was moved away from it.
  const timelineDates = (referral.timeline || [])
    .map((t) => instant(t.date))
    .filter(Boolean)
    .sort();
  const firstSent = (referral.timeline || []).find((t) => t.status === ReferralStatus.SENT);
  const history = referral.redirectHistory || [];
  const declined = new Set(referral.declinedBy || []);
  const taskBase = (key) => ({
    ...base("Task", key),
    intent: "order",
    focus: ref(serviceRequest),
    for: ref(patient),
    requester: requester ? ref(requester) : undefined,
  });

  let previousStart = instant(firstSent?.date) || authoredOn;
  history.forEach((move, index) => {
    const owner = organizationFor(move.divertedFrom);
    organizationFor(move.divertedTo);
    const wasDeclined = declined.has(move.divertedFrom);
    add({
      ...taskBase(`task|${index}`),
      status: wasDeclined ? "rejected" : "cancelled",
      businessStatus: wasDeclined
        ? { coding: [localCoding("navexa-referral-status", "DECLINED", "Declined")] }
        : undefined,
      statusReason: !wasDeclined && text(move.reason) ? { text: move.reason } : undefined,
      owner: owner ? ref(owner) : undefined,
      authoredOn: previousStart,
      lastModified: instant(move.date),
    });
    previousStart = instant(move.date) || previousStart;
  });

  let task;
  if (mapped.task) {
    const output = text(referral.clinicalOutcome?.disposition);
    task = add({
      ...taskBase("task|current"),
      status: mapped.task,
      businessStatus: { coding: [localCoding("navexa-referral-status", mapped.businessStatus, mapped.label)] },
      statusReason: floating && text(referral.rejectionReason) ? { text: referral.rejectionReason } : undefined,
      owner: receiving ? ref(receiving) : undefined,
      authoredOn: previousStart,
      lastModified: timelineDates.at(-1),
      output: output
        ? [
            {
              type: { coding: [localCoding("task-output", "disposition", "Disposition")] },
              valueCodeableConcept: { coding: [localCoding("disposition", output)], text: output },
            },
          ]
        : [],
    });
  }

  // Encounter, once a hospital confirmed the patient is there.
  if (mapped.encounter) {
    add({
      ...base("Encounter", "arrival"),
      status: mapped.encounter,
      // R4 requires a class; the app does not record inpatient vs emergency, so a local code says only what is known.
      class: localCoding("encounter-class", "referral-arrival", "Arrival on referral"),
      subject: ref(patient),
      basedOn: [ref(serviceRequest)],
      serviceProvider: receiving ? ref(receiving) : undefined,
      period: { start: instant(referral.arrival?.arrivedAt) },
    });
  }

  // Provenance, one per audit event: who did what, when (FH-2). "System" acts as a Device.
  let systemDevice;
  const agentFor = (event) => {
    if (event.role === "system" || /^system$/i.test(text(event.actor))) {
      systemDevice ||= add({
        ...base("Device", "navexa-system"),
        deviceName: [{ name: "Navexa", type: "user-friendly-name" }],
      });
      return systemDevice;
    }
    if (event.role === "patient") return patient;
    return practitionerFor(event.actor);
  };

  (referral.auditTrail || []).forEach((event, index) => {
    const recorded = instant(event.timestamp);
    const who = agentFor(event);
    if (!recorded || !who) return;
    add({
      ...base("Provenance", `provenance|${index}|${text(event.id)}`),
      target: [ref(serviceRequest), task ? ref(task) : undefined],
      occurredDateTime: recorded,
      recorded,
      activity: {
        coding: text(event.action) ? [localCoding("audit-action", text(event.action))] : [],
        text: event.details,
      },
      agent: [
        {
          type: { coding: [coding(PROVENANCE_PARTICIPANT, "performer", "Performer")] },
          role: text(event.role) ? [{ coding: [localCoding("audit-role", text(event.role))] }] : [],
          who: ref(who),
        },
      ],
    });
  });

  return prune({
    resourceType: "Bundle",
    id: idFor("bundle"),
    meta: { tag: [DEMO_TAG] },
    identifier: { system: identifierSystem("referral-export"), value: referral.id },
    type: "collection",
    timestamp: instant(now),
    entry: entries.map((resource) => ({ fullUrl: `urn:uuid:${resource.id}`, resource })),
  });
};
