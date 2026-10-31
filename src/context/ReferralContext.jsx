import React, { createContext, useContext, useState, useEffect } from "react";
import { StorageAdapter } from "../services/storageAdapter.js";
import {
  initialFacilities,
  initialNavigators,
  initialFleet,
  initialSeedReferrals,
  initialNotifications,
} from "../data/seedData.js";
import {
  ReferralStatus,
  TransportStatus,
  BarrierStatus,
  FollowUpStatus,
} from "../domain/enums.js";
import {
  createReferral,
  createBarrier,
  createTransportRequest,
  createArrivalRecord,
  createClinicalOutcome,
  createFollowUpPlan,
  createAuditEvent,
} from "../domain/models.js";
import {
  validateReferralTransition,
  validateTransportTransition,
  validateBarrierTransition,
  validateFollowUpTransition,
} from "../domain/transitions.js";

const ReferralContext = createContext();

export const useReferrals = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error("useReferrals must be used within a ReferralProvider");
  }
  return context;
};

export const ReferralProvider = ({ children }) => {
  // Load combined data structure from StorageAdapter or Seed
  const [data, setData] = useState(() => {
    return StorageAdapter.loadData({
      referrals: initialSeedReferrals,
      facilities: initialFacilities,
      navigators: initialNavigators,
      fleet: initialFleet,
      notifications: initialNotifications,
    });
  });

  const referrals = data.referrals || [];
  const facilities = data.facilities || initialFacilities;
  const navigators = data.navigators || initialNavigators;
  const fleet = data.fleet || initialFleet;
  const notifications = data.notifications || initialNotifications;

  // Active Role and Active Referral
  const [role, setRoleState] = useState(() => StorageAdapter.getRole());
  const [activeReferralId, setActiveReferralId] = useState(
    () => referrals[0]?.id || "REF-2024-8821"
  );

  // Sync to Storage on every mutation
  useEffect(() => {
    StorageAdapter.saveData(data);
  }, [data]);

  const setRole = (newRole) => {
    StorageAdapter.setRole(newRole);
    setRoleState(newRole);
  };

  const logout = () => {
    setRole("coordinator");
  };

  const getReferralById = (id) => {
    return referrals.find((r) => r.id === id);
  };

  // Helper to update a specific referral by ID
  const updateReferral = (id, updater) => {
    setData((prev) => {
      const nextReferrals = prev.referrals.map((r) => {
        if (r.id !== id) return r;
        return updater(r);
      });
      return { ...prev, referrals: nextReferrals };
    });
  };

  // ==========================================
  // REFERRAL LIFECYCLE ACTIONS
  // ==========================================

  const addReferral = (newReferralData) => {
    const formatted = newReferralData.createdAt ? newReferralData : createReferral(newReferralData);
    setData((prev) => ({
      ...prev,
      referrals: [formatted, ...prev.referrals],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          timestamp: "Just now",
          type: "INFO",
          title: "New Referral Initiated",
          message: `${formatted.patientName} (${formatted.priority}) referred to ${formatted.toFacility}.`,
          link: `/referral/${formatted.id}`,
          read: false,
        },
        ...prev.notifications,
      ],
    }));
    setActiveReferralId(formatted.id);
    return formatted;
  };

  const acknowledgeReferral = (id, facilityUser = "Intake Clerk", notes = "") => {
    const target = getReferralById(id);
    if (!target) return { success: false, reason: "Referral not found" };

    const validation = validateReferralTransition(target.status, ReferralStatus.ACKNOWLEDGED);
    if (!validation.valid) return { success: false, reason: validation.reason };

    const now = new Date().toISOString();
    updateReferral(id, (r) => ({
      ...r,
      status: ReferralStatus.ACKNOWLEDGED,
      timeline: [
        ...(r.timeline || []),
        {
          status: ReferralStatus.ACKNOWLEDGED,
          date: now,
          notes: notes || `${r.toFacility} acknowledged intake transfer and prepped bed.`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: facilityUser,
          role: "receiving_facility",
          action: "FACILITY_ACKNOWLEDGED",
          details: `Intake confirmed by ${facilityUser}. Bed held for patient.`,
          timestamp: now,
        }),
      ],
    }));
    return { success: true };
  };

  const rejectReferral = (id, facilityUser = "Intake Supervisor", reason = "Facility at Capacity") => {
    const target = getReferralById(id);
    if (!target) return { success: false, reason: "Referral not found" };

    const validation = validateReferralTransition(target.status, ReferralStatus.REJECTED);
    if (!validation.valid) return { success: false, reason: validation.reason };

    const now = new Date().toISOString();
    updateReferral(id, (r) => ({
      ...r,
      status: ReferralStatus.REJECTED,
      rejectionReason: reason,
      timeline: [
        ...(r.timeline || []),
        {
          status: ReferralStatus.REJECTED,
          date: now,
          notes: `Referral declined by ${r.toFacility}. Reason: ${reason}. Awaiting coordinator redirection.`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: facilityUser,
          role: "receiving_facility",
          action: "FACILITY_REJECTED",
          details: `Referral rejected by ${facilityUser}. Reason: ${reason}.`,
          timestamp: now,
        }),
      ],
    }));
    return { success: true };
  };

  const redirectReferral = (id, fromFacility, toFacilityName, reason = "Diverted to open Level III bed", actor = "Sarah Jenkins, RN") => {
    const target = getReferralById(id);
    if (!target) return { success: false, reason: "Referral not found" };

    const now = new Date().toISOString();
    updateReferral(id, (r) => ({
      ...r,
      toFacility: toFacilityName,
      status: ReferralStatus.SENT, // Resubmitted to new destination
      redirectHistory: [
        ...(r.redirectHistory || []),
        {
          divertedFrom: r.toFacility,
          divertedTo: toFacilityName,
          date: now,
          reason,
          actor,
        },
      ],
      timeline: [
        ...(r.timeline || []),
        {
          status: ReferralStatus.REDIRECTED,
          date: now,
          notes: `Referral redirected from ${r.toFacility} to ${toFacilityName}. Reason: ${reason}.`,
        },
        {
          status: ReferralStatus.SENT,
          date: now,
          notes: `Resubmitted electronically to ${toFacilityName}.`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor,
          role: "coordinator",
          action: "REFERRAL_REDIRECTED",
          details: `Re-routed patient to ${toFacilityName}. Justification: ${reason}.`,
          timestamp: now,
        }),
      ],
    }));
    return { success: true };
  };

  const confirmArrival = (id, arrivalPayload) => {
    const target = getReferralById(id);
    if (!target) return { success: false, reason: "Referral not found" };

    const validation = validateReferralTransition(target.status, ReferralStatus.ARRIVAL_CONFIRMED);
    if (!validation.valid) return { success: false, reason: validation.reason };

    const arrivalRecord = createArrivalRecord(arrivalPayload || {});
    const now = new Date().toISOString();

    updateReferral(id, (r) => ({
      ...r,
      status: ReferralStatus.ARRIVAL_CONFIRMED,
      arrival: arrivalRecord,
      transit: r.transit ? { ...r.transit, status: TransportStatus.ARRIVED, arrivedAt: now } : null,
      timeline: [
        ...(r.timeline || []),
        {
          status: ReferralStatus.ARRIVAL_CONFIRMED,
          date: now,
          notes: `Patient arrival confirmed at ${r.toFacility} (${arrivalRecord.department}, ${arrivalRecord.room}). Verified by ${arrivalRecord.verifiedBy}.`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: arrivalRecord.verifiedBy,
          role: "receiving_facility",
          action: "PATIENT_ARRIVAL_CONFIRMED",
          details: `Physical patient arrival verified. Room: ${arrivalRecord.room}.`,
          timestamp: now,
        }),
      ],
    }));
    return { success: true };
  };

  const recordClinicalOutcome = (id, outcomePayload) => {
    const target = getReferralById(id);
    if (!target) return { success: false, reason: "Referral not found" };

    const validation = validateReferralTransition(target.status, ReferralStatus.COMPLETED);
    if (!validation.valid) return { success: false, reason: validation.reason };

    const outcomeRecord = createClinicalOutcome(outcomePayload);
    const now = new Date().toISOString();

    // Auto-generate linked 42-day continuing care plan!
    const followUp = createFollowUpPlan({
      referralId: target.id,
      patientId: target.patientId,
      patientName: target.patientName,
      referralType: target.referralType,
      leadWorker: target.navigator?.name || "Maya Lin, MSW",
    });

    updateReferral(id, (r) => ({
      ...r,
      status: ReferralStatus.COMPLETED,
      clinicalOutcome: outcomeRecord,
      followUpPlan: followUp,
      timeline: [
        ...(r.timeline || []),
        {
          status: ReferralStatus.CLINICAL_ASSESSMENT_RECORDED,
          date: now,
          notes: `Clinical assessment completed by ${outcomeRecord.clinicianName} (${outcomeRecord.clinicianRole}). Disposition: ${outcomeRecord.disposition}.`,
        },
        {
          status: ReferralStatus.COMPLETED,
          date: now,
          notes: `Referral care episode completed. Linked 42-day continuous care plan activated.`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: outcomeRecord.clinicianName,
          role: "attending_clinician",
          action: "CLINICAL_OUTCOME_RECORDED",
          details: `Clinical findings logged. Disposition: ${outcomeRecord.disposition}.`,
          timestamp: now,
        }),
      ],
    }));
    return { success: true };
  };

  // Backwards compatible status updater with validation
  const updateReferralStatus = (id, newStatus, note = "") => {
    const target = getReferralById(id);
    if (!target) return;

    if (newStatus === ReferralStatus.ACKNOWLEDGED) {
      return acknowledgeReferral(id, "Intake Staff", note);
    }
    if (newStatus === ReferralStatus.ARRIVAL_CONFIRMED) {
      return confirmArrival(id, { notes: note });
    }
    if (newStatus === ReferralStatus.COMPLETED) {
      return recordClinicalOutcome(id, { clinicalNotes: note });
    }

    const validation = validateReferralTransition(target.status, newStatus);
    if (!validation.valid) {
      console.warn("Invalid transition rejected:", validation.reason);
      return;
    }

    const now = new Date().toISOString();
    updateReferral(id, (r) => ({
      ...r,
      status: newStatus,
      timeline: [
        ...(r.timeline || []),
        {
          status: newStatus,
          date: now,
          notes: note || `Status transitioned to ${newStatus}`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: "Care Coordinator",
          role: "coordinator",
          action: `STATUS_${newStatus}`,
          details: note || `Status updated to ${newStatus}`,
          timestamp: now,
        }),
      ],
    }));
  };

  // ==========================================
  // BARRIER MANAGEMENT ACTIONS
  // ==========================================

  const identifyBarrier = (referralId, barrierPayload) => {
    const newBarrier = createBarrier(barrierPayload);
    const now = new Date().toISOString();

    updateReferral(referralId, (r) => ({
      ...r,
      barriers: [...(r.barriers || []), newBarrier],
      timeline: [
        ...(r.timeline || []),
        {
          status: "BARRIER_FLAGGED",
          date: now,
          notes: `Barrier Flagged: ${newBarrier.title} (${newBarrier.category}).`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: "Care Navigator",
          role: "navigator",
          action: "BARRIER_IDENTIFIED",
          details: `New barrier logged: ${newBarrier.title}.`,
          timestamp: now,
        }),
      ],
    }));
    return newBarrier;
  };

  const updateBarrierStatus = (referralId, barrierId, nextStatus, notes = "") => {
    const now = new Date().toISOString();
    updateReferral(referralId, (r) => {
      const updatedBarriers = (r.barriers || []).map((b) => {
        if (b.id !== barrierId) return b;
        return {
          ...b,
          status: nextStatus,
          resolvedAt: nextStatus === BarrierStatus.RESOLVED ? now : b.resolvedAt,
          resolutionNotes: notes || b.resolutionNotes,
        };
      });

      return {
        ...r,
        barriers: updatedBarriers,
        timeline: [
          ...(r.timeline || []),
          {
            status: nextStatus === BarrierStatus.RESOLVED ? "BARRIER_RESOLVED" : "BARRIER_UPDATED",
            date: now,
            notes: notes || `Barrier #${barrierId} updated to ${nextStatus}.`,
          },
        ],
        auditTrail: [
          ...(r.auditTrail || []),
          createAuditEvent({
            actor: "Care Navigator",
            role: "navigator",
            action: `BARRIER_${nextStatus}`,
            details: `Barrier ${barrierId} marked ${nextStatus}. Notes: ${notes}`,
            timestamp: now,
          }),
        ],
      };
    });
  };

  // Legacy resolveBarrier compatibility
  const resolveBarrier = (referralId, barrierIdOrTitle, resolutionNote = "") => {
    const target = getReferralById(referralId);
    if (!target) return;

    // Find barrier by ID or title
    const matching = (target.barriers || []).find(
      (b) => b.id === barrierIdOrTitle || b.title?.includes(barrierIdOrTitle)
    );

    const bId = matching ? matching.id : target.barriers?.[0]?.id;
    if (bId) {
      updateBarrierStatus(referralId, bId, BarrierStatus.RESOLVED, resolutionNote || "Barrier resolved by coordinator.");
    }
  };

  // ==========================================
  // TRANSPORT MANAGEMENT ACTIONS
  // ==========================================

  const requestTransport = (referralId, transportPayload) => {
    const newRequest = createTransportRequest({
      ...transportPayload,
      referralId,
      status: TransportStatus.REQUESTED,
    });
    const now = new Date().toISOString();

    updateReferral(referralId, (r) => ({
      ...r,
      transit: newRequest,
      transitBarrier: true,
      timeline: [
        ...(r.timeline || []),
        {
          status: "TRANSIT_REQUESTED",
          date: now,
          notes: `Medical transit requested. Pickup: ${newRequest.pickupAddress}.`,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor: "Care Coordinator",
          role: "coordinator",
          action: "TRANSPORT_REQUESTED",
          details: `Transit requested. Vehicle type: ${newRequest.vehicleType}.`,
          timestamp: now,
        }),
      ],
    }));
    return newRequest;
  };

  const dispatchTransport = (referralId, dispatchPayload) => {
    const target = getReferralById(referralId);
    if (!target) return;

    // Normalize dispatch payload (whether passed as string or object)
    const normalized =
      typeof dispatchPayload === "string"
        ? {
            vehicle: dispatchPayload,
            driver: "Marcus Ross",
            driverPhone: "(555) 481-9921",
            eta: "12 mins",
            requiresInfantCarSeat: dispatchPayload.toLowerCase().includes("car seat"),
          }
        : dispatchPayload;

    const now = new Date().toISOString();

    updateReferral(referralId, (r) => {
      const updatedTransit = {
        ...(r.transit || createTransportRequest({ referralId })),
        ...normalized,
        status: TransportStatus.DISPATCHED,
        dispatchedAt: now,
      };

      // Also resolve any transport barriers
      const updatedBarriers = (r.barriers || []).map((b) => {
        if (b.category === "TRANSPORT") {
          return {
            ...b,
            status: BarrierStatus.RESOLVED,
            resolvedAt: now,
            resolutionNotes: `MediRide transit dispatched: ${normalized.vehicle} (Driver: ${normalized.driver}).`,
          };
        }
        return b;
      });

      return {
        ...r,
        transit: updatedTransit,
        barriers: updatedBarriers,
        timeline: [
          ...(r.timeline || []),
          {
            status: "TRANSIT_DISPATCHED",
            date: now,
            notes: `MediRide transit dispatched: ${normalized.vehicle} (Driver: ${normalized.driver}, ETA: ${normalized.eta || "15 mins"}).`,
          },
        ],
        auditTrail: [
          ...(r.auditTrail || []),
          createAuditEvent({
            actor: "Marcus Ward, RN",
            role: "navigator",
            action: "TRANSPORT_DISPATCHED",
            details: `Transit unit dispatched: ${normalized.vehicle}. Driver: ${normalized.driver}.`,
            timestamp: now,
          }),
        ],
      };
    });
  };

  const recordTransportPickup = (referralId) => {
    const now = new Date().toISOString();
    updateReferral(referralId, (r) => {
      if (!r.transit) return r;
      return {
        ...r,
        transit: {
          ...r.transit,
          status: TransportStatus.PICKED_UP,
          pickedUpAt: now,
        },
        timeline: [
          ...(r.timeline || []),
          {
            status: "TRANSIT_PICKED_UP",
            date: now,
            notes: `Driver ${r.transit.driver} confirmed patient and support person picked up. En route to ${r.toFacility}.`,
          },
        ],
      };
    });
  };

  const recordTransportFailure = (referralId, reason = "Vehicle breakdown or patient unable to board") => {
    const now = new Date().toISOString();
    updateReferral(referralId, (r) => {
      if (!r.transit) return r;
      return {
        ...r,
        transit: {
          ...r.transit,
          status: TransportStatus.FAILED,
          failedReason: reason,
        },
        timeline: [
          ...(r.timeline || []),
          {
            status: "TRANSIT_FAILED",
            date: now,
            notes: `Transit disruption reported: ${reason}. Escalated to Care Coordinator.`,
          },
        ],
        auditTrail: [
          ...(r.auditTrail || []),
          createAuditEvent({
            actor: r.transit.driver || "Transit Driver",
            role: "transport_driver",
            action: "TRANSPORT_FAILED",
            details: `Transit failed: ${reason}`,
            timestamp: now,
          }),
        ],
      };
    });
  };

  // ==========================================
  // CONTINUITY OF CARE ACTIONS
  // ==========================================

  const completeFollowUpTask = (referralId, taskId, notes = "") => {
    const now = new Date().toISOString();
    updateReferral(referralId, (r) => {
      if (!r.followUpPlan) return r;

      const updatedTasks = r.followUpPlan.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: FollowUpStatus.COMPLETED,
          completedAt: now,
          completedBy: r.navigator?.name || "Maya Lin, MSW",
          notes: notes || t.notes,
        };
      });

      const allDone = updatedTasks.every((t) => t.status === FollowUpStatus.COMPLETED);

      return {
        ...r,
        followUpPlan: {
          ...r.followUpPlan,
          status: allDone ? "COMPLETED" : "ACTIVE",
          tasks: updatedTasks,
        },
        auditTrail: [
          ...(r.auditTrail || []),
          createAuditEvent({
            actor: r.navigator?.name || "Care Navigator",
            role: "navigator",
            action: "FOLLOW_UP_COMPLETED",
            details: `Completed continuous care task #${taskId}. Findings: ${notes}`,
            timestamp: now,
          }),
        ],
      };
    });
  };

  // Contact history logging
  const recordContactAttempt = (referralId, { method = "Phone Call", outcome = "Successful", notes = "", actor = "Maya Lin, MSW" }) => {
    const now = new Date().toISOString();
    updateReferral(referralId, (r) => ({
      ...r,
      contactLogs: [
        ...(r.contactLogs || []),
        {
          id: `CNT-${Date.now()}`,
          date: now,
          method,
          outcome,
          notes,
          actor,
        },
      ],
      auditTrail: [
        ...(r.auditTrail || []),
        createAuditEvent({
          actor,
          role: "navigator",
          action: "CONTACT_ATTEMPT",
          details: `${method} (${outcome}): ${notes}`,
          timestamp: now,
        }),
      ],
    }));
  };

  // Notifications management
  const markNotificationRead = (id) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const dismissNotification = (id) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  };

  // Demo Data Reset
  const resetDemoData = () => {
    StorageAdapter.clearData();
    const freshData = {
      referrals: initialSeedReferrals,
      facilities: initialFacilities,
      navigators: initialNavigators,
      fleet: initialFleet,
      notifications: initialNotifications,
    };
    setData(freshData);
    setActiveReferralId(initialSeedReferrals[0].id);
    return true;
  };

  return (
    <ReferralContext.Provider
      value={{
        referrals,
        facilities,
        navigators,
        fleet,
        notifications,
        activeReferralId,
        setActiveReferralId,
        role,
        setRole,
        logout,
        getReferralById,
        addReferral,
        acknowledgeReferral,
        rejectReferral,
        redirectReferral,
        confirmArrival,
        recordClinicalOutcome,
        updateReferralStatus,
        identifyBarrier,
        updateBarrierStatus,
        resolveBarrier,
        requestTransport,
        dispatchTransport,
        recordTransportPickup,
        recordTransportFailure,
        completeFollowUpTask,
        recordContactAttempt,
        markNotificationRead,
        dismissNotification,
        resetDemoData,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};
