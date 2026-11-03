import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, Card, Field, Input, Page, PageHeader, Select, Textarea } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext";
import { PATIENT_TYPE_LABELS, PatientType, ReferralStatus, UrgencyLevel } from "../domain/enums.js";
import { getReferralDestinations } from "../domain/hospitalChoice.js";

const MATERNAL_VITALS = [
  { key: "bp", label: "Blood pressure", placeholder: "128/82" },
  { key: "fhr", label: "Fetal heart rate (bpm)", placeholder: "142" },
  { key: "urine", label: "Urine protein", placeholder: "+1 Protein" },
  { key: "bpp", label: "Biophysical profile", placeholder: "8/8" },
];
const NEONATAL_VITALS = [
  { key: "tsb", label: "Bilirubin", placeholder: "18.4 mg/dL" },
  { key: "weight", label: "Weight", placeholder: "2,980g" },
  { key: "temp", label: "Temperature", placeholder: "36.8 °C" },
  { key: "hr", label: "Heart rate", placeholder: "138 bpm" },
];

// Sample values for the demo. Switching patient type swaps only the fields still holding a sample.
const MATERNAL_SAMPLE = {
  patientName: "Fathima Begum, 29 yrs",
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
    patientName: "Baby of Fathima Begum, 3 Days Old",
    gestationalAge: "38 Weeks, 5 Days",
    obstetricHistory: "Term vaginal delivery",
    indication:
      "Newborn with progressive jaundice and poor feeding at 3 days of life. Requires prompt evaluation for intensive phototherapy.",
    targetDepartment: "Neonatal ICU / Phototherapy Unit",
  },
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

const Choice = ({ options, value, onChange, label }) => {
  const name = useId();
  return (
    <fieldset className="space-y-1">
      <legend className="block text-sm font-semibold text-ink mb-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
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
            <span className="block min-h-control px-4 py-2 rounded-control border text-sm font-semibold transition-colors duration-fast bg-surface text-ink border-line-strong hover:border-accent peer-checked:bg-brand peer-checked:text-on-fill peer-checked:border-brand peer-focus-visible:outline peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              {text}
              {hint && <span className="block text-xs font-normal">{hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

const Details = ({ summary, children }) => (
  <details className="rounded-card bg-muted px-4 py-3">
    <summary className="cursor-pointer text-sm font-semibold text-ink">{summary}</summary>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">{children}</div>
  </details>
);

const CreateReferral = () => {
  const navigate = useNavigate();
  const { referrals, facilities, activeFacility, addReferral, setActiveReferralId } = useReferrals();
  const destinations = getReferralDestinations(facilities, activeFacility.name);
  const { toast, showToast } = useToast();

  const [isSubmitted, setIsSubmitted] = useState(false);
  // Leaving the page first must cancel the jump to the new case.
  const openCaseTimer = useRef(null);
  useEffect(() => () => clearTimeout(openCaseTimer.current), []);
  const [patientType, setPatientType] = useState(PatientType.MATERNAL);
  const [priority, setPriority] = useState(UrgencyLevel.URGENT);
  const [hasTransport, setHasTransport] = useState(false);
  const [interpreterNeeded, setInterpreterNeeded] = useState(true);
  const [vitals, setVitals] = useState({ bp: "128/82", fhr: "142" });
  const [form, setForm] = useState(() => ({
    ...MATERNAL_SAMPLE,
    mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    phone: "+91 90000 29012",
    emergencyContact: "Tariq Ahmed (Spouse) - +91 90000 29014",
    language: "Urdu",
    address: "42, 3rd Cross, Frazer Town, Bengaluru 560005",
    receivingFacility: destinations[0],
  }));

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const text = (key, props) => <Input type="text" value={form[key]} onChange={set(key)} {...props} />;
  const select = (key, options) => (
    <Select value={form[key]} onChange={set(key)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {shortOption(option)}
        </option>
      ))}
    </Select>
  );

  const changePatientType = (next) => {
    const from = SAMPLES[patientType];
    const to = SAMPLES[next];
    setForm((prev) => {
      const updated = { ...prev };
      Object.keys(from).forEach((key) => {
        if (prev[key] === from[key]) updated[key] = to[key];
      });
      return updated;
    });
    setPatientType(next);
  };

  const vitalFields = patientType === PatientType.CHILD ? NEONATAL_VITALS : MATERNAL_VITALS;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitted) return;

    const [namePart, ...ageParts] = form.patientName.split(",");
    const name = namePart.trim();
    const destination = form.receivingFacility;
    const missing = [
      !name && "patient name",
      !form.indication.trim() && "reason for referral",
      !destination && "hospital",
    ].filter(Boolean);
    if (missing.length > 0) {
      showToast(`Please enter the ${missing.join(", ")} before sending.`, "error");
      [...e.target.querySelectorAll("[required]")].find((field) => !field.value.trim())?.focus();
      return;
    }

    const now = new Date().toISOString();
    const newId = `REF-2024-${String(8820 + referrals.length + 1)}`;
    const recordedVitals = Object.fromEntries(
      vitalFields.filter(({ key }) => vitals[key]?.trim()).map(({ key }) => [key, vitals[key].trim()]),
    );

    addReferral({
      id: newId,
      patientName: name,
      patientId: form.mrn,
      age: ageParts.join(",").trim() || undefined,
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
    showToast(`Referral #${newId} sent. Opening case...`);
    openCaseTimer.current = setTimeout(() => navigate(`/referral/${newId}`), 1200);
  };

  return (
    <Page width="md">
      <Toast toast={toast} />

      <div className="space-y-1">
        <Button as={Link} to="/facility" variant="link" size="flush">
          Back to intake
        </Button>
        <PageHeader title="New referral" subtitle={`From ${activeFacility.name}`} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card as="section" title="Patient" className="space-y-4">
          <Choice label="Patient type" options={TYPES} value={patientType} onChange={changePatientType} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name, age" required>
              {text("patientName", { required: true })}
            </Field>
            <Field label="Gestational age">{text("gestationalAge")}</Field>
          </div>
          <Details summary="More patient details">
            <Field label="Record number (MRN)">{text("mrn")}</Field>
            <Field label={patientType === PatientType.CHILD ? "Birth history" : "Obstetric history"}>
              {text("obstetricHistory")}
            </Field>
            <Field label="Phone">{text("phone")}</Field>
            <Field label="Emergency contact">{text("emergencyContact")}</Field>
            <Field label="Address" className="sm:col-span-2">
              {text("address")}
            </Field>
          </Details>
        </Card>

        <Card as="section" title="Clinical" className="space-y-4">
          <Choice label="How soon?" options={URGENCY} value={priority} onChange={setPriority} />
          <Field label="Reason for referral" required>
            <Textarea rows={4} required value={form.indication} onChange={set("indication")} className="resize-y" />
          </Field>
          <Details summary="Vitals">
            {vitalFields.map(({ key, label, placeholder }) => (
              <Field key={key} label={label}>
                <Input
                  type="text"
                  value={vitals[key] || ""}
                  placeholder={placeholder}
                  onChange={(e) => setVitals((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </Field>
            ))}
          </Details>
        </Card>

        <Card as="section" title="Hospital" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Send to">{select("receivingFacility", destinations)}</Field>
            <Field label="Unit">{select("targetDepartment", DEPARTMENTS)}</Field>
          </div>
        </Card>

        <Card as="section" title="Support needs" className="space-y-4">
          <Choice
            label="Safe transport available?"
            options={[
              ["yes", "Yes"],
              ["no", "No, needs help"],
            ]}
            value={hasTransport ? "yes" : "no"}
            onChange={(id) => setHasTransport(id === "yes")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <Field label="Language">{select("language", LANGUAGES)}</Field>
            <label className="flex items-center gap-2 min-h-control text-sm font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={interpreterNeeded}
                onChange={(e) => setInterpreterNeeded(e.target.checked)}
                className="accent-control w-5 h-5"
              />
              Needs an interpreter
            </label>
          </div>
        </Card>

        <div className="flex sm:justify-end gap-2">
          <Button as={Link} to="/facility">
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1 sm:flex-none" disabled={isSubmitted}>
            Send referral
          </Button>
        </div>
        <p className="text-xs text-ink-muted">
          For an emergency, also phone the hospital. This form does not replace a verbal handover.
        </p>
      </form>
    </Page>
  );
};

export default CreateReferral;
