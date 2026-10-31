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

export const FollowUpStatus = {
  PLANNED: "PLANNED",
  SCHEDULED: "SCHEDULED",
  DUE: "DUE",
  COMPLETED: "COMPLETED",
  MISSED: "MISSED",
  ESCALATED: "ESCALATED",
};

export const UrgencyLevel = {
  ROUTINE: "ROUTINE",
  URGENT: "URGENT",
  STAT: "STAT",
};

export const PatientType = {
  MATERNAL: "Maternal",
  CHILD: "Child",
  DYAD: "Dyad",
};

export const Role = {
  COORDINATOR: "coordinator",
  FACILITY: "facility",
  NAVIGATOR: "navigator",
  PATIENT: "patient",
};

