/**
 * NAVEXA HEALTH — REFERRAL WORKFLOW ACTIONS
 * Pure functions behind every ReferralContext action, so the rules can be tested
 * without React. Each takes a referral and returns either
 * { success: true, referral } or { success: false, reason }. Nothing is mutated.
 */

import {
  AuditRole,
  BARRIER_CATEGORY_LABELS,
  BarrierCategory,
  BarrierStatus,
  CarePlanStatus,
  FollowUpStatus,
  ReferralStatus,
  TimelineEvent,
  TransportStatus,
} from "./enums.js";
import {
  createArrivalRecord,
  createAuditEvent,
  createBarrier,
  createClinicalOutcome,
  createFollowUpPlan,
  createTransportRequest,
  generateId,
} from "./models.js";
import {
  validateBarrierTransition,
  validateFollowUpTransition,
  validateReferralTransition,
  validateTransportTransition,
} from "./transitions.js";

const nowIso = () => new Date().toISOString();
const fail = (reason) => ({ success: false, reason });

// There is no login yet, so the audit trail names the role that acted, not a person.
export const COORDINATOR = "Care Coordinator";
export const PATIENT_OR_FAMILY = "Patient or family";
const HOSPITAL = "Hospital intake";

const withEvents = (referral, { timeline = [], audit = [] }) => ({
  ...referral,
  timeline: [...(referral.timeline || []), ...timeline],
  auditTrail: [...(referral.auditTrail || []), ...audit],
});

// ==========================================
// REFERRAL LIFECYCLE
// ==========================================

export const acknowledgeReferral = (referral, { actor = HOSPITAL, notes = "" } = {}, now = nowIso()) => {
  const check = validateReferralTransition(referral.status, ReferralStatus.ACKNOWLEDGED);
  if (!check.valid) return fail(check.reason);

  return {
    success: true,
    referral: withEvents(
      { ...referral, status: ReferralStatus.ACKNOWLEDGED },
      {
        timeline: [
          {
            status: ReferralStatus.ACKNOWLEDGED,
            date: now,
            notes: notes || `${referral.toFacility} acknowledged intake transfer and prepped bed.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor,
            role: AuditRole.RECEIVING_FACILITY,
            action: "FACILITY_ACKNOWLEDGED",
            details: `Intake confirmed by ${actor}. Bed held for patient.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const rejectReferral = (
  referral,
  { actor = HOSPITAL, reason = "Facility at Capacity" } = {},
  now = nowIso(),
) => {
  const check = validateReferralTransition(referral.status, ReferralStatus.REJECTED);
  if (!check.valid) return fail(check.reason);

  return {
    success: true,
    referral: withEvents(
      {
        ...referral,
        status: ReferralStatus.REJECTED,
        rejectionReason: reason,
        declinedBy: [...(referral.declinedBy || []), referral.toFacility],
        patientChoice: null,
      },
      {
        timeline: [
          {
            status: ReferralStatus.REJECTED,
            date: now,
            notes: `Referral declined by ${referral.toFacility}. Reason: ${reason}. Referral is floating until the patient chooses a hospital.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor,
            role: AuditRole.RECEIVING_FACILITY,
            action: "FACILITY_REJECTED",
            details: `Referral rejected by ${actor}. Reason: ${reason}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const redirectReferral = (
  referral,
  { toFacility, reason = "Diverted to open Level III bed", actor = COORDINATOR, role = AuditRole.COORDINATOR } = {},
  now = nowIso(),
) => {
  const check = validateReferralTransition(referral.status, ReferralStatus.REDIRECTED);
  if (!check.valid) return fail(check.reason);
  if (!toFacility) return fail("A destination facility is required to redirect a referral.");
  if (toFacility === referral.toFacility) return fail(`Referral is already addressed to ${toFacility}.`);

  return {
    success: true,
    referral: withEvents(
      {
        ...referral,
        toFacility,
        status: ReferralStatus.SENT, // Resubmitted to new destination
        redirectHistory: [
          ...(referral.redirectHistory || []),
          { divertedFrom: referral.toFacility, divertedTo: toFacility, date: now, reason, actor },
        ],
      },
      {
        timeline: [
          {
            status: ReferralStatus.REDIRECTED,
            date: now,
            notes: `Referral redirected from ${referral.toFacility} to ${toFacility}. Reason: ${reason}.`,
          },
          {
            status: ReferralStatus.SENT,
            date: now,
            notes: `Resubmitted electronically to ${toFacility}.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor,
            role,
            action: "REFERRAL_REDIRECTED",
            details: `Re-routed patient to ${toFacility}. Justification: ${reason}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const isFloating = (referral) => referral.status === ReferralStatus.REJECTED;

/** Where the patient is heading. A hospital that declined is not it. */
export const getDestination = (referral) =>
  isFloating(referral) ? referral.patientChoice?.elsewhere || "No hospital chosen yet" : referral.toFacility;

const choiceAuditRole = (recordedBy) => (recordedBy === COORDINATOR ? AuditRole.COORDINATOR : AuditRole.PATIENT);

/** The patient picks where to go next. A coordinator can only record what the patient said. */
export const recordPatientChoice = (referral, { toFacility, recordedBy = PATIENT_OR_FAMILY } = {}, now = nowIso()) => {
  if (!isFloating(referral)) return fail("Only a floating referral needs a new hospital.");
  if ((referral.declinedBy || []).includes(toFacility))
    return fail(`${toFacility} has already declined this referral.`);

  const result = redirectReferral(
    referral,
    { toFacility, reason: "Patient's choice", actor: recordedBy, role: choiceAuditRole(recordedBy) },
    now,
  );
  if (!result.success) return result;
  return {
    success: true,
    referral: { ...result.referral, patientChoice: { hospital: toFacility, recordedBy, date: now } },
  };
};

/** The patient says they will go somewhere not on the list. The case stays open until they arrive. */
export const recordPatientGoingElsewhere = (
  referral,
  { place, recordedBy = PATIENT_OR_FAMILY } = {},
  now = nowIso(),
) => {
  if (!isFloating(referral)) return fail("Only a floating referral needs a new hospital.");
  if (!place?.trim()) return fail("Say where the patient plans to go.");

  return {
    success: true,
    referral: withEvents(
      { ...referral, patientChoice: { elsewhere: place.trim(), recordedBy, date: now } },
      {
        // Also restarts the response clock: the patient has answered, so the wait is now for their arrival.
        timeline: [
          {
            status: ReferralStatus.REJECTED,
            date: now,
            notes: `Patient plans to go to ${place.trim()}. The case stays open until arrival is confirmed.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: recordedBy,
            role: choiceAuditRole(recordedBy),
            action: "PATIENT_GOING_ELSEWHERE",
            details: `Patient plans to go to ${place.trim()}, which is not on the list.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

/**
 * Physical arrival closes out a vehicle that was on its way, even if the driver
 * never logged the pickup. Any other transit state (never dispatched, failed,
 * cancelled) means the patient got there another way, so it is left as recorded.
 */
const closeTransitOnArrival = (transit, now) => {
  if (transit?.status === TransportStatus.DISPATCHED) {
    return { ...transit, status: TransportStatus.ARRIVED, pickedUpAt: transit.pickedUpAt || now, arrivedAt: now };
  }
  if (transit?.status === TransportStatus.PICKED_UP) {
    return { ...transit, status: TransportStatus.ARRIVED, arrivedAt: now };
  }
  return transit ?? null;
};

export const confirmArrival = (referral, arrivalPayload = {}, now = nowIso()) => {
  const check = validateReferralTransition(referral.status, ReferralStatus.ARRIVAL_CONFIRMED);
  if (!check.valid) return fail(check.reason);

  const { atFacility, ...arrivalDetails } = arrivalPayload;
  const arrival = createArrivalRecord({ ...arrivalDetails, arrivedAt: arrivalDetails.arrivedAt || now });
  // Patients can change their mind on the way: the hospital they reached becomes the destination.
  const hospital = atFacility || referral.toFacility;
  const wentElsewhere = hospital !== referral.toFacility;

  return {
    success: true,
    referral: withEvents(
      {
        ...referral,
        status: ReferralStatus.ARRIVAL_CONFIRMED,
        toFacility: hospital,
        arrival,
        transit: closeTransitOnArrival(referral.transit, now),
        redirectHistory: wentElsewhere
          ? [
              ...(referral.redirectHistory || []),
              {
                divertedFrom: referral.toFacility,
                divertedTo: hospital,
                date: now,
                reason: "Patient arrived here instead",
                actor: arrival.verifiedBy,
              },
            ]
          : referral.redirectHistory,
      },
      {
        timeline: [
          {
            status: ReferralStatus.ARRIVAL_CONFIRMED,
            date: now,
            notes: `Patient arrival confirmed at ${hospital} (${arrival.department}, ${arrival.room}). Verified by ${arrival.verifiedBy}.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: arrival.verifiedBy,
            role: AuditRole.RECEIVING_FACILITY,
            action: "PATIENT_ARRIVAL_CONFIRMED",
            details: `Physical patient arrival verified. Room: ${arrival.room}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

/**
 * Records the assessment and completes the referral in one step, which is why
 * CLINICAL_ASSESSMENT_RECORDED appears on the timeline but is not left as the status.
 */
export const recordClinicalOutcome = (referral, outcomePayload = {}, now = nowIso()) => {
  if (referral.status !== ReferralStatus.CLINICAL_ASSESSMENT_RECORDED) {
    const check = validateReferralTransition(referral.status, ReferralStatus.CLINICAL_ASSESSMENT_RECORDED);
    if (!check.valid) return fail(check.reason);
  }

  const clinicalOutcome = createClinicalOutcome({
    ...outcomePayload,
    assessedAt: outcomePayload.assessedAt || now,
    referralType: referral.referralType,
  });
  const followUpPlan = createFollowUpPlan({
    referralId: referral.id,
    patientId: referral.patientId,
    patientName: referral.patientName,
    referralType: referral.referralType,
    establishedAt: now,
    leadWorker: referral.navigator?.name || "Priya Raman, MSW",
  });

  return {
    success: true,
    referral: withEvents(
      { ...referral, status: ReferralStatus.COMPLETED, clinicalOutcome, followUpPlan },
      {
        timeline: [
          {
            status: ReferralStatus.CLINICAL_ASSESSMENT_RECORDED,
            date: now,
            notes: `Clinical assessment completed by ${clinicalOutcome.clinicianName} (${clinicalOutcome.clinicianRole}). Disposition: ${clinicalOutcome.disposition}.`,
          },
          {
            status: ReferralStatus.COMPLETED,
            date: now,
            notes: `Referral care episode completed. Linked 42-day continuous care plan activated.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: clinicalOutcome.clinicianName,
            role: AuditRole.ATTENDING_CLINICIAN,
            action: "CLINICAL_OUTCOME_RECORDED",
            details: `Clinical findings logged. Disposition: ${clinicalOutcome.disposition}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

// ==========================================
// BARRIERS
// ==========================================

export const identifyBarrier = (referral, barrierPayload = {}, now = nowIso()) => {
  const barrier = createBarrier({ ...barrierPayload, identifiedAt: barrierPayload.identifiedAt || now });

  const isDuplicate = (referral.barriers || []).some(
    (b) => b.title === barrier.title && b.status !== BarrierStatus.RESOLVED,
  );
  if (isDuplicate) return fail(`"${barrier.title}" is already an open barrier on this referral.`);

  return {
    success: true,
    barrier,
    referral: withEvents(
      {
        ...referral,
        barriers: [...(referral.barriers || []), barrier],
        // A transport barrier puts the case on the transport board and holds the transit gate open.
        transitBarrier: referral.transitBarrier || barrier.category === BarrierCategory.TRANSPORT,
      },
      {
        timeline: [
          {
            status: TimelineEvent.BARRIER_FLAGGED,
            date: now,
            notes: `Barrier Flagged: ${barrier.title} (${barrier.category}).`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: COORDINATOR,
            role: AuditRole.COORDINATOR,
            action: "BARRIER_IDENTIFIED",
            details: `New barrier logged: ${barrier.title}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const updateBarrierStatus = (referral, barrierId, nextStatus, notes = "", now = nowIso()) => {
  const barrier = (referral.barriers || []).find((b) => b.id === barrierId);
  if (!barrier) return fail(`Barrier ${barrierId} not found on this referral.`);

  const check = validateBarrierTransition(barrier.status, nextStatus);
  if (!check.valid) return fail(check.reason);

  const updated = {
    ...barrier,
    status: nextStatus,
    resolvedAt: nextStatus === BarrierStatus.RESOLVED ? now : null,
    resolutionNotes: notes || barrier.resolutionNotes,
  };

  return {
    success: true,
    referral: withEvents(
      { ...referral, barriers: referral.barriers.map((b) => (b.id === barrierId ? updated : b)) },
      {
        timeline: [
          {
            status:
              nextStatus === BarrierStatus.RESOLVED ? TimelineEvent.BARRIER_RESOLVED : TimelineEvent.BARRIER_UPDATED,
            date: now,
            notes: notes || `Barrier #${barrierId} updated to ${nextStatus}.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: COORDINATOR,
            role: AuditRole.COORDINATOR,
            action: `BARRIER_${nextStatus}`,
            details: `Barrier ${barrierId} marked ${nextStatus}. Notes: ${notes}`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const resolveBarrier = (referral, barrierIdOrTitle, resolutionNote = "", now = nowIso()) => {
  const matching =
    barrierIdOrTitle &&
    (referral.barriers || []).find((b) => b.id === barrierIdOrTitle || b.title?.includes(barrierIdOrTitle));
  if (!matching) return fail(`No barrier matches "${barrierIdOrTitle}".`);

  return updateBarrierStatus(
    referral,
    matching.id,
    BarrierStatus.RESOLVED,
    resolutionNote || "Barrier resolved by coordinator.",
    now,
  );
};

// ==========================================
// TRANSPORT
// ==========================================

export const isRideMoving = (transit) =>
  [TransportStatus.DISPATCHED, TransportStatus.PICKED_UP].includes(transit?.status);

export const findOpenBarrier = (referral) => (referral.barriers || []).find((b) => b.status !== BarrierStatus.RESOLVED);

export const hasArrivedAtFacility = (referral) =>
  [ReferralStatus.ARRIVAL_CONFIRMED, ReferralStatus.CLINICAL_ASSESSMENT_RECORDED, ReferralStatus.COMPLETED].includes(
    referral.status,
  );

// No vehicle is needed once the patient is at the hospital, or if the referral was declined.
const isTransportClosed = (referral) => hasArrivedAtFacility(referral) || referral.status === ReferralStatus.REJECTED;

// A new request may only replace a transit that is not in progress.
const canRequestTransport = (transit) =>
  !transit ||
  [TransportStatus.NOT_REQUIRED, TransportStatus.CANCELLED, TransportStatus.FAILED].includes(transit.status);

// Dispatch performs request, assign and dispatch as one action, so it may start from any
// state those steps can follow, and from no transit at all.
const canDispatchTransit = (transit) =>
  canRequestTransport(transit) || [TransportStatus.REQUESTED, TransportStatus.ASSIGNED].includes(transit.status);

export const canDispatchTransport = (referral) => !isTransportClosed(referral) && canDispatchTransit(referral.transit);

export const requestTransport = (referral, transportPayload = {}, now = nowIso()) => {
  if (isTransportClosed(referral)) return fail(`Transport is not needed: referral is ${referral.status}.`);
  if (!canRequestTransport(referral.transit)) {
    return fail(`Transport is already ${referral.transit.status} for this referral.`);
  }

  const transit = createTransportRequest({
    ...transportPayload,
    referralId: referral.id,
    status: TransportStatus.REQUESTED,
  });

  return {
    success: true,
    transit,
    referral: withEvents(
      { ...referral, transit, transitBarrier: true },
      {
        timeline: [
          {
            status: TimelineEvent.TRANSIT_REQUESTED,
            date: now,
            notes: `Medical transit requested. Pickup: ${transit.pickupAddress}.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: COORDINATOR,
            role: AuditRole.COORDINATOR,
            action: "TRANSPORT_REQUESTED",
            details: `Transit requested. Vehicle type: ${transit.vehicleType}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const dispatchTransport = (referral, dispatchPayload, now = nowIso()) => {
  if (isTransportClosed(referral)) return fail(`Cannot dispatch: referral is ${referral.status}.`);
  if (!canDispatchTransit(referral.transit)) {
    return fail(`Cannot dispatch: transport is already ${referral.transit.status}.`);
  }

  if (!dispatchPayload?.vehicle) return fail("A vehicle is required to dispatch transport.");

  const transit = {
    ...(referral.transit || createTransportRequest({ referralId: referral.id })),
    // A new trip must not inherit the times of an earlier trip that failed.
    pickedUpAt: null,
    arrivedAt: null,
    ...dispatchPayload,
    status: TransportStatus.DISPATCHED,
    dispatchedAt: now,
    failedReason: null,
  };

  const barriers = (referral.barriers || []).map((b) =>
    b.category === BarrierCategory.TRANSPORT && b.status !== BarrierStatus.RESOLVED
      ? {
          ...b,
          status: BarrierStatus.RESOLVED,
          resolvedAt: now,
          resolutionNotes: `MediRide transit dispatched: ${dispatchPayload.vehicle} (Driver: ${dispatchPayload.driver}).`,
        }
      : b,
  );

  return {
    success: true,
    referral: withEvents(
      { ...referral, transit, barriers },
      {
        timeline: [
          {
            status: TimelineEvent.TRANSIT_DISPATCHED,
            date: now,
            notes: `MediRide transit dispatched: ${dispatchPayload.vehicle} (Driver: ${dispatchPayload.driver}, ETA: ${dispatchPayload.eta || "15 mins"}).`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: COORDINATOR,
            role: AuditRole.COORDINATOR,
            action: "TRANSPORT_DISPATCHED",
            details: `Transit unit dispatched: ${dispatchPayload.vehicle}. Driver: ${dispatchPayload.driver}.`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const recordTransportPickup = (referral, now = nowIso()) => {
  if (!referral.transit) return fail("No transport has been arranged for this referral.");
  const check = validateTransportTransition(referral.transit.status, TransportStatus.PICKED_UP);
  if (!check.valid) return fail(check.reason);

  return {
    success: true,
    referral: withEvents(
      { ...referral, transit: { ...referral.transit, status: TransportStatus.PICKED_UP, pickedUpAt: now } },
      {
        timeline: [
          {
            status: TimelineEvent.TRANSIT_PICKED_UP,
            date: now,
            notes: `Driver ${referral.transit.driver} confirmed patient and support person picked up. En route to ${referral.toFacility}.`,
          },
        ],
      },
    ),
  };
};

// A failed vehicle leaves the patient stranded again, so a transport barrier must be open.
const reopenTransportBarrier = (barriers, reason, now) => {
  const isTransport = (b) => b.category === BarrierCategory.TRANSPORT;
  if (barriers.some((b) => isTransport(b) && b.status !== BarrierStatus.RESOLVED)) return barriers;

  const last = barriers.findLastIndex(isTransport);
  if (last === -1) {
    return [
      ...barriers,
      createBarrier({
        category: BarrierCategory.TRANSPORT,
        title: "Transit failed",
        description: reason,
        identifiedAt: now,
      }),
    ];
  }
  return barriers.map((b, i) =>
    i === last ? { ...b, status: BarrierStatus.IDENTIFIED, resolvedAt: null, description: reason } : b,
  );
};

export const recordTransportFailure = (
  referral,
  reason = "Vehicle breakdown or patient unable to board",
  now = nowIso(),
) => {
  if (!referral.transit) return fail("No transport has been arranged for this referral.");
  const check = validateTransportTransition(referral.transit.status, TransportStatus.FAILED);
  if (!check.valid) return fail(check.reason);

  return {
    success: true,
    referral: withEvents(
      {
        ...referral,
        transit: { ...referral.transit, status: TransportStatus.FAILED, failedReason: reason },
        transitBarrier: true,
        barriers: reopenTransportBarrier(referral.barriers || [], reason, now),
      },
      {
        timeline: [
          {
            status: TimelineEvent.TRANSIT_FAILED,
            date: now,
            notes: `Transit disruption reported: ${reason}. Escalated to Care Coordinator.`,
          },
        ],
        audit: [
          createAuditEvent({
            actor: COORDINATOR,
            role: AuditRole.COORDINATOR,
            action: "TRANSPORT_FAILED",
            details: `Transit failed: ${reason}`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

// ==========================================
// CONTINUITY OF CARE
// ==========================================

export const completeFollowUpTask = (referral, taskId, notes = "", now = nowIso()) => {
  if (!referral.followUpPlan) return fail("This referral has no continuing care plan.");

  const task = referral.followUpPlan.tasks.find((t) => t.id === taskId);
  if (!task) return fail(`Touchpoint ${taskId} not found on this care plan.`);

  const check = validateFollowUpTransition(task.status, FollowUpStatus.COMPLETED);
  if (!check.valid) return fail(check.reason);

  const completedBy = COORDINATOR;
  const tasks = referral.followUpPlan.tasks.map((t) =>
    t.id === taskId
      ? { ...t, status: FollowUpStatus.COMPLETED, completedAt: now, completedBy, notes: notes || t.notes }
      : t,
  );
  const allDone = tasks.every((t) => t.status === FollowUpStatus.COMPLETED);

  return {
    success: true,
    referral: withEvents(
      {
        ...referral,
        followUpPlan: {
          ...referral.followUpPlan,
          status: allDone ? CarePlanStatus.COMPLETED : CarePlanStatus.ACTIVE,
          tasks,
        },
      },
      {
        audit: [
          createAuditEvent({
            actor: completedBy,
            role: AuditRole.COORDINATOR,
            action: "FOLLOW_UP_COMPLETED",
            details: `Completed continuous care task #${taskId}. Findings: ${notes}`,
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

export const recordContactAttempt = (
  referral,
  { method = "Phone Call", outcome = "Successful", notes = "", actor = COORDINATOR } = {},
  now = nowIso(),
) => ({
  success: true,
  referral: withEvents(
    {
      ...referral,
      contactLogs: [
        ...(referral.contactLogs || []),
        { id: generateId("CNT"), date: now, method, outcome, notes, actor },
      ],
    },
    {
      audit: [
        createAuditEvent({
          actor,
          role: AuditRole.COORDINATOR,
          action: "CONTACT_ATTEMPT",
          details: `${method} (${outcome}): ${notes}`,
          timestamp: now,
        }),
      ],
    },
  ),
});

// ==========================================
// REPORTS FROM THE FAMILY'S ASSISTANT
// ==========================================

export const FAMILY_VIA_ASSISTANT = "Family, via assistant";
const MAX_QUOTE_CHARS = 200;

/**
 * What the family's assistant passes on to their care navigator: a possible danger sign
 * (their own words, quoted), and a practical problem raised as a barrier. Nothing is
 * diagnosed; staff call the family to check. Returns { success, referral, alerts } where
 * alerts are the notifications to show staff.
 */
export const recordFamilyReport = (
  referral,
  { question = "", emergency = false, report = null } = {},
  now = nowIso(),
) => {
  const quote = String(question).trim().slice(0, MAX_QUOTE_CHARS);
  const timeline = [];
  const audit = [];
  const alerts = [];
  let barriers = referral.barriers || [];
  let transitBarrier = referral.transitBarrier;

  if (emergency && quote) {
    timeline.push({
      status: TimelineEvent.DANGER_SIGN_REPORTED,
      date: now,
      notes: `Family told the assistant: "${quote}". They were told to call 108. Call the family now.`,
    });
    audit.push(
      createAuditEvent({
        actor: FAMILY_VIA_ASSISTANT,
        role: AuditRole.PATIENT,
        action: "DANGER_SIGN_REPORTED",
        details: `Possible danger sign in the family's words: "${quote}".`,
        timestamp: now,
      }),
    );
    alerts.push({
      type: "CRITICAL",
      title: "Possible danger sign reported",
      message: `${referral.patientName}'s family wrote: "${quote}". Call them now.`,
    });
  }

  const category = report && Object.values(BarrierCategory).includes(report.category) ? report.category : null;
  const alreadyOpen = barriers.some((b) => b.category === category && b.status !== BarrierStatus.RESOLVED);
  if (category && !alreadyOpen) {
    const summary = String(report.summary || "")
      .trim()
      .slice(0, MAX_QUOTE_CHARS);
    const barrier = createBarrier({
      category,
      title: `${BARRIER_CATEGORY_LABELS[category]} (raised by family)`,
      description: `${summary} Source: ${FAMILY_VIA_ASSISTANT}. Call to confirm.`,
      identifiedAt: now,
    });
    barriers = [...barriers, barrier];
    transitBarrier = transitBarrier || category === BarrierCategory.TRANSPORT;
    timeline.push({
      status: TimelineEvent.BARRIER_FLAGGED,
      date: now,
      notes: `Barrier Flagged: ${barrier.title}. ${summary}`,
    });
    audit.push(
      createAuditEvent({
        actor: FAMILY_VIA_ASSISTANT,
        role: AuditRole.PATIENT,
        action: "BARRIER_IDENTIFIED",
        details: `Raised from the assistant chat: ${summary}`,
        timestamp: now,
      }),
    );
    alerts.push({
      type: "WARNING",
      title: `${BARRIER_CATEGORY_LABELS[category]} barrier raised by family`,
      message: `${referral.patientName}: ${summary}`,
    });
  }

  if (alerts.length === 0) return fail("Nothing to report.");
  return {
    success: true,
    alerts,
    referral: withEvents({ ...referral, barriers, transitBarrier }, { timeline, audit }),
  };
};

// ==========================================
// HANDOFF SUMMARY
// ==========================================

/** Stores an AI-drafted handoff. It is a draft until a person confirms it. */
export const saveHandoff = (referral, summary, now = nowIso()) => {
  if (!summary?.situation) return fail("The summary is empty.");
  return {
    success: true,
    referral: withEvents(
      { ...referral, handoff: { ...summary, draftedAt: now, confirmedBy: null, confirmedAt: null } },
      {
        audit: [
          createAuditEvent({
            actor: "AI draft",
            role: AuditRole.SYSTEM,
            action: "HANDOFF_DRAFTED",
            details: "Handoff summary drafted by AI from the referral record. Not yet checked.",
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

/** A named clinician confirms they checked the drafted handoff against the record. */
export const confirmHandoff = (referral, { confirmedBy } = {}, now = nowIso()) => {
  const name = String(confirmedBy || "").trim();
  if (!referral.handoff) return fail("There is no handoff summary to confirm.");
  if (!name) return fail("Enter who checked the summary.");
  if (referral.handoff.confirmedAt) return fail("This summary is already confirmed.");
  return {
    success: true,
    referral: withEvents(
      { ...referral, handoff: { ...referral.handoff, confirmedBy: name, confirmedAt: now } },
      {
        timeline: [
          { status: TimelineEvent.HANDOFF_CONFIRMED, date: now, notes: `Handoff summary checked by ${name}.` },
        ],
        audit: [
          createAuditEvent({
            actor: name,
            role: AuditRole.RECEIVING_FACILITY,
            action: "HANDOFF_CONFIRMED",
            details: "Checked the AI-drafted handoff summary against the record.",
            timestamp: now,
          }),
        ],
      },
    ),
  };
};

/**
 * The parts of a referral the handoff summary may see: clinical facts only. No name,
 * phone, address, record number or caregiver, so no identifying details leave the app.
 */
export const handoffRecord = (referral) => {
  // Notes can name the patient or caregiver; those words are replaced before anything is sent.
  const names = [referral.patientName, referral.caregiverName]
    .map((n) => String(n || "").trim())
    .filter((n) => n.length > 1);
  const scrub = (text) =>
    names
      .reduce((out, name) => out.split(name).join("the patient"), String(text || ""))
      .replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");
  return {
    patientType: referral.referralType,
    age: referral.age,
    gestationalAge: referral.gestationalAge,
    parity: referral.parity,
    priority: referral.priority,
    status: referral.status,
    fromFacility: referral.fromFacility,
    toFacility: referral.toFacility,
    department: referral.department,
    vitals: referral.vitals || {},
    interpreterNeeded: Boolean(referral.interpreterNeeded),
    language: referral.language,
    needsTransport: Boolean(referral.transitBarrier),
    openBarriers: (referral.barriers || [])
      .filter((b) => b.status !== BarrierStatus.RESOLVED)
      .map((b) => BARRIER_CATEGORY_LABELS[b.category] || b.category),
    reasonForReferral: scrub(referral.reason || referral.condition),
    timeline: (referral.timeline || [])
      .slice(-12)
      .map((t) => ({ date: t.date, event: t.status, notes: scrub(t.notes) })),
  };
};
