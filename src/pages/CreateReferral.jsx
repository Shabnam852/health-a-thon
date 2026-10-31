import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext";

const CreateReferral = () => {
  const navigate = useNavigate();
  const { referrals, addReferral, setActiveReferralId } = useReferrals();

  const [activeStep, setActiveStep] = useState(1);
  const [patientType, setPatientType] = useState("Maternal");
  const [priorityLevel, setPriorityLevel] = useState("URGENT");
  const [hasTransport, setHasTransport] = useState(false);
  const [interpreterNeeded, setInterpreterNeeded] = useState(true);

  // Form Fields
  const [mrn, setMrn] = useState(`MRN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [patientName, setPatientName] = useState("Fatima Zahra, 29 yrs");
  const [gestationalAge, setGestationalAge] = useState("36 Weeks, 2 Days");
  const [obstetricHistory, setObstetricHistory] = useState("G3P2 (Two Prior Term Deliveries)");
  const [phone, setPhone] = useState("(555) 382-9012");
  const [emergencyContact, setEmergencyContact] = useState("Tariq Zahra (Spouse) - (555) 382-9014");
  const [language, setLanguage] = useState("Arabic");
  const [address, setAddress] = useState("742 Meadowbrook Ave, Apt 3B, Detroit, MI 48214");
  const [indication, setIndication] = useState(
    "Persistent Premature Rupture of Membranes (PPROM) confirmed via sterile speculum pool exam and positive nitrazine. Patient experiencing irregular mild contractions q 8-10 mins. GBS status unknown. Requires prompt evaluation in Level III obstetric triage for latency antibiotics and continuous fetal cardiotocography."
  );
  const [receivingFacility, setReceivingFacility] = useState(
    "St. Jude Regional Perinatal Center (Level III Perinatal & NICU)"
  );
  const [targetDepartment, setTargetDepartment] = useState(
    "Labor & Delivery Triage / High-Risk Antenatal Unit"
  );

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const generateReferralId = () => {
    return `REF-2024-${String(8820 + referrals.length + 1)}`;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const now = new Date().toISOString();
    const newId = generateReferralId();

    const newReferralRecord = {
      id: newId,
      patientName: patientName.split(",")[0].trim() || "Fatima Zahra",
      patientId: mrn,
      patientAge: "29",
      gestationalAge: gestationalAge,
      referralType: patientType,
      urgency: priorityLevel === "URGENT" ? "HIGH" : priorityLevel === "STAT" ? "CRITICAL" : "MEDIUM",
      priority: priorityLevel,
      status: "SENT",
      fromFacility: "River West Midwifery & Birth Clinic",
      toFacility: receivingFacility.split("(")[0].trim() || "St. Jude Regional Perinatal Center",
      department: targetDepartment,
      reason: indication,
      clinicalSummary: indication,
      caregiverContact: emergencyContact,
      patientPhone: phone,
      language: language,
      interpreterNeeded: interpreterNeeded,
      transitBarrier: !hasTransport,
      createdAt: now,
      timeline: [
        {
          status: "CREATED",
          date: now,
          notes: "Digital referral generated via Navexa Care Pathway Initiation channel.",
        },
        {
          status: "SENT",
          date: now,
          notes: `Transmitted electronically to ${receivingFacility}. Intake reserve protocol engaged.`,
        },
      ],
      auditTrail: [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "Dr. Evelyn Carter, CNM",
          event: "Digital Referral Authorized & Submitted",
          status: "Pending Intake",
        },
      ],
    };

    addReferral(newReferralRecord);
    setActiveReferralId(newId);
    showToast(`Referral #${newId} submitted! Navigating to case tracking...`);

    setTimeout(() => {
      navigate(`/referral/${newId}`);
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-slide-up">
          <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
            check_circle
          </span>
          <span className="font-body-sm text-sm font-medium">{toastMessage}</span>
        </div>
      )}

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
              <button
                type="button"
                onClick={() => showToast("Draft state autosaved successfully.")}
                className="inline-flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Autosaved 1 min ago</span>
              </button>
            </div>
          </div>

          {/* Linear Stepper Bar */}
          <div className="pt-space-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
              {/* Step 1 */}
              <div
                onClick={() => setActiveStep(1)}
                className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-all ${
                  activeStep === 1
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    activeStep === 1
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  1
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-bold truncate tracking-wide uppercase">
                    Step 1
                  </span>
                  <span className="font-title-sm text-body-sm truncate">
                    Patient & Clinical Context
                  </span>
                </div>
                {activeStep === 1 && (
                  <span className="material-symbols-outlined text-[18px] ml-auto text-secondary-fixed">
                    arrow_forward
                  </span>
                )}
              </div>

              {/* Step 2 */}
              <div
                onClick={() => setActiveStep(2)}
                className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-all ${
                  activeStep === 2
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    activeStep === 2
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  2
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-outline uppercase truncate">
                    Step 2
                  </span>
                  <span className="font-title-sm text-body-sm text-on-surface truncate">
                    Receiving Facility & Service
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div
                onClick={() => setActiveStep(3)}
                className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-all ${
                  activeStep === 3
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    activeStep === 3
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  3
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-outline uppercase truncate">
                    Step 3
                  </span>
                  <span className="font-title-sm text-body-sm text-on-surface truncate">
                    Social & Logistics Check
                  </span>
                </div>
              </div>

              {/* Step 4 */}
              <div
                onClick={() => setActiveStep(4)}
                className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-all ${
                  activeStep === 4
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    activeStep === 4
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  4
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-outline uppercase truncate">
                    Step 4
                  </span>
                  <span className="font-title-sm text-body-sm text-on-surface truncate">
                    Handover & Dispatch
                  </span>
                </div>
              </div>
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
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
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
                    onClick={() => setPatientType("Maternal")}
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
                    onClick={() => setPatientType("Neonate")}
                    className={`py-2 px-space-sm rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all ${
                      patientType === "Neonate"
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
                    onClick={() => setPatientType("Dyad")}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">
                      Gestational Age
                    </span>
                    <input
                      type="text"
                      value={gestationalAge}
                      onChange={(e) => setGestationalAge(e.target.value)}
                      className="font-title-sm text-title-sm text-primary font-bold bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                  <span className="inline-flex items-center px-space-sm py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                    Late Preterm
                  </span>
                </div>

                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant block">
                      Obstetric History (G/P)
                    </span>
                    <input
                      type="text"
                      value={obstetricHistory}
                      onChange={(e) => setObstetricHistory(e.target.value)}
                      className="font-title-sm text-title-sm text-primary font-bold bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                  <span className="material-symbols-outlined text-outline text-[20px]">
                    history_edu
                  </span>
                </div>
              </div>

              {/* Contact Channels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
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
                    <p className="font-title-sm text-body-sm text-primary font-semibold">
                      Language Preference: {language}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Requires Certified {language} Medical Interpreter for all clinical discussions.
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
                  Triage Level 2
                </span>
              </div>

              {/* Urgency Radio Grid */}
              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface-variant block font-medium">
                  Triage Priority Window
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
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
                        STAT / EMERGENCY (EMS 911)
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
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Point-of-Care Vitals (Taken at 14:15 EST)
                  </span>
                  <span className="font-data-tabular text-data-tabular text-secondary font-semibold">
                    All Vitals Verified
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                  <div className="p-space-sm rounded-lg bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">
                      Blood Pressure
                    </span>
                    <span className="font-headline-md text-headline-md font-bold text-primary">
                      128/82
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      mmHg (Normotensive)
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">
                      Maternal Pulse
                    </span>
                    <span className="font-headline-md text-headline-md font-bold text-primary">
                      78
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      bpm • Regular
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase block">
                      Temperature
                    </span>
                    <span className="font-headline-md text-headline-md font-bold text-primary">
                      98.6°
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Fahrenheit (Afebrile)
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-surface-container-high text-center">
                    <span className="font-label-sm text-label-sm text-secondary uppercase block font-semibold">
                      Fetal Heart Rate
                    </span>
                    <span className="font-headline-md text-headline-md font-bold text-secondary">
                      142
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      bpm • Category I Baseline
                    </span>
                  </div>
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
                      Dr. Evelyn Carter, CNM, FACNM
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      River West Midwifery & Birth Clinic • NPI: 1948201940
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-medium">
                  <span className="material-symbols-outlined text-[16px]">verified</span> Clinician Authenticated
                </span>
              </div>
            </div>

            {/* SECTION C: Receiving Facility */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
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
                      <option>St. Jude Regional Perinatal Center (Level III Perinatal & NICU)</option>
                      <option>University Medical Center Detroit (Level IV Regional Center)</option>
                      <option>Mercy Women's & Children's Pavilion (Level II Special Care)</option>
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
                      St. Jude Charge Desk: (555) 890-3321 (Ext. 402)
                    </span>
                  </div>
                </div>
                <a
                  href="tel:5558903321"
                  className="inline-flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container font-label-md text-label-md transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>Direct Dial</span>
                </a>
              </div>
            </div>

            {/* SECTION D: Transport & Anticipated Barrier Assessment */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
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
                        Non-Emergency Medical Transportation voucher queued for immediate pickup at clinic.
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
                        Maya Lin, MSW (On-duty Arab/English bilingual maternal health navigator).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION E: Submission Safeguard */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-surface-container/60">
              <div className="p-space-md rounded-xl bg-error-container/20 flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-error text-[22px] flex-shrink-0 mt-0.5">
                  shield
                </span>
                <div>
                  <p className="font-title-sm text-body-sm text-on-error-container font-semibold">
                    Clinical Handover Safety Disclaimer
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed mt-0.5">
                    Submitting this digital referral automatically registers intake queues at St. Jude Perinatal and alerts the maternal navigation team. This system does NOT replace verbal telephone handover for patients requiring immediate life-saving resuscitation or STAT emergency EMS dispatch.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                <button
                  type="button"
                  onClick={() => showToast("Referral saved as incomplete draft.")}
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
                        "Summary Preview: Fatima Zahra (36w2d), PPROM, St. Jude L&D Triage, Priority: URGENT."
                      )
                    }
                    className="w-full sm:w-auto px-space-md py-2.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-variant font-label-md text-label-md transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">preview</span>
                    <span>Preview Clinical Summary</span>
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-space-lg py-2.5 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-md text-label-md font-semibold transition-all shadow-md flex items-center justify-center gap-2"
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
                      Estimated Transit Time
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
                  <span>River West Clinic</span>
                  <span>7.4 Miles via I-94 E</span>
                  <span>St. Jude L&D</span>
                </div>
              </div>

              {/* Destination Capabilities */}
              <div className="space-y-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant block font-medium">
                  Destination Capabilities (St. Jude)
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
                  alt="Maya Lin, MSW"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDr4M1mBJK2LLQOoSj2wzpIZDfYgTXIddRm1WRgORneeTYX3eVrG-wdOuWJHa0vuhHSFgP7Q6gGGYIL9t6Oi6qUhSIWkH58TWtnNnfJ9YMaSkYQX2d3kuuzQ2tdNWHyy8vOJ7zO7RbOtFd6laoGbjxhcu0zOsCmhLkpB1yPUHsXnAEJG3UX6eNShXcBE84vEQzXRKgrerj3Hijl5YuezXg7DN4saukNAeQGYU4cPt2mIgMMIjS8r3SP4A"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-title-sm text-body-sm text-primary font-bold truncate">
                    Maya Lin, MSW
                  </h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
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
                Will meet {patientName.split(",")[0]} at St. Jude Obstetric Triage Entrance. Coordinated bilingual Arabic orientation packet initialized.
              </p>
            </div>

            {/* Facility Destination Map Thumbnail */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">
                  Facility Destination Map
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Wayne County, MI
                </span>
              </div>
              <div
                className="w-full h-44 bg-cover bg-center rounded-lg shadow-inner relative flex items-end p-space-sm"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAni3DIG74ZnMOuou3_Tu3APmI6f2y6FNItuvpTyAlg675Psd_NxmOAKpPMUaQq5KGECw1hCZo-aNkhldwGG4-QP8lHDZFqcpZ0J70bof7Hq-xwBPO-kSY07HLOxefh1zfkbiEq1mLshV9I-8o0lnTwJ_WtYLX2_TNec-vdsYw5IdypEjQaULR8-5N8PODRHoV24YfWhK5yjrVm4JDTnAJaWr_N0xtTLp1v_LmggLFYAj5mji6EGG5DeA')",
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
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      description
                    </span>
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      Prenatal_Flowsheet_36w.pdf
                    </span>
                  </div>
                  <span className="font-data-tabular text-label-sm text-outline">1.2 MB</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      radiology
                    </span>
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      US_AFI_MembraneCheck.dcm
                    </span>
                  </div>
                  <span className="font-data-tabular text-label-sm text-outline">14.8 MB</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => showToast("File attachment dialog opened.")}
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