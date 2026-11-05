import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import ReferralDraftCard from "../components/ReferralDraftCard.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, Card, Field, Icon, Input, Page, PageHeader, Select, Textarea } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext";
import { telHref } from "../domain/contact.js";
import { AuditRole, PATIENT_TYPE_LABELS, PatientType, ReferralStatus, UrgencyLevel } from "../domain/enums.js";
import { getReferralDestinations } from "../domain/hospitalChoice.js";
import { createAuditEvent } from "../domain/models.js";
import { addReason, formatBp, mergeDraft } from "../domain/referralEntry.js";

const MATERNAL_VITALS = [
  // "decimal", not "numeric": an iPhone's numeric pad has no separator, so 128/82 couldn't be typed.
  { key: "bp", label: "Blood pressure", placeholder: "e.g. 128/82", inputMode: "decimal", format: "bp" },
  { key: "fhr", label: "Fetal heart rate", placeholder: "e.g. 142 bpm", inputMode: "numeric" },
  { key: "urine", label: "Urine protein", placeholder: "e.g. +1", suggestions: ["Nil", "Trace", "+1", "+2", "+3"] },
  {
    key: "bpp",
    label: "Biophysical profile",
    placeholder: "e.g. 8/8",
    suggestions: ["10/10", "8/10", "8/8", "6/8", "4/8"],
  },
];
const NEONATAL_VITALS = [
  { key: "tsb", label: "Bilirubin", placeholder: "e.g. 18.4 mg/dL", inputMode: "decimal" },
  { key: "weight", label: "Weight", placeholder: "e.g. 2,980 g", inputMode: "decimal" },
  { key: "temp", label: "Temperature", placeholder: "e.g. 36.8 °C", inputMode: "decimal" },
  { key: "hr", label: "Heart rate", placeholder: "e.g. 138 bpm", inputMode: "numeric" },
];
const ALL_VITALS = [...MATERNAL_VITALS, ...NEONATAL_VITALS];

// One tap adds a common reason to the note. The clinician still writes the detail.
const REASONS = {
  maternal: ["Raised BP", "Bleeding", "Less fetal movement", "Leaking fluid", "Preterm labour", "Severe anaemia"],
  child: ["Jaundice", "Poor feeding", "Fever", "Fast breathing", "Low birth weight", "Fits"],
};
// Typing suggestions. The field still takes any text.
const SUGGESTIONS = {
  gestationalAge: ["28 weeks", "32 weeks", "34 weeks", "36 weeks", "37 weeks", "38 weeks", "40 weeks"],
  obstetricHistory: ["G1P0 (first pregnancy)", "G2P1", "G3P2", "Previous caesarean", "Previous stillbirth"],
  birthHistory: ["Term vaginal delivery", "Preterm vaginal delivery", "Caesarean delivery", "Home delivery"],
  age: ["18 yrs", "20 yrs", "25 yrs", "30 yrs", "35 yrs"],
  ageChild: ["1 day old", "2 days old", "3 days old", "1 week old", "2 weeks old"],
};

// Sample values for the demo. Switching patient type swaps only the fields still holding a sample.
const MATERNAL_SAMPLE = {
  patientName: "Fathima Begum",
  age: "29 yrs",
  gestationalAge: "36 Weeks, 2 Days",
  obstetricHistory: "G3P2 (Two Prior Term Deliveries)",
  indication:
    "Persistent Premature Rupture of Membranes (PPROM) confirmed via sterile speculum pool exam and positive nitrazine. Patient experiencing irregular mild contractions q 8-10 mins. GBS status unknown. Requires prompt evaluation in Level III obstetric triage for latency antibiotics and continuous fetal cardiotocography.",
  targetDepartment: "Labor & Delivery Triage / High-Risk Antenatal Unit",
};
const SAMPLES = {
  [PatientType.MATERNAL]: MATERNAL_SAMPLE,
  [PatientType.DYAD]: MATERNAL_SAMPLE,
  [PatientType.CHILD]: {
    patientName: "Baby of Fathima Begum",
    age: "3 days old",
    gestationalAge: "38 Weeks, 5 Days",
    obstetricHistory: "Term vaginal delivery",
    indication:
      "Newborn with progressive jaundice and poor feeding at 3 days of life. Requires prompt evaluation for intensive phototherapy.",
    targetDepartment: "Neonatal ICU / Phototherapy Unit",
  },
};

// Plain names for the audit trail.
const FIELD_NAMES = {
  patientType: "patient type",
  patientName: "name",
  age: "age",
  gestationalAge: "gestational age",
  obstetricHistory: "history",
  indication: "reason",
  phone: "phone",
  emergencyContact: "emergency contact",
  address: "address",
  language: "language",
  targetDepartment: "unit",
  receivingFacility: "hospital",
  interpreterNeeded: "interpreter",
  hasTransport: "transport",
  ...Object.fromEntries(ALL_VITALS.map(({ key, label }) => [key, label.toLowerCase()])),
};

const TYPES = [PatientType.MATERNAL, PatientType.CHILD, PatientType.DYAD].map((t) => [t, PATIENT_TYPE_LABELS[t]]);
const URGENCY = [
  [UrgencyLevel.ROUTINE, "Routine", "7-14 days"],
  [UrgencyLevel.PRIORITY, "Priority", "48-72 hours"],
  [UrgencyLevel.URGENT, "Urgent", "4-6 hours"],
  [UrgencyLevel.STAT, "Emergency", "Now, ambulance 108"],
];
// The full text is saved on the referral. A select has room for its first part only.
const shortOption = (option) => option.split(/ \(Level | \/ /)[0];

const DEPARTMENTS = [
  "Labor & Delivery Triage / High-Risk Antenatal Unit",
  "Maternal-Fetal Medicine (MFM) Outpatient Suite",
  "Antepartum Inpatient Monitoring Pod B",
  "Neonatal ICU / Phototherapy Unit",
];
const LANGUAGES = ["Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Urdu", "Bengali", "Bhojpuri", "English"];

// `name` lets the form find the group (to focus it on a failed send); `error` stays shown under it until fixed.
const Choice = ({ options, value, onChange, label, grid = false, name: nameProp, error }) => {
  const generatedName = useId();
  const name = nameProp || generatedName;
  const errorId = useId();
  return (
    <fieldset className="space-y-1" aria-describedby={error ? errorId : undefined}>
      <legend className="block text-sm font-semibold text-ink mb-1">{label}</legend>
      {error && (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <div className={grid ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
        {options.map(([id, text, hint]) => (
          <label key={id} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="sr-only peer"
            />
            {/* The radio is visually hidden, so its focus ring is drawn on this label. */}
            <span className="block min-h-control px-4 py-1.5 rounded-control border text-sm font-semibold bg-surface text-ink border-line-strong hover:border-accent peer-checked:bg-brand peer-checked:text-on-fill peer-checked:border-brand peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              {text}
              {hint && <span className="block text-xs font-normal">{hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

// How each field stands after AI filled the form: shown beside its label and on its border,
// so a reviewer sees at a glance what the AI wrote, what it wasn't sure of, and what they changed.
const AI_TAGS = {
  ai: { text: "AI", className: "bg-caution-soft text-caution", border: "border-caution" },
  unclear: { text: "Unclear", className: "bg-warning-soft text-warning", border: "border-warning" },
  edited: { text: "Edited", className: "bg-accent-soft text-accent", border: "" },
  differs: { text: "AI differs", className: "bg-warning-soft text-warning", border: "border-warning" },
};

const SOURCE_NAMES = { note: "typed note", voice: "recording", photo: "photo" };
// When the referral is sent. Only ever called from the Send handler.
const sentAt = () => new Date().toISOString();

// Fields holding made-up demo values. The AI clears these when it has nothing for them.
const SAMPLE_KEYS = [
  ...Object.keys(MATERNAL_SAMPLE),
  "phone",
  "emergencyContact",
  "address",
  "language",
  "vital:bp",
  "vital:fhr",
];
// A demo value a checkbox can't clear: when the AI has nothing for it, it's flagged for a check.
const CHECK_KEYS = ["interpreterNeeded"];

// How a suggestion reads for the fields that aren't text boxes.
const suggestionText = (key, value) => {
  if (key === "patientType") return `Patient type: ${PATIENT_TYPE_LABELS[value] || value}`;
  if (key === "hasTransport") return `Needs transport: ${value === "yes" ? "no" : "yes"}`;
  if (key === "interpreterNeeded") return `Needs interpreter: ${value}`;
  return value;
};
const NON_TEXT_KEYS = ["patientType", "hasTransport", "interpreterNeeded"];

// One part of the form: its name on the left on wide screens, its fields on the right.
const Section = ({ title, children }) => (
  <section className="grid grid-cols-1 xl:grid-cols-[7rem_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-line pt-2 first:border-t-0 first:pt-0">
    <h2 className="text-base font-semibold text-ink">{title}</h2>
    <div className="min-w-0 space-y-2">{children}</div>
  </section>
);

const AiTag = ({ status }) => {
  const tag = AI_TAGS[status];
  if (!tag) return null;
  return (
    <span className={`ml-2 whitespace-nowrap rounded-pill px-2 py-0.5 text-xs font-semibold ${tag.className}`}>
      {tag.text}
    </span>
  );
};

const CreateReferral = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { referrals, facilities, activeFacility, addReferral, setActiveReferralId } = useReferrals();
  const destinations = getReferralDestinations(facilities, activeFacility.name);
  const { toast, showToast } = useToast();

  const [isSubmitted, setIsSubmitted] = useState(false);
  // A second submit can arrive before the first has re-rendered, so state alone is not a guard.
  const submitting = useRef(false);
  const [patientType, setPatientType] = useState(PatientType.MATERNAL);
  const [priority, setPriority] = useState(UrgencyLevel.URGENT);
  // Set when a send is refused with no urgency chosen, and kept until one is chosen.
  const [priorityError, setPriorityError] = useState(false);
  const [hasTransport, setHasTransport] = useState(false);
  const [interpreterNeeded, setInterpreterNeeded] = useState(true);
  const [vitals, setVitals] = useState({ bp: "128/82", fhr: "142" });
  // What the AI put in each field, and the fields it found hard to read or hear. Once AI is
  // used, how soon is left for the clinician, and they confirm they checked every field.
  const [aiOriginal, setAiOriginal] = useState(null);
  const [aiUnclear, setAiUnclear] = useState(() => new Set());
  const [aiSources, setAiSources] = useState([]);
  // AI values for fields the clinician typed or changed. Theirs stays until they take one.
  const [aiSuggestions, setAiSuggestions] = useState({});
  // Earlier AI values that the latest fill found in no source, and demo values it didn't replace.
  const [aiStale, setAiStale] = useState(() => new Set());
  const [aiToCheck, setAiToCheck] = useState(() => new Set());
  // The fields the clinician has typed in or changed by hand. A fill never overwrites these.
  const userKeys = useRef(new Set());
  const own = (key) => {
    userKeys.current.add(key);
    // A demo value flagged for a check is settled once the clinician sets it.
    setAiToCheck((prev) => (prev.has(key) ? new Set([...prev].filter((k) => k !== key)) : prev));
  };
  // Linked evidence: the source words behind each field, and the field being checked now.
  const [aiEvidence, setAiEvidence] = useState({});
  const [aiUnsourced, setAiUnsourced] = useState(() => new Set());

  const [focusKey, setFocusKey] = useState(null);
  const formRef = useRef(null);
  const listId = useId();
  useEffect(() => {
    const formEl = formRef.current;
    if (!formEl) return undefined;
    const onFocusIn = (e) => setFocusKey(e.target.name || null);
    // Ctrl+Enter or Cmd+Enter sends from any field, the same as the Send button.
    const onKeyDown = (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        formEl.requestSubmit();
      }
    };
    formEl.addEventListener("focusin", onFocusIn);
    formEl.addEventListener("keydown", onKeyDown);
    return () => {
      formEl.removeEventListener("focusin", onFocusIn);
      formEl.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  const [aiChecked, setAiChecked] = useState(false);
  const aiUsed = aiOriginal !== null;
  const [form, setForm] = useState(() => ({
    ...MATERNAL_SAMPLE,
    mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    phone: "+91 90000 29012",
    emergencyContact: "Tariq Ahmed (Spouse) - +91 90000 29014",
    language: "Urdu",
    address: "42, 3rd Cross, Frazer Town, Bengaluru 560005",
    // "Refer" on the hospitals board names the hospital it was pressed on.
    receivingFacility:
      destinations.find((name) => name === facilities.find((f) => f.id === searchParams.get("to"))?.name) ||
      destinations[0],
  }));

  // Every value the AI could have filled, by the same keys as aiOriginal.
  const current = {
    ...form,
    patientType,
    interpreterNeeded: interpreterNeeded ? "yes" : "no",
    hasTransport: hasTransport ? "yes" : "no",
    ...Object.fromEntries(Object.entries(vitals).map(([k, v]) => [`vital:${k}`, v])),
  };
  const suggestionFor = (key) =>
    aiSuggestions[key] !== undefined && aiSuggestions[key] !== (current[key] ?? "") ? aiSuggestions[key] : null;
  const statusOf = (key) => {
    if (suggestionFor(key) !== null) return "differs";
    if (aiToCheck.has(key)) return "unclear";
    if (!aiOriginal || !(key in aiOriginal)) return null;
    if ((current[key] ?? "") !== aiOriginal[key]) return "edited";
    const unclear = aiUnclear.has(key.replace(/^vital:.*/, "vitals")) || aiUnsourced.has(key) || aiStale.has(key);
    return unclear ? "unclear" : "ai";
  };
  const sourceLine = (key) => {
    const ev = aiEvidence[key];
    return ev ? `From the ${SOURCE_NAMES[ev.source] || "note"}: "${ev.quote}"` : "";
  };
  // Under each AI field: the words it came from, what the AI first wrote once it's edited, or
  // what the AI read when it differs from what the clinician typed.
  const evidenceFor = (key) => {
    const status = statusOf(key);
    if (!status) return undefined;
    if (status === "differs") {
      const value = suggestionFor(key);
      return (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-ink">
            AI read: <strong>"{value}"</strong>
            {aiEvidence[key] ? ` (${SOURCE_NAMES[aiEvidence[key].source] || "note"})` : ""}
          </span>
          <Button variant="link" size="flush" onClick={() => takeSuggestion(key)}>
            Use this
          </Button>
          <Button variant="link" size="flush" onClick={() => dropSuggestion(key)}>
            Keep mine
          </Button>
        </span>
      );
    }
    if (status === "edited") return `AI wrote: "${aiOriginal[key]}"`;
    if (aiStale.has(key)) return "From an earlier fill. No source has it now, so check it or clear it.";
    return sourceLine(key) || "No matching words in the source. Check this by hand.";
  };
  const aiKeys = aiOriginal ? Object.keys(aiOriginal) : [];
  const editedKeys = aiKeys.filter((k) => statusOf(k) === "edited");
  const unclearCount = [...new Set([...aiKeys, ...aiToCheck])].filter((k) => statusOf(k) === "unclear").length;
  const differCount = Object.keys(aiSuggestions).filter((k) => suggestionFor(k) !== null).length;
  const borderFor = (key) => AI_TAGS[statusOf(key)]?.border || "";
  const label = (text, key) => (
    <>
      {text}
      <AiTag status={statusOf(key)} />
    </>
  );
  const field = (text, key) => ({ label: label(text, key), hint: evidenceFor(key) });

  const set = (key) => (e) => {
    own(key);
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };
  // Each control is named after its field, so a failed check can move focus to it.
  const text = (key, props) => (
    <Input type="text" name={key} value={form[key] ?? ""} onChange={set(key)} className={borderFor(key)} {...props} />
  );
  // A cleared value shows as "Choose…", not as the first option, which would not be what's saved.
  const select = (key, options, prompt) => (
    <Select name={key} value={form[key] ?? ""} onChange={set(key)} className={borderFor(key)}>
      {!options.includes(form[key]) && (
        <option value="" disabled>
          {prompt}
        </option>
      )}
      {options.map((option) => (
        <option key={option} value={option}>
          {shortOption(option)}
        </option>
      ))}
    </Select>
  );

  // Puts values on the form by the same keys as aiOriginal.
  const applyValues = (values) => {
    const formValues = {};
    const vitalValues = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === "patientType") setPatientType(value);
      else if (key === "interpreterNeeded") setInterpreterNeeded(value === "yes");
      else if (key === "hasTransport") setHasTransport(value === "yes");
      else if (key.startsWith("vital:")) vitalValues[key.slice(6)] = value;
      else formValues[key] = value;
    }
    setForm((prev) => ({ ...prev, ...formValues }));
    setVitals((prev) => ({ ...prev, ...vitalValues }));
  };

  // Each fill folds every source into the form: empty fields are filled, and what the clinician
  // typed is kept, with any different AI reading offered beside it.
  const applyDraft = (draft, kinds) => {
    const { values, original, suggestions, stale } = mergeDraft({
      current,
      draft,
      // The AI never chooses the hospital: a hospital it read is only offered beside the one set.
      userKeys: new Set([...userKeys.current, "receivingFacility"]),
      aiOriginal: aiOriginal || {},
      sampleKeys: SAMPLE_KEYS,
    });
    applyValues(values);
    // Never a default: the clinician decides how urgent this is. A choice they made stays.
    if (!userKeys.current.has("priority")) setPriority(null);
    setAiOriginal(original);
    setAiSuggestions(suggestions);
    setAiUnclear(new Set(draft.unclear || []));
    setAiStale(new Set(stale));
    setAiToCheck(new Set(CHECK_KEYS.filter((k) => !userKeys.current.has(k) && !(k in original))));
    setAiSources(kinds);
    const evidence = draft.evidence || {};
    // A field this fill wrote takes this fill's words or none, and a kept value's words may be
    // from a source since removed, so neither keeps an old quote.
    const replaced = new Set([...Object.keys(values), ...stale]);
    setAiEvidence((prev) => ({
      ...Object.fromEntries(Object.entries(prev).filter(([k]) => !replaced.has(k))),
      ...evidence,
    }));
    setAiUnsourced(
      (prev) => new Set([...[...prev].filter((k) => !replaced.has(k) && !evidence[k]), ...(draft.unsourced || [])]),
    );
    setAiChecked(false);
  };

  const takeSuggestion = (key) => {
    const value = aiSuggestions[key];
    applyValues({ [key]: value });
    userKeys.current.delete(key);
    setAiOriginal((prev) => ({ ...prev, [key]: value }));
    setAiSuggestions(({ [key]: _taken, ...rest }) => rest);
  };
  const dropSuggestion = (key) => setAiSuggestions(({ [key]: _dropped, ...rest }) => rest);

  const changePatientType = (next) => {
    own("patientType");
    const from = SAMPLES[patientType];
    const to = SAMPLES[next];
    // Only a field still holding the sample. One typed, picked from a list or filled by the
    // AI can equal a sample value, and stays as it is.
    const touched = new Set([...userKeys.current, ...Object.keys(aiOriginal || {})]);
    setForm((prev) => {
      const updated = { ...prev };
      Object.keys(from).forEach((key) => {
        const untouched = !touched.has(key);
        if (untouched && prev[key] === from[key]) updated[key] = to[key];
      });
      return updated;
    });
    setPatientType(next);
  };

  const typeVitals = patientType === PatientType.CHILD ? NEONATAL_VITALS : MATERNAL_VITALS;
  // Also any other vital the AI read, or that was typed before the patient type changed, so a
  // filled-in value is never hidden or dropped on save (a mother's pulse, a baby's weight).
  const vitalFields = [
    ...typeVitals,
    ...ALL_VITALS.filter(
      ({ key }) =>
        !typeVitals.some((v) => v.key === key) && (vitals[key]?.trim() || (aiOriginal && `vital:${key}` in aiOriginal)),
    ),
  ];
  const reasons = patientType === PatientType.CHILD ? REASONS.child : REASONS.maternal;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitted || submitting.current) return;

    const name = form.patientName.trim();
    const destination = form.receivingFacility;
    // A phone field holding only a name gives the family no number to call.
    const problems = [
      [!priority, "priority", "urgency (how soon)"],
      [aiUsed && !aiChecked, "aiChecked", "confirmation that you checked the AI-filled fields"],
      [!name, "patientName", "patient name"],
      [!form.indication.trim(), "indication", "reason for referral"],
      [!destinations.includes(destination), "receivingFacility", "hospital"],
      [!DEPARTMENTS.includes(form.targetDepartment), "targetDepartment", "unit"],
      [!LANGUAGES.includes(form.language), "language", "language"],
      [form.phone.trim() && !telHref(form.phone), "phone", "phone number (at least 7 digits)"],
      [form.emergencyContact.trim() && !telHref(form.emergencyContact), "emergencyContact", "emergency contact number"],
    ].filter(([bad]) => bad);
    setPriorityError(!priority);
    if (problems.length > 0) {
      showToast(`Please enter the ${problems.map(([, , what]) => what).join(", ")} before sending.`, "error");
      // A radio group comes back as a list of its radios: focus the first, which is inside the group.
      const target = e.target.elements.namedItem(problems[0][1]);
      (target?.tagName ? target : target?.[0])?.focus?.();
      return;
    }
    submitting.current = true;

    const now = sentAt();
    // Skip any number already taken, so a new case never shares an ID with an old one.
    let number = 8820 + referrals.length + 1;
    while (referrals.some((r) => r.id === `REF-2024-${number}`)) number += 1;
    const newId = `REF-2024-${number}`;
    const recordedVitals = Object.fromEntries(
      vitalFields.filter(({ key }) => vitals[key]?.trim()).map(({ key }) => [key, vitals[key].trim()]),
    );
    const clinician = activeFacility.directContact || activeFacility.name;

    addReferral({
      id: newId,
      patientName: name,
      patientId: form.mrn,
      age: form.age.trim() || undefined,
      gestationalAge: form.gestationalAge,
      parity: patientType === PatientType.CHILD ? "Newborn" : form.obstetricHistory.trim().split(" ")[0] || undefined,
      referralType: patientType,
      priority,
      status: ReferralStatus.SENT,
      fromFacility: activeFacility.name,
      fromClinician: activeFacility.directContact,
      toFacility: destination,
      department: form.targetDepartment,
      reason: form.indication,
      caregiverContact: form.emergencyContact,
      patientPhone: form.phone,
      patientAddress: form.address,
      language: form.language,
      interpreterNeeded,
      transitBarrier: !hasTransport,
      createdAt: now,
      vitals: recordedVitals,
      ...(aiUsed && {
        // Given an audit trail, the model skips its default, so the creation entry is added here too.
        auditTrail: [
          createAuditEvent({
            actor: clinician,
            role: AuditRole.REFERRING_CLINICIAN,
            action: "REFERRAL_CREATED",
            details: `Referral initiated for ${name} (${priority} Acuity).`,
            timestamp: now,
          }),
          createAuditEvent({
            actor: clinician,
            role: AuditRole.REFERRING_CLINICIAN,
            action: "AI_DRAFT_CHECKED",
            details: `Form drafted by AI from ${aiSources.map((k) => SOURCE_NAMES[k]).join(", ") || "a note"}: ${aiKeys.length} fields filled, ${editedKeys.length} changed by the clinician${editedKeys.length ? ` (${editedKeys.map((k) => FIELD_NAMES[k.replace(/^vital:/, "")] || k).join(", ")})` : ""}. The clinician set the priority and checked every field.`,
            timestamp: now,
          }),
        ],
      }),
      timeline: [
        {
          status: ReferralStatus.CREATED,
          date: now,
          notes: "Digital referral generated via Navexa Care Pathway Initiation channel.",
        },
        {
          status: ReferralStatus.SENT,
          date: now,
          notes: `Transmitted electronically to ${form.receivingFacility}. Intake reserve protocol engaged.`,
        },
      ],
    });
    setActiveReferralId(newId);
    setIsSubmitted(true);
    // Open the case at once; it confirms the referral went out, so nobody waits on a timer.
    navigate(`/referral/${newId}`, { state: { sentTo: form.receivingFacility } });
  };

  return (
    <Page width="full">
      <Toast toast={toast} />

      <PageHeader
        title="New referral"
        subtitle={`From ${activeFacility.name}`}
        actions={
          <Button as={Link} to="/facility" variant="link" size="flush">
            Back to intake
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] gap-4 items-start">
        <ReferralDraftCard
          className="sm:!p-5 lg:sticky lg:top-[calc(var(--size-header)+1rem)]"
          highlight={focusKey && statusOf(focusKey) !== "edited" ? aiEvidence[focusKey] : null}
          options={{ hospitals: destinations, departments: DEPARTMENTS, languages: LANGUAGES }}
          onDraft={applyDraft}
        />

        {/* The field being checked lights up its source words in the panel beside it. */}
        <form ref={formRef} onSubmit={handleSubmit} className="min-w-0">
          <Card className="space-y-3 sm:!p-5">
            {aiUsed && (
              <div
                role="status"
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-muted px-3 py-2 text-sm text-ink"
              >
                <span className="font-semibold">AI filled {aiKeys.length} fields.</span>
                <span className="inline-flex items-center">
                  <AiTag status="ai" />
                  <span className="ml-1">check</span>
                </span>
                {unclearCount > 0 && (
                  <span className="inline-flex items-center">
                    <AiTag status="unclear" />
                    <span className="ml-1">{unclearCount} hard to read or hear</span>
                  </span>
                )}
                <span className="inline-flex items-center">
                  <AiTag status="edited" />
                  <span className="ml-1">{editedKeys.length} changed by you</span>
                </span>
                {differCount > 0 && (
                  <span className="inline-flex items-center">
                    <AiTag status="differs" />
                    <span className="ml-1">{differCount} kept as you typed</span>
                  </span>
                )}
                {NON_TEXT_KEYS.filter((k) => suggestionFor(k) !== null).map((k) => (
                  <span key={k} className="flex w-full flex-wrap items-center gap-x-3">
                    <span>
                      AI read: <strong>{suggestionText(k, suggestionFor(k))}</strong>
                    </span>
                    <Button variant="link" size="flush" onClick={() => takeSuggestion(k)}>
                      Use this
                    </Button>
                    <Button variant="link" size="flush" onClick={() => dropSuggestion(k)}>
                      Keep mine
                    </Button>
                  </span>
                ))}
              </div>
            )}

            <Section title="Patient">
              <Choice
                {...field("Patient type", "patientType")}
                options={TYPES}
                value={patientType}
                onChange={changePatientType}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-2">
                <Field {...field("Name", "patientName")} required>
                  {text("patientName", { required: true, autoComplete: "off" })}
                </Field>
                <Field {...field("Age", "age")}>{text("age", { list: `${listId}-age`, autoComplete: "off" })}</Field>
                <Field {...field("Gestational age", "gestationalAge")}>
                  {text("gestationalAge", { list: `${listId}-gestationalAge`, autoComplete: "off" })}
                </Field>
                <Field
                  {...field(
                    patientType === PatientType.CHILD ? "Birth history" : "Obstetric history",
                    "obstetricHistory",
                  )}
                >
                  {text("obstetricHistory", { list: `${listId}-history`, autoComplete: "off" })}
                </Field>
              </div>
              <datalist id={`${listId}-age`}>
                {(patientType === PatientType.CHILD ? SUGGESTIONS.ageChild : SUGGESTIONS.age).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </datalist>
              <datalist id={`${listId}-gestationalAge`}>
                {SUGGESTIONS.gestationalAge.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </datalist>
              <datalist id={`${listId}-history`}>
                {(patientType === PatientType.CHILD ? SUGGESTIONS.birthHistory : SUGGESTIONS.obstetricHistory).map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </datalist>
            </Section>

            <Section title="Clinical">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-2">
                <div className="sm:col-span-2">
                  <Choice
                    grid
                    label="How soon? (required)"
                    name="priority"
                    options={URGENCY}
                    value={priority}
                    error={priorityError && !priority ? "Choose how soon the patient must be seen." : undefined}
                    onChange={(next) => {
                      own("priority");
                      setPriority(next);
                      setPriorityError(false);
                    }}
                  />
                  {aiUsed && !priority && (
                    <p className="mt-1 text-sm font-semibold text-ink">You choose this. The AI never sets it.</p>
                  )}
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <Field {...field("Reason for referral", "indication")} required>
                    <Textarea
                      rows={4}
                      required
                      name="indication"
                      value={form.indication}
                      onChange={set("indication")}
                      className={`resize-y ${borderFor("indication")}`}
                    />
                  </Field>
                </div>
                <div
                  className="sm:col-span-2 xl:col-span-4 flex flex-wrap items-center gap-x-2 gap-y-1"
                  role="group"
                  aria-label="Add a common reason"
                >
                  <span className="text-sm font-semibold text-ink">Add:</span>
                  {reasons.map((reason) => {
                    const added = form.indication.toLowerCase().includes(reason.toLowerCase());
                    return (
                      <Button
                        key={reason}
                        size="sm"
                        disabled={added}
                        aria-label={added ? `${reason}, already in the reason` : `Add ${reason} to the reason`}
                        onClick={() => {
                          own("indication");
                          setForm((prev) => ({ ...prev, indication: addReason(prev.indication, reason) }));
                        }}
                        className="!px-3 !gap-1 disabled:opacity-100 disabled:bg-subtle disabled:cursor-default"
                      >
                        {added ? <Icon name="check" size="sm" /> : <Icon name="add" size="sm" />}
                        {reason}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-2">
                {vitalFields.map(({ key, label: vitalLabel, placeholder, inputMode, suggestions, format }) => (
                  <Field key={key} {...field(vitalLabel, `vital:${key}`)}>
                    <Input
                      type="text"
                      name={`vital:${key}`}
                      value={vitals[key] || ""}
                      placeholder={placeholder}
                      inputMode={inputMode}
                      autoComplete="off"
                      list={suggestions ? `${listId}-vital-${key}` : undefined}
                      onChange={(e) => {
                        own(`vital:${key}`);
                        setVitals((prev) => ({ ...prev, [key]: e.target.value }));
                      }}
                      onBlur={
                        format === "bp"
                          ? (e) => {
                              const value = formatBp(e.target.value);
                              setVitals((prev) => ({ ...prev, [key]: value }));
                            }
                          : undefined
                      }
                      className={borderFor(`vital:${key}`)}
                    />
                    {suggestions && (
                      <datalist id={`${listId}-vital-${key}`}>
                        {suggestions.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </datalist>
                    )}
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="Getting there">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-2">
                <Field {...field("Send to", "receivingFacility")}>
                  {select("receivingFacility", destinations, "Choose a hospital")}
                </Field>
                <Field {...field("Unit", "targetDepartment")}>
                  {select("targetDepartment", DEPARTMENTS, "Choose a unit")}
                </Field>
                <label className="flex items-center gap-2 min-h-control self-end text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hasTransport}
                    onChange={(e) => {
                      own("hasTransport");
                      setHasTransport(!e.target.checked);
                    }}
                    className="accent-control w-5 h-5"
                  />
                  Needs transport
                  <AiTag status={statusOf("hasTransport")} />
                </label>
                <label className="flex items-center gap-2 min-h-control self-end text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interpreterNeeded}
                    onChange={(e) => {
                      own("interpreterNeeded");
                      setInterpreterNeeded(e.target.checked);
                    }}
                    className="accent-control w-5 h-5"
                  />
                  Needs interpreter
                  <AiTag status={statusOf("interpreterNeeded")} />
                </label>
              </div>
            </Section>

            <Section title="Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-2">
                <Field {...field("Phone", "phone")}>
                  {text("phone", { type: "tel", inputMode: "tel", autoComplete: "off" })}
                </Field>
                <Field {...field("Emergency contact", "emergencyContact")} className="xl:col-span-2">
                  {text("emergencyContact", { autoComplete: "off" })}
                </Field>
                <Field {...field("Language", "language")}>{select("language", LANGUAGES, "Choose a language")}</Field>
                <Field {...field("Address", "address")} className="sm:col-span-2 xl:col-span-3">
                  {text("address")}
                </Field>
                <Field label="Record number (MRN)">{text("mrn")}</Field>
              </div>
            </Section>

            <div className="flex flex-col xl:flex-row xl:items-center gap-3 border-t border-line pt-3">
              {aiUsed ? (
                <label className="flex flex-1 items-start gap-3 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    name="aiChecked"
                    checked={aiChecked}
                    onChange={(e) => setAiChecked(e.target.checked)}
                    className="accent-control w-5 h-5 mt-0.5 shrink-0"
                  />
                  <span>
                    <strong>I've checked every field the AI filled</strong> against its source, and chose how soon
                    myself.
                  </span>
                </label>
              ) : (
                <p className="flex-1 text-xs text-ink-muted">
                  For an emergency, also phone the hospital. This form does not replace a verbal handover.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button as={Link} to="/facility">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1 sm:flex-none" disabled={isSubmitted}>
                  Send referral
                  <span className="sr-only">(Ctrl or Cmd + Enter)</span>
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </Page>
  );
};

export default CreateReferral;
