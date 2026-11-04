/**
 * NAVEXA HEALTH — DOMAIN ENUMS
 * Single source of truth for all operational and clinical lifecycle states.
 */

export const ReferralStatus = {
  CREATED: "CREATED",
  SENT: "SENT",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  REJECTED: "REJECTED",
  REDIRECTED: "REDIRECTED",
  ARRIVAL_CONFIRMED: "ARRIVAL_CONFIRMED",
  CLINICAL_ASSESSMENT_RECORDED: "CLINICAL_ASSESSMENT_RECORDED",
  COMPLETED: "COMPLETED",
};

export const TransportStatus = {
  NOT_REQUIRED: "NOT_REQUIRED",
  REQUESTED: "REQUESTED",
  ASSIGNED: "ASSIGNED",
  DISPATCHED: "DISPATCHED",
  PICKED_UP: "PICKED_UP",
  ARRIVED: "ARRIVED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
};

export const BarrierStatus = {
  IDENTIFIED: "IDENTIFIED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  UNRESOLVED: "UNRESOLVED",
};

export const BarrierCategory = {
  TRANSPORT: "TRANSPORT",
  FINANCIAL: "FINANCIAL",
  DEPENDENT_CARE: "DEPENDENT_CARE",
  LINGUISTIC: "LINGUISTIC",
  WEATHER: "WEATHER",
  CLINICAL_HESITATION: "CLINICAL_HESITATION",
};

/** How each barrier type reads on screen. One list, so every screen names them the same way. */
export const BARRIER_CATEGORY_LABELS = {
  [BarrierCategory.TRANSPORT]: "Transport",
  [BarrierCategory.FINANCIAL]: "Cost",
  [BarrierCategory.DEPENDENT_CARE]: "Childcare",
  [BarrierCategory.LINGUISTIC]: "Language",
  [BarrierCategory.WEATHER]: "Weather or road",
  [BarrierCategory.CLINICAL_HESITATION]: "Fear of the hospital",
};

export const FollowUpStatus = {
  PLANNED: "PLANNED",
  SCHEDULED: "SCHEDULED",
  DUE: "DUE",
  COMPLETED: "COMPLETED",
  MISSED: "MISSED",
  ESCALATED: "ESCALATED",
};

// Timeline entries that record an event rather than a change of referral status.
export const TimelineEvent = {
  BARRIER_FLAGGED: "BARRIER_FLAGGED",
  BARRIER_RESOLVED: "BARRIER_RESOLVED",
  BARRIER_UPDATED: "BARRIER_UPDATED",
  TRANSIT_REQUESTED: "TRANSIT_REQUESTED",
  TRANSIT_DISPATCHED: "TRANSIT_DISPATCHED",
  TRANSIT_PICKED_UP: "TRANSIT_PICKED_UP",
  TRANSIT_FAILED: "TRANSIT_FAILED",
  DANGER_SIGN_REPORTED: "DANGER_SIGN_REPORTED",
  HANDOFF_CONFIRMED: "HANDOFF_CONFIRMED",
};

export const CarePlanStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ESCALATED: "ESCALATED",
};

export const UrgencyLevel = {
  ROUTINE: "ROUTINE",
  PRIORITY: "PRIORITY",
  URGENT: "URGENT",
  STAT: "STAT",
};

export const isHighAcuity = (priority) => priority === UrgencyLevel.URGENT || priority === UrgencyLevel.STAT;

// Most urgent first. Stable, so equally urgent cases keep their order.
const ACUITY_ORDER = [UrgencyLevel.STAT, UrgencyLevel.URGENT, UrgencyLevel.PRIORITY, UrgencyLevel.ROUTINE];
export const acuityRank = (priority) => ACUITY_ORDER.indexOf(priority);
export const sortByAcuity = (referrals) =>
  [...referrals].sort((a, b) => acuityRank(a.priority) - acuityRank(b.priority));

export const PatientType = {
  MATERNAL: "Maternal",
  CHILD: "Child",
  DYAD: "Dyad",
};

/** How each patient type reads on screen. */
export const PATIENT_TYPE_LABELS = {
  [PatientType.MATERNAL]: "Mother",
  [PatientType.CHILD]: "Newborn",
  [PatientType.DYAD]: "Mother & baby",
};

// Who performed an audited action. Wider than Role, which lists the app's personas.
export const AuditRole = {
  SYSTEM: "system",
  REFERRING_CLINICIAN: "referring_clinician",
  RECEIVING_FACILITY: "receiving_facility",
  ATTENDING_CLINICIAN: "attending_clinician",
  COORDINATOR: "coordinator",
  NAVIGATOR: "navigator",
  TRANSPORT_DRIVER: "transport_driver",
  PATIENT: "patient",
};

export const Role = {
  COORDINATOR: "coordinator",
  FACILITY: "facility",
  PATIENT: "patient",
};
