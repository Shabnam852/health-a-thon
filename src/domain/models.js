/**
 * NAVEXA HEALTH — DOMAIN MODELS & ENTITY FACTORIES
 * Standardized data entities with unique ID generation, defaults, and validation.
 */

import { ReferralStatus, TransportStatus, BarrierStatus, UrgencyLevel, PatientType } from "./enums.js";

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
  role = "system",
  action = "UPDATE",
  details = "",
  timestamp = new Date().toISOString(),
}) => ({
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
}) => ({
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
  requiresInfantCarSeat = false,
  requiresWheelchair = false,
  vehicle = null, // e.g. "MediVan #04 (Silver Transit • Plate 7TX-489)"
  driver = null,  // e.g. "Marcus Ross"
  driverPhone = "(555) 481-9921",
  eta = null,     // e.g. "12 mins"
  dispatchedAt = null,
  pickedUpAt = null,
  arrivedAt = null,
  failedReason = null,
}) => ({
  id,
  referralId,
  status,
  pickupAddress,
  destinationFacility,
  vehicleType,
  requiresInfantCarSeat,
  requiresWheelchair,
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
}) => ({
  arrivedAt,
  verifiedBy,
  staffId,
  department,
  room,
  notes,
});

/**
 * Creates a structured clinical assessment & outcome record.
 * Strictly separates maternal vs. neonatal outcomes.
 */
export const createClinicalOutcome = ({
  assessedAt = new Date().toISOString(),
  clinicianName = "Attending Physician / Midwife",
  clinicianRole = "MD / CNM",
  referralType = PatientType.MATERNAL,
  diagnosisConfirmed = "",
  // Maternal specifics
  maternalStatus = "STABLE", // STABLE, OBSERVATION, ADMITTED_L_D, SURGICAL_INTERVENTION, ICU
  deliveryType = null,       // SPONTANEOUS_VAGINAL, ASSISTED, CESAREAN, NOT_APPLICABLE
  gestationalOutcome = "",   // e.g., "Full term delivery, no PPH"
  // Neonatal specifics
  neonatalStatus = null,     // STABLE, PHOTOTHERAPY_INITIATED, NICU_ADMITTED, TRANSFERRED
  birthWeightGrams = null,
  apgar1Min = null,
  apgar5Min = null,
  bilirubinMgDl = null,
  // Common outcome disposition
  disposition = "ADMITTED",  // ADMITTED, DISCHARGED_HOME, TRANSFERRED_QUATERNARY
  clinicalNotes = "",
}) => ({
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
});

/**
 * Creates a single touchpoint task within a continuing care plan.
 */
export const createFollowUpTask = ({
  id = generateId("TSK"),
  title = "Postpartum Touchpoint",
  dayOffset = 3, // e.g., Day 3, Day 7, Day 14, Day 42
  dueDate = null,
  targetRole = "Community Midwife / Lactation Consultant",
  status = "PLANNED", // PLANNED, SCHEDULED, COMPLETED, MISSED, ESCALATED
  clinicalFocus = "Lactation assessment and neonatal jaundice screening",
  completedAt = null,
  completedBy = null,
  notes = "",
}) => ({
  id,
  title,
  dayOffset,
  dueDate: dueDate || new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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
  leadWorker = "Maya Lin, MSW",
  tasks = [],
}) => {
  // Default evidence-based touchpoints if none provided
  const defaultTasks =
    referralType === PatientType.MATERNAL
      ? [
          createFollowUpTask({
            title: "Day 3 Maternal & Lactation Check",
            dayOffset: 3,
            clinicalFocus: "Lactation onset, early wound check, BP re-screen",
          }),
          createFollowUpTask({
            title: "Day 7 BP & Surgical Healing",
            dayOffset: 7,
            clinicalFocus: "Rule out secondary PPH, severe preeclampsia recurrence, cesarean wound check",
          }),
          createFollowUpTask({
            title: "Day 14 Emotional Health & Mental Well-being",
            dayOffset: 14,
            clinicalFocus: "Postpartum depression/anxiety screening (EPDS), infant feeding sustainability",
          }),
          createFollowUpTask({
            title: "Day 42 Comprehensive Postpartum Exam",
            dayOffset: 42,
            clinicalFocus: "Pelvic exam, contraception, transition to primary well-woman care",
          }),
        ]
      : [
          createFollowUpTask({
            title: "Day 3 Neonatal Bilirubin & Hydration",
            dayOffset: 3,
            clinicalFocus: "Transcutaneous bilirubin check, weight loss check (<10% threshold)",
          }),
          createFollowUpTask({
            title: "Day 7 Well-Baby Weight Check",
            dayOffset: 7,
            clinicalFocus: "Regaining birth weight, cord care, feeding latch evaluation",
          }),
          createFollowUpTask({
            title: "Day 14 Newborn Metabolic & Development",
            dayOffset: 14,
            clinicalFocus: "Metabolic screen verification, developmental reflexes",
          }),
          createFollowUpTask({
            title: "Day 28 Neonatal Transition",
            dayOffset: 28,
            clinicalFocus: "One-month pediatric primary care handoff and immunization scheduling",
          }),
        ];

  return {
    id,
    referralId,
    patientId,
    patientName,
    referralType,
    establishedAt,
    leadWorker,
    status: "ACTIVE", // ACTIVE, COMPLETED, ESCALATED
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
  age = "28 yrs",
  parity = "G1P0",
  gestationalAge = "36w 0d",
  edd = "",
  condition = "",
  referralType = PatientType.MATERNAL,
  priority = UrgencyLevel.URGENT,
  status = ReferralStatus.CREATED,
  fromFacility,
  fromClinician = "Referring Provider, MD/CNM",
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
}) => ({
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
  createdAt,
  navigator: navigator || {
    id: "NAV-01",
    name: "Maya Lin, MSW",
    role: "Lead Perinatal Care Coordinator",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoZfH4bzWWKO46H7BwByYXNjLd4FhpN7LW57qYEUL5j3A47FUv2i09dJmjQL1-MUN4d7VztblABu5RPVUzpx8obJuR1ntnJjb4W9zE5qpFD2vmeTihz8r3qv6wjd0vqiE19y8l5GMFj-AhAZCenAQ7biqFZJWwGsbmWee9F4s5Sk-xXyQtcirTUUZU9Jw5PL2difZ0P0uXr72r6EMZvVHP30iJbdO8p4Anu7jP4zLlWygVN5Mv7nDeWQ",
    phone: "(555) 392-1049",
  },
  vitals,
  barriers: barriers.map((b) => (b.id ? b : createBarrier(b))),
  transit: transit ? (transit.id ? transit : createTransportRequest({ ...transit, referralId: id })) : null,
  arrival: arrival ? (arrival.arrivedAt ? arrival : createArrivalRecord(arrival)) : null,
  clinicalOutcome: clinicalOutcome ? createClinicalOutcome(clinicalOutcome) : null,
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
        ],
  auditTrail:
    auditTrail.length > 0
      ? auditTrail
      : [
          createAuditEvent({
            actor: fromClinician,
            role: "referring_clinician",
            action: "REFERRAL_CREATED",
            details: `Referral initiated for ${patientName} (${priority} Acuity).`,
            timestamp: createdAt,
          }),
        ],
});

