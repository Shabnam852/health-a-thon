/**
 * NAVEXA HEALTH — DOMAIN MODELS & ENTITY FACTORIES
 * Standardized data entities with unique ID generation, defaults, and validation.
 */

import {
  AuditRole,
  BarrierStatus,
  CarePlanStatus,
  FollowUpStatus,
  PatientType,
  ReferralStatus,
  TransportStatus,
  UrgencyLevel,
} from "./enums.js";

export const generateId = (prefix = "REF") => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Creates an immutable audit event record.
 */
export const createAuditEvent = ({
  actor = "System",
  role = AuditRole.SYSTEM,
  action = "UPDATE",
  details = "",
  timestamp = new Date().toISOString(),
} = {}) => ({
  id: generateId("AUD"),
  actor,
  role,
  action,
  details,
  timestamp,
});

/**
 * Creates a structured barrier entity.
 */
export const createBarrier = ({
  id = generateId("BAR"),
  category = "TRANSPORT",
  title = "Unspecified Barrier",
  description = "",
  status = BarrierStatus.IDENTIFIED,
  identifiedAt = new Date().toISOString(),
  resolvedAt = null,
  resolutionNotes = "",
  assignedTo = null,
} = {}) => ({
  id,
  category,
  title,
  description,
  status,
  identifiedAt,
  resolvedAt,
  resolutionNotes,
  assignedTo,
});

/**
 * Creates a structured transport request entity.
 */
export const createTransportRequest = ({
  id = generateId("TR"),
  referralId,
  status = TransportStatus.REQUESTED,
  pickupAddress = "",
  destinationFacility = "",
  vehicleType = "MediRide Van",
  requiresNeonatalKit = false,
  requiresWheelchair = false,
  vanId = null, // The fleet id of the van, which is what says the van is busy.
  vehicle = null, // e.g. "MediVan #04 (Silver Transit • Plate KA-01-AB-4892)"
  driver = null, // e.g. "Manjunath Gowda"
  driverPhone = "+91 90000 19921",
  eta = null, // e.g. "12 mins"
  dispatchedAt = null,
  pickedUpAt = null,
  arrivedAt = null,
  failedReason = null,
} = {}) => ({
  id,
  referralId,
  status,
  pickupAddress,
  destinationFacility,
  vehicleType,
  requiresNeonatalKit,
  requiresWheelchair,
  vanId,
  vehicle,
  driver,
  driverPhone,
  eta,
  dispatchedAt,
  pickedUpAt,
  arrivedAt,
  failedReason,
});

/**
 * Creates a physical arrival verification record.
 */
export const createArrivalRecord = ({
  arrivedAt = new Date().toISOString(),
  verifiedBy = "Intake Desk Staff",
  staffId = "STAFF-AUTO",
  department = "Obstetric & Neonatal Triage",
  room = "Intake Bay 01",
  notes = "Patient arrival physically confirmed.",
} = {}) => ({
  arrivedAt,
  verifiedBy,
  staffId,
  department,
  room,
  notes,
});

const MATERNAL_OUTCOME_FIELDS = { maternalStatus: null, deliveryType: null, gestationalOutcome: "" };
const NEONATAL_OUTCOME_FIELDS = {
  neonatalStatus: null,
  birthWeightGrams: null,
  apgar1Min: null,
  apgar5Min: null,
  bilirubinMgDl: null,
};

// Blanks the fields of the other patient type. A dyad record covers both.
const hideOtherPatientFields = (referralType) => {
  if (referralType === PatientType.MATERNAL) return NEONATAL_OUTCOME_FIELDS;
  if (referralType === PatientType.CHILD) return MATERNAL_OUTCOME_FIELDS;
  return {};
};

/**
 * Creates a structured clinical assessment & outcome record.
 * Strictly separates maternal vs. neonatal outcomes.
 */
export const createClinicalOutcome = ({
  assessedAt = new Date().toISOString(),
  clinicianName = "Attending Physician / Midwife",
  clinicianRole = "MD / MS (OBG)",
  referralType = PatientType.MATERNAL,
  diagnosisConfirmed = "",
  // Maternal specifics
  maternalStatus = "STABLE", // STABLE, OBSERVATION, ADMITTED_L_D, SURGICAL_INTERVENTION, ICU
  deliveryType = null, // SPONTANEOUS_VAGINAL, ASSISTED, CESAREAN, NOT_APPLICABLE
  gestationalOutcome = "", // e.g., "Full term delivery, no PPH"
  // Neonatal specifics
  neonatalStatus = null, // STABLE, PHOTOTHERAPY_INITIATED, NICU_ADMITTED, TRANSFERRED
  birthWeightGrams = null,
  apgar1Min = null,
  apgar5Min = null,
  bilirubinMgDl = null,
  // Common outcome disposition
  disposition = "ADMITTED", // ADMITTED, DISCHARGED_HOME, TRANSFERRED_QUATERNARY
  clinicalNotes = "",
} = {}) => ({
  assessedAt,
  clinicianName,
  clinicianRole,
  referralType,
  diagnosisConfirmed,
  maternalStatus,
  deliveryType,
  gestationalOutcome,
  neonatalStatus,
  birthWeightGrams,
  apgar1Min,
  apgar5Min,
  bilirubinMgDl,
  disposition,
  clinicalNotes,
  ...hideOtherPatientFields(referralType),
});

/**
 * Creates a single touchpoint task within a continuing care plan.
 */
// A visit is due on a calendar day where the user is, not on the UTC date.
const addLocalDays = (start, days) => {
  const date = new Date(start);
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const createFollowUpTask = ({
  id = generateId("TSK"),
  title = "Postpartum Touchpoint",
  dayOffset = 3, // e.g., Day 3, Day 7, Day 14, Day 42
  startsAt = Date.now(),
  dueDate = null,
  targetRole = "Community Midwife / Lactation Consultant",
  status = FollowUpStatus.PLANNED,
  clinicalFocus = "Lactation assessment and neonatal jaundice screening",
  completedAt = null,
  completedBy = null,
  notes = "",
} = {}) => ({
  id,
  title,
  dayOffset,
  dueDate: dueDate || addLocalDays(startsAt, dayOffset),
  targetRole,
  status,
  clinicalFocus,
  completedAt,
  completedBy,
  notes,
});

/**
 * Creates a 42-day maternal or neonatal continuing care plan.
 */
export const createFollowUpPlan = ({
  id = generateId("PLAN"),
  referralId,
  patientId,
  patientName,
  referralType = PatientType.MATERNAL,
  establishedAt = new Date().toISOString(),
  leadWorker = "Priya Raman, MSW",
  tasks = [],
} = {}) => {
  // Default evidence-based touchpoints if none provided
  const maternalTasks = () => [
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 3 Maternal & Lactation Check",
      dayOffset: 3,
      clinicalFocus: "Lactation onset, early wound check, BP re-screen",
    }),
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 7 BP & Surgical Healing",
      dayOffset: 7,
      clinicalFocus: "Rule out secondary PPH, severe preeclampsia recurrence, cesarean wound check",
    }),
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 14 Emotional Health & Mental Well-being",
      dayOffset: 14,
      clinicalFocus: "Postpartum depression/anxiety screening (EPDS), infant feeding sustainability",
    }),
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 42 Comprehensive Postpartum Exam",
      dayOffset: 42,
      clinicalFocus: "Pelvic exam, contraception, transition to primary well-woman care",
    }),
  ];

  const neonatalTasks = () => [
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 3 Neonatal Bilirubin & Hydration",
      dayOffset: 3,
      clinicalFocus: "Transcutaneous bilirubin check, weight loss check (<10% threshold)",
    }),
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 7 Well-Baby Weight Check",
      dayOffset: 7,
      clinicalFocus: "Regaining birth weight, cord care, feeding latch evaluation",
    }),
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 14 Newborn Metabolic & Development",
      dayOffset: 14,
      clinicalFocus: "Metabolic screen verification, developmental reflexes",
    }),
    createFollowUpTask({
      startsAt: establishedAt,
      title: "Day 28 Neonatal Transition",
      dayOffset: 28,
      clinicalFocus: "One-month pediatric primary care handoff and immunization scheduling",
    }),
  ];

  // A dyad record follows both the mother and the baby.
  const defaultTasks =
    referralType === PatientType.MATERNAL
      ? maternalTasks()
      : referralType === PatientType.DYAD
        ? [...maternalTasks(), ...neonatalTasks()].sort((a, b) => a.dayOffset - b.dayOffset)
        : neonatalTasks();

  return {
    id,
    referralId,
    patientId,
    patientName,
    referralType,
    establishedAt,
    leadWorker,
    status: CarePlanStatus.ACTIVE,
    tasks: tasks.length > 0 ? tasks : defaultTasks,
  };
};

/**
 * Central Referral Domain Entity Factory.
 */
export const createReferral = ({
  id = generateId("REF-2024"),
  patientName,
  patientId = generateId("MRN"),
  age = "Not recorded",
  parity = "Not recorded",
  gestationalAge = "36w 0d",
  edd = "",
  condition = "",
  referralType = PatientType.MATERNAL,
  priority = UrgencyLevel.URGENT,
  status = ReferralStatus.CREATED,
  fromFacility,
  fromClinician = "Referring Provider, MD/MS",
  toFacility,
  department = "Obstetric & Neonatal Triage",
  reason = "",
  caregiverName = "",
  caregiverContact = "",
  patientPhone = "",
  patientAddress = "",
  language = "English",
  interpreterNeeded = false,
  transitBarrier = false,
  declinedBy = [],
  rejectionReason = null,
  patientChoice = null,
  createdAt = new Date().toISOString(),
  navigator = null,
  vitals = {},
  barriers = [],
  transit = null,
  arrival = null,
  clinicalOutcome = null,
  followUpPlan = null,
  timeline = [],
  auditTrail = [],
} = {}) => ({
  id,
  patientName,
  patientId,
  age,
  parity,
  gestationalAge,
  edd,
  condition: condition || reason,
  referralType,
  priority,
  status,
  fromFacility,
  fromClinician,
  toFacility,
  department,
  reason,
  caregiverName,
  caregiverContact,
  patientPhone,
  patientAddress,
  language,
  interpreterNeeded,
  transitBarrier,
  declinedBy,
  rejectionReason,
  patientChoice,
  createdAt,
  navigator: navigator || {
    id: "NAV-01",
    name: "Priya Raman, MSW",
    role: "Lead Perinatal Care Coordinator",
    avatar: "/images/avatar-priya-raman.svg",
    phone: "+91 90000 21049",
  },
  vitals,
  barriers: barriers.map((b) => (b.id ? b : createBarrier(b))),
  transit: transit ? (transit.id ? transit : createTransportRequest({ ...transit, referralId: id })) : null,
  arrival: arrival ? (arrival.arrivedAt ? arrival : createArrivalRecord(arrival)) : null,
  clinicalOutcome: clinicalOutcome ? createClinicalOutcome({ referralType, ...clinicalOutcome }) : null,
  followUpPlan: followUpPlan || null,
  timeline:
    timeline.length > 0
      ? timeline
      : [
          {
            status: ReferralStatus.CREATED,
            date: createdAt,
            notes: `Referral drafted by ${fromClinician} at ${fromFacility}.`,
          },
          ...(status === ReferralStatus.CREATED
            ? []
            : [{ status, date: createdAt, notes: `Referral entered the system as ${status}.` }]),
        ],
  auditTrail:
    auditTrail.length > 0
      ? auditTrail
      : [
          createAuditEvent({
            actor: fromClinician,
            role: AuditRole.REFERRING_CLINICIAN,
            action: "REFERRAL_CREATED",
            details: `Referral initiated for ${patientName} (${priority} Acuity).`,
            timestamp: createdAt,
          }),
        ],
});
