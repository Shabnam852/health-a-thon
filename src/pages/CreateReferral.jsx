import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext";
import { PatientType, ReferralStatus } from "../domain/enums.js";
import Toast, { useToast } from "../components/Toast.jsx";

// The vitals each chart displays. A dyad uses the maternal chart.
const MATERNAL_VITALS = [
  { key: "bp", label: "Blood Pressure", placeholder: "e.g. 128/82" },
  { key: "fhr", label: "Fetal Heart Rate (bpm)", placeholder: "e.g. 142" },
  { key: "urine", label: "Urine Protein", placeholder: "e.g. +1 Protein" },
  { key: "bpp", label: "Biophysical Profile", placeholder: "e.g. 8/8" },
];
const NEONATAL_VITALS = [
  { key: "tsb", label: "Total Bilirubin", placeholder: "e.g. 18.4 mg/dL" },
  { key: "weight", label: "Weight", placeholder: "e.g. 2,980g" },
  { key: "temp", label: "Temperature", placeholder: "e.g. 36.8 °C" },
  { key: "hr", label: "Heart Rate", placeholder: "e.g. 138 bpm" },
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
    indication: "Newborn with progressive jaundice and poor feeding at 3 days of life. Requires prompt evaluation for intensive phototherapy.",
    targetDepartment: "Neonatal ICU / Phototherapy Unit",
  },
};

const LANGUAGES = ["Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Urdu", "Bengali", "Bhojpuri", "English"];

const STEPS = [
  { step: 1, title: "Patient & Clinical Context" },
  { step: 2, title: "Receiving Facility & Service" },
  { step: 3, title: "Social & Logistics Check" },
  { step: 4, title: "Handover & Dispatch" },
];

// Standard gestational age bands; nothing is shown if the weeks cannot be read.
const gestationBand = (text) => {
  const weeks = parseInt(text, 10);
  if (!weeks) return null;
  if (weeks < 34) return "Preterm";
  if (weeks < 37) return "Late Preterm";
  if (weeks < 39) return "Early Term";
  if (weeks < 41) return "Term";
  return "Late Term";
};

const CreateReferral = () => {
  const navigate = useNavigate();
  const { referrals, addReferral, setActiveReferralId } = useReferrals();

  const [activeStep, setActiveStep] = useState(1);
  const [patientType, setPatientType] = useState(PatientType.MATERNAL);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [priorityLevel, setPriorityLevel] = useState("URGENT");
  const [hasTransport, setHasTransport] = useState(false);
  const [interpreterNeeded, setInterpreterNeeded] = useState(true);

  // Form Fields
  const [mrn, setMrn] = useState(`MRN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [patientName, setPatientName] = useState(MATERNAL_SAMPLE.patientName);
  const [gestationalAge, setGestationalAge] = useState(MATERNAL_SAMPLE.gestationalAge);
  const [obstetricHistory, setObstetricHistory] = useState(MATERNAL_SAMPLE.obstetricHistory);
  const [phone, setPhone] = useState("+91 90000 29012");
  const [emergencyContact, setEmergencyContact] = useState("Tariq Ahmed (Spouse) - +91 90000 29014");
  const [language, setLanguage] = useState("Urdu");
  const [address, setAddress] = useState("42, 3rd Cross, Frazer Town, Bengaluru 560005");
  const [indication, setIndication] = useState(MATERNAL_SAMPLE.indication);
  const [receivingFacility, setReceivingFacility] = useState(
    "Sanjeevani Regional Perinatal Centre (Level III Perinatal & NICU)"
  );
  const [targetDepartment, setTargetDepartment] = useState(MATERNAL_SAMPLE.targetDepartment);

  const [vitals, setVitals] = useState({ bp: "128/82", fhr: "142" });
  const vitalFields = patientType === PatientType.CHILD ? NEONATAL_VITALS : MATERNAL_VITALS;
  const recordedVitals = Object.fromEntries(
    vitalFields.filter(({ key }) => vitals[key]?.trim()).map(({ key }) => [key, vitals[key].trim()])
  );

  const { toast, showToast } = useToast();

  const band = gestationBand(gestationalAge);

  const changePatientType = (next) => {
    const from = SAMPLES[patientType];
    const to = SAMPLES[next];
    if (patientName === from.patientName) setPatientName(to.patientName);
    if (gestationalAge === from.gestationalAge) setGestationalAge(to.gestationalAge);
    if (obstetricHistory === from.obstetricHistory) setObstetricHistory(to.obstetricHistory);
    if (indication === from.indication) setIndication(to.indication);
    if (targetDepartment === from.targetDepartment) setTargetDepartment(to.targetDepartment);
    setPatientType(next);
  };

  // Clicking a step jumps to its section; scrolling keeps the highlighted step in step.
  const goToStep = (step) => {
    setActiveStep(step);
    document.getElementById(`step-${step}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveStep(Number(visible.target.id.replace("step-", "")));
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    STEPS.forEach(({ step }) => {
      const section = document.getElementById(`step-${step}`);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  const generateReferralId = () => {
    return `REF-2024-${String(8820 + referrals.length + 1)}`;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isSubmitted) return;

    const [namePart, ...ageParts] = patientName.split(",");
    const name = namePart.trim();
    const destination = receivingFacility.split("(")[0].trim();
    const missing = [
      !name && "patient name",
      !indication.trim() && "clinical indication",
      !destination && "receiving facility",
    ].filter(Boolean);
    if (missing.length > 0) {
      showToast(`Please enter the ${missing.join(", ")} before submitting.`, "error");
      return;
    }

    const now = new Date().toISOString();
    const newId = generateReferralId();
    const fromClinician = "Dr. Kavitha Rao, MS (OBG)";

    addReferral({
      id: newId,
      patientName: name,
      patientId: mrn,
      age: ageParts.join(",").trim() || undefined,
      gestationalAge,
      parity: patientType === PatientType.CHILD ? "Newborn" : obstetricHistory.trim().split(" ")[0] || undefined,
      referralType: patientType,
      priority: priorityLevel,
      status: ReferralStatus.SENT,
      fromFacility: "Kaveri Midwifery & Birth Clinic",
      fromClinician,
      toFacility: destination,
      department: targetDepartment,
      reason: indication,
      caregiverContact: emergencyContact,
      patientPhone: phone,
      patientAddress: address,
      language,
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
          notes: `Transmitted electronically to ${receivingFacility}. Intake reserve protocol engaged.`,
        },
      ],
    });
    setActiveReferralId(newId);
    setIsSubmitted(true);
    showToast(`Referral #${newId} submitted! Navigating to case tracking...`);

    setTimeout(() => {
      navigate(`/referral/${newId}`);
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      <Toast toast={toast} />

      {/* Top Progress & Context Navigation Banner */}
      <div className="px-gutter-md py-space-md bg-surface-container-lowest shadow-sm border-b border-surface-container/60">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-space-sm">
          {/* Breadcrumb and Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2">
              <Link
                to="/coordinator"
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
              >
                Referrals
              </Link>
              <span className="material-symbols-outlined text-[14px] text-outline">
                chevron_right
              </span>
              <span className="font-label-md text-label-md text-primary font-semibold">
                Create New Maternal or Neonatal Referral
              </span>
            </div>

            <div className="flex items-center gap-space-sm">
              <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container font-data-tabular text-data-tabular text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified_user</span>
                Demonstration Environment • Synthetic PHI
              </span>
            </div>
          </div>

          {/* Linear Stepper Bar */}
          <div className="pt-space-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
              {STEPS.map(({ step, title }) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => goToStep(step)}
                  aria-current={activeStep === step ? "step" : undefined}
                  className={`flex items-center gap-space-sm p-space-sm rounded-lg text-left transition-all ${
                    activeStep === step
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <div
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                      activeStep === step
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {step}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm font-bold truncate tracking-wide uppercase">
                      Step {step}
                    </span>
                    <span className="font-title-sm text-body-sm">{title}</span>
                  </div>
                  {activeStep === step && (
                    <span className="material-symbols-outlined text-[18px] ml-auto text-secondary-fixed">
                      arrow_forward
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Working Workspace Canvas */}
      <div className="p-gutter-md max-w-[1600px] mx-auto w-full space-y-gutter-md">
        {/* Top Action Card */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container/60">
          <div className="flex items-center gap-space-sm">
            <div className="p-2 rounded-lg bg-secondary-fixed/50 text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">medical_services</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md text-primary font-bold">
                New Maternal-Fetal Care Pathway Initiation
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Authorized Level II/III perinatal coordination channel. Syncs immediately with Regional Navigation Grid.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm w-full md:w-auto justify-end">
            <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              Regional Care Grid • Active Protocol
            </span>
          </div>
        </div>

        {/* Main Grid Form Layout */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-md items-start">
          {/* Left Column: Form Authoring (8 cols) */}
          <div className="lg:col-span-8 space-y-gutter-md">
            {/* SECTION A: Patient Identification */}
            <div id="step-1" className="scroll-mt-24 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-md">
                    A
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      Patient Identification & Maternal / Neonatal Context
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Core demographic records, obstetric parity, and communication flags
                    </p>
                  </div>
                </div>
                <span className="px-space-sm py-0.5 rounded-full bg-surface-container text-on-primary-container font-label-sm text-label-sm font-semibold">
                  Verified Profile
                </span>
              </div>

              {/* Patient Type Segmented Selector */}
              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface-variant block font-medium">
                  Patient Classification
                </label>
                <div className="grid grid-cols-3 gap-space-sm p-1 rounded-xl bg-surface-container-low">
                  <button
                    type="button"
                    onClick={() => changePatientType("Maternal")}
                    className={`py-2 px-space-sm rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all ${
                      patientType === "Maternal"
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      pregnant_woman
                    </span>
                    <span>Maternal Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changePatientType(PatientType.CHILD)}
                    className={`py-2 px-space-sm rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all ${
                      patientType === PatientType.CHILD
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      child_care
                    </span>
                    <span>Neonate / Infant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changePatientType("Dyad")}
                    className={`py-2 px-space-sm rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all ${
                      patientType === "Dyad"
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      family_restroom
                    </span>
                    <span>Mother & Baby Dyad</span>
                  </button>
                </div>
              </div>

              {/* Patient MRN and Legal Identification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                    Medical Record # (MRN)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={mrn}
                      onChange={(e) => setMrn(e.target.value)}
                      className="w-full bg-surface-container-low px-space-sm py-2 rounded-lg font-data-tabular text-data-tabular text-primary font-semibold focus:outline-none"
                    />
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[16px] text-secondary">
                      cloud_done
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                    Full Legal Name & Age
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-surface-container-low px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Gestational Age & Parity Metrics */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">
                      Gestational Age
                    </span>
                    <input
                      type="text"
                      value={gestationalAge}
                      onChange={(e) => setGestationalAge(e.target.value)}
                      className="w-full font-title-sm text-title-sm text-primary font-bold bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                  {band && (
                    <span className="shrink-0 whitespace-nowrap inline-flex items-center px-space-sm py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                      {band}
                    </span>
                  )}
                </div>

                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">
                      {patientType === PatientType.CHILD ? "Birth History" : "Obstetric History (G/P)"}
                    </span>
                    <input
                      type="text"
                      value={obstetricHistory}
                      onChange={(e) => setObstetricHistory(e.target.value)}
                      className="w-full font-title-sm text-title-sm text-primary font-bold bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                  <span className="material-symbols-outlined text-outline text-[20px]">
                    history_edu
                  </span>
                </div>
              </div>

              {/* Contact Channels */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                    Primary Patient Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-surface-container-low p-2 rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none shadow-sm"
                    />
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[16px] text-on-surface-variant">
                      call
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                    Secondary / Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full bg-surface-container-low p-2 rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Language & Cultural Accommodation */}
              <div className="p-space-md rounded-xl bg-surface-container-high/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary text-[24px]">
                    translate
                  </span>
                  <div>
                    <label className="font-title-sm text-body-sm text-primary font-semibold flex flex-wrap items-center gap-2">
                      <span>Language Preference:</span>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-surface-container-lowest rounded-md px-2 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-secondary/40"
                      >
                        {LANGUAGES.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {interpreterNeeded
                        ? `Requires Certified ${language} Medical Interpreter for all clinical discussions.`
                        : "No interpreter requested."}
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer bg-surface-container-lowest px-space-sm py-1.5 rounded-lg shadow-sm">
                  <input
                    type="checkbox"
                    checked={interpreterNeeded}
                    onChange={(e) => setInterpreterNeeded(e.target.checked)}
                    className="accent-secondary w-4 h-4 rounded"
                  />
                  <span className="font-label-md text-label-md font-semibold text-secondary">
                    Interpreter Requested
                  </span>
                </label>
              </div>

              {/* Address */}
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                  Primary Physical Residence
                </label>
                <div className="flex items-center gap-2 bg-surface-container-low px-space-sm py-2 rounded-lg">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    home_pin
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B: Clinical Urgency & Referral Reason */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-md">
                    B
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      Clinical Urgency & Referral Reason
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Triage classification, immediate telemetry parameters, and clinical indication
                    </p>
                  </div>
                </div>
                <span className="px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                  Triage: {priorityLevel}
                </span>
              </div>

              {/* Urgency Radio Grid */}
              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface-variant block font-medium">
                  Triage Priority Window
                </label>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-sm">
                  {/* Routine */}
                  <label
                    onClick={() => setPriorityLevel("ROUTINE")}
                    className={`p-space-sm rounded-xl transition cursor-pointer flex items-center gap-space-sm ${
                      priorityLevel === "ROUTINE"
                        ? "bg-secondary-fixed/30 shadow-sm border border-secondary"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority_level"
                      checked={priorityLevel === "ROUTINE"}
                      onChange={() => setPriorityLevel("ROUTINE")}
                      className="accent-primary"
                    />
                    <div>
                      <span className="font-label-md text-label-md font-bold text-on-surface block">
                        ROUTINE (Within 7-14 Days)
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Non-acute antenatal consultation or scan
                      </span>
                    </div>
                  </label>

                  {/* Priority */}
                  <label
                    onClick={() => setPriorityLevel("PRIORITY")}
                    className={`p-space-sm rounded-xl transition cursor-pointer flex items-center gap-space-sm ${
                      priorityLevel === "PRIORITY"
                        ? "bg-secondary-fixed/30 shadow-sm border border-secondary"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority_level"
                      checked={priorityLevel === "PRIORITY"}
                      onChange={() => setPriorityLevel("PRIORITY")}
                      className="accent-primary"
                    />
                    <div>
                      <span className="font-label-md text-label-md font-bold text-on-surface block">
                        PRIORITY (Within 48-72 Hours)
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Subacute maternal or fetal complication
                      </span>
                    </div>
                  </label>

                  {/* Urgent / Same Day */}
                  <label
                    onClick={() => setPriorityLevel("URGENT")}
                    className={`p-space-sm rounded-xl transition cursor-pointer flex items-center gap-space-sm ${
                      priorityLevel === "URGENT"
                        ? "bg-secondary-fixed/30 shadow-sm border border-secondary"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority_level"
                      checked={priorityLevel === "URGENT"}
                      onChange={() => setPriorityLevel("URGENT")}
                      className="accent-secondary"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-md text-label-md font-bold text-secondary">
                          URGENT / SAME DAY (Within 4-6 Hours)
                        </span>
                        <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant">
                        Active membrane rupture, unstable vitals, early labor
                      </span>
                    </div>
                  </label>

                  {/* STAT Emergency */}
                  <label
                    onClick={() => setPriorityLevel("STAT")}
                    className={`p-space-sm rounded-xl transition cursor-pointer flex items-center gap-space-sm ${
                      priorityLevel === "STAT"
                        ? "bg-error-container/50 shadow-sm border border-error"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority_level"
                      checked={priorityLevel === "STAT"}
                      onChange={() => setPriorityLevel("STAT")}
                      className="accent-error"
                    />
                    <div>
                      <span className="font-label-md text-label-md font-bold text-error block">
                        STAT / EMERGENCY (Ambulance 108)
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Immediate life/limb/fetal threat in transit
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Clinical Indication Textarea */}
              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface-variant block font-medium">
                  Primary Clinical Indication & Working Assessment
                </label>
                <div className="p-space-sm rounded-xl bg-surface-container-low border border-surface-container/60">
                  <textarea
                    rows={3}
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Point-of-Care Vitals */}
              <div className="space-y-space-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-3">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Point-of-Care Vitals
                  </span>
                  <span className="font-data-tabular text-data-tabular text-secondary font-semibold">
                    {Object.keys(recordedVitals).length} of {vitalFields.length} recorded
                  </span>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-sm">
                  {vitalFields.map(({ key, label, placeholder }) => (
                    <label key={key} className="p-space-sm rounded-lg bg-surface-container-low block min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">
                        {label}
                      </span>
                      <input
                        type="text"
                        value={vitals[key] || ""}
                        placeholder={placeholder}
                        onChange={(e) => setVitals((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full min-w-0 mt-1 bg-transparent font-title-sm text-title-sm font-bold text-primary placeholder:font-normal placeholder:text-on-surface-variant/70 focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>


              {/* Referring Clinician Block */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-label-sm">
                    EC
                  </div>
                  <div>
                    <p className="font-title-sm text-body-sm text-primary font-semibold">
                      Dr. Kavitha Rao, MS (OBG)
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Kaveri Midwifery & Birth Clinic • KMC Reg. No. 48201
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-medium">
                  <span className="material-symbols-outlined text-[16px]">verified</span> Clinician Authenticated
                </span>
              </div>
            </div>

            {/* SECTION C: Receiving Facility */}
            <div id="step-2" className="scroll-mt-24 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-md">
                    C
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      Receiving Facility & Service Selection
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Designated destination center, acute unit, and charge contact channel
                    </p>
                  </div>
                </div>
                <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                  Capacity Confirmed
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                    Receiving Facility
                  </label>
                  <div className="relative">
                    <select
                      value={receivingFacility}
                      onChange={(e) => setReceivingFacility(e.target.value)}
                      className="w-full bg-surface-container-low px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-primary font-semibold appearance-none focus:outline-none"
                    >
                      <option>Sanjeevani Regional Perinatal Centre (Level III Perinatal & NICU)</option>
                      <option>Vidyaranya Institute of Medical Sciences (Level IV Regional Centre)</option>
                      <option>Karuna Women & Children's Hospital (Level II Special Care)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[18px] text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                    Target Specialized Department
                  </label>
                  <div className="relative">
                    <select
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full bg-surface-container-low px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-primary font-semibold appearance-none focus:outline-none"
                    >
                      <option>Labor & Delivery Triage / High-Risk Antenatal Unit</option>
                      <option>Maternal-Fetal Medicine (MFM) Outpatient Suite</option>
                      <option>Antepartum Inpatient Monitoring Pod B</option>
                      <option>Neonatal ICU / Phototherapy Unit</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[18px] text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Hotline Callout */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    phone_in_talk
                  </span>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">
                      Direct OB Triage Receiving Hotline
                    </span>
                    <span className="font-title-sm text-body-sm text-primary font-bold">
                      Sanjeevani Charge Desk: +91 90000 03321 (Ext. 402)
                    </span>
                  </div>
                </div>
                <a
                  href="tel:+919000003321"
                  className="inline-flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container font-label-md text-label-md transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>Direct Dial</span>
                </a>
              </div>
            </div>

            {/* SECTION D: Transport & Anticipated Barrier Assessment */}
            <div id="step-3" className="scroll-mt-24 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center font-bold text-label-md">
                    D
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      Transport & Anticipated Barrier Assessment
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Flag logistics deficits early to prevent emergency delays or no-shows
                    </p>
                  </div>
                </div>
                <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                  Active Resolution
                </span>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low space-y-space-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div>
                    <p className="font-title-sm text-body-sm text-primary font-semibold">
                      Does patient have confirmed, safe transport to the receiving facility?
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Assess vehicle access, distance, family accompaniment, and safety during membrane rupture.
                    </p>
                  </div>
                  <div className="inline-flex p-1 rounded-lg bg-surface-container-lowest shadow-sm">
                    <button
                      type="button"
                      onClick={() => setHasTransport(true)}
                      className={`px-3 py-1 rounded font-label-sm text-label-sm font-bold transition-all ${
                        hasTransport
                          ? "bg-secondary text-on-secondary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasTransport(false)}
                      className={`px-3 py-1 rounded font-label-sm text-label-sm font-bold transition-all ${
                        !hasTransport
                          ? "bg-secondary text-on-secondary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                    >
                      NO - Assistance Needed
                    </button>
                  </div>
                </div>

                {!hasTransport && (
                  <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm flex items-start gap-space-sm border-l-4 border-l-error">
                    <span className="material-symbols-outlined text-error text-[20px] mt-0.5">
                      warning
                    </span>
                    <div className="flex-1">
                      <span className="font-label-sm text-label-sm font-bold text-error uppercase">
                        Identified Logistic Vulnerability
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                        Patient relies on public bus transit; unable to safely travel via bus in active labor with confirmed ruptured membranes (PPROM). Household lacks vehicle.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!hasTransport && (
                <div className="p-space-md rounded-xl bg-surface-container-high/80 space-y-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">
                      Automated Coordination Intervention
                    </span>
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      auto_fix_high
                    </span>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-sm">
                    <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          local_taxi
                        </span>
                        <span className="font-title-sm text-body-sm text-primary font-semibold">
                          Pre-Authorized MediRide
                        </span>
                      </div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        Free JSSK referral transport queued for immediate pickup at clinic.
                      </p>
                    </div>
                    <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          support_agent
                        </span>
                        <span className="font-title-sm text-body-sm text-primary font-semibold">
                          Care Navigator Assigned
                        </span>
                      </div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        Priya Raman, MSW (On-duty {language}/English bilingual maternal health navigator).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION E: Submission Safeguard */}
            <div id="step-4" className="scroll-mt-24 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
              <div className="p-space-md rounded-xl bg-error-container/20 flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-error text-[22px] flex-shrink-0 mt-0.5">
                  shield
                </span>
                <div>
                  <p className="font-title-sm text-body-sm text-on-error-container font-semibold">
                    Clinical Handover Safety Disclaimer
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed mt-0.5">
                    Submitting this digital referral automatically registers intake queues at the receiving facility and alerts the maternal navigation team. This system does NOT replace verbal telephone handover for patients requiring immediate life-saving resuscitation or STAT emergency 108 ambulance dispatch.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                <button
                  type="button"
                  onClick={() => showToast("Demo only: drafts are not saved.")}
                  className="w-full sm:w-auto px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">drafts</span>
                  <span>Save as Incomplete Draft</span>
                </button>
                <div className="flex flex-col sm:flex-row items-center gap-space-sm w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        `Summary Preview: ${patientName.split(",")[0].trim() || "No patient name"} (${gestationalAge}), ${receivingFacility.split("(")[0].trim()}, Priority: ${priorityLevel}.`
                      )
                    }
                    className="w-full sm:w-auto px-space-md py-2.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant font-label-md text-label-md transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">preview</span>
                    <span>Preview Clinical Summary</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitted}
                    className="w-full sm:w-auto px-space-lg py-2.5 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-md text-label-md font-semibold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">send_and_archive</span>
                    <span>Submit Referral & Dispatch Navigator</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Context Panels & Live Validation (4 cols) */}
          <div className="lg:col-span-4 space-y-gutter-md">
            {/* Live Referral Telemetry Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md border border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">
                  Referral Routing Overview
                </span>
                <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container font-data-tabular text-label-sm text-secondary font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  LIVE TIE
                </span>
              </div>

              {/* Transit Distance */}
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      directions_car
                    </span>
                    <span className="font-title-sm text-body-sm text-primary font-semibold">
                      Sample Transit Estimate (Demo)
                    </span>
                  </div>
                  <span className="font-data-tabular text-data-tabular font-bold text-primary">
                    18 Minutes
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: "72%" }}></div>
                </div>
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                  <span>Kaveri Clinic</span>
                  <span>12 km via Outer Ring Road</span>
                  <span>{receivingFacility.split("(")[0].trim()}</span>
                </div>
              </div>

              {/* Destination Capabilities */}
              <div className="space-y-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant block font-medium">
                  Destination Capabilities (Sanjeevani)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container font-label-sm text-label-sm text-on-surface">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      check_circle
                    </span>{" "}
                    Level III NICU
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container font-label-sm text-label-sm text-on-surface">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      check_circle
                    </span>{" "}
                    24/7 MFM On-Call
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container font-label-sm text-label-sm text-on-surface">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      check_circle
                    </span>{" "}
                    In-House Interpreters
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container font-label-sm text-label-sm text-on-surface">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      check_circle
                    </span>{" "}
                    4 Triage Beds Open
                  </span>
                </div>
              </div>

              {/* Bed Availability */}
              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    L&D Bed Velocity
                  </span>
                  <span className="font-data-tabular text-data-tabular font-semibold text-primary">
                    82% Capacity (Normal)
                  </span>
                </div>
                <div className="w-24 h-8 flex items-center">
                  <svg
                    className="w-full h-full text-secondary"
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 30"
                  >
                    <path
                      d="M0 20 Q 25 5, 50 15 T 100 8"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />
                    <circle cx="100" cy="8" fill="currentColor" r="3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Assigned Navigator Profile Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-surface-container/60">
              <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider block">
                Assigned Maternal Navigator
              </span>
              <div className="flex items-center gap-space-sm">
                <img
                  className="w-12 h-12 rounded-full object-cover"
                  alt="Priya Raman, MSW"
                  src="/images/avatar-priya-raman.svg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-title-sm text-body-sm text-primary font-bold">
                    Priya Raman, MSW
                  </h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Perinatal Social Navigation Lead
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="font-label-sm text-label-sm text-secondary font-medium">
                      Active on Network (ETA 6m)
                    </span>
                  </div>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low p-space-sm rounded-lg">
                Will meet {patientName.split(",")[0]} at the {receivingFacility.split("(")[0].trim()} triage entrance. Coordinated bilingual {language} orientation packet initialized.
              </p>
            </div>

            {/* Facility Destination Map Thumbnail */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">
                  Facility Destination Map
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Bengaluru Urban, Karnataka
                </span>
              </div>
              <div
                className="w-full h-44 bg-cover bg-center rounded-lg shadow-inner relative flex items-end p-space-sm"
                style={{
                  backgroundImage:
                    "url('/images/route-map.svg')",
                }}
              >
                <div className="bg-surface-container-lowest/95 backdrop-blur px-space-sm py-1 rounded-md shadow-sm">
                  <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-error">
                      pin_drop
                    </span>
                    Emergency & OB Admitting Bay 4
                  </span>
                </div>
              </div>
            </div>

            {/* Attached Clinical Artifacts */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-surface-container/60">
              <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider block">
                Attached Clinical Artifacts
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">
                      description
                    </span>
                    <span className="font-label-md text-label-md text-on-surface min-w-0 break-all">
                      Prenatal_Flowsheet_36w.pdf
                    </span>
                  </div>
                  <span className="font-data-tabular text-label-sm text-outline">1.2 MB</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      radiology
                    </span>
                    <span className="font-label-md text-label-md text-on-surface min-w-0 break-all">
                      US_AFI_MembraneCheck.dcm
                    </span>
                  </div>
                  <span className="font-data-tabular text-label-sm text-outline">14.8 MB</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => showToast("Demo only: file attachments are not available.")}
                className="w-full py-2 rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-1.5 mt-space-xs"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Attach Additional Lab or Trace</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReferral;