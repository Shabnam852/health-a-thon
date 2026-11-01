import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { StorageAdapter } from "../services/storageAdapter.js";
import {
  initialFacilities,
  initialNavigators,
  initialFleet,
  initialSeedReferrals,
  initialNotifications,
} from "../data/seedData.js";
import { ReferralStatus } from "../domain/enums.js";
import { createReferral } from "../domain/models.js";
import * as workflow from "../domain/workflow.js";

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

  // Always the latest state, so two actions in one handler do not validate against a
  // stale render. Actions return their result synchronously for the UI to report.
  const dataRef = useRef(data);

  const commit = (next) => {
    dataRef.current = next;
    setData(next);
  };

  const getReferralById = (id) => {
    return dataRef.current.referrals.find((r) => r.id === id);
  };

  // Runs a workflow action on one referral and stores the result if it succeeded.
  const applyToReferral = (id, action) => {
    const target = getReferralById(id);
    if (!target) return { success: false, reason: "Referral not found" };

    const result = action(target);
    if (result.success) {
      const current = dataRef.current;
      commit({
        ...current,
        referrals: current.referrals.map((r) => (r.id === id ? result.referral : r)),
      });
    }
    return result;
  };

  // ==========================================
  // REFERRAL LIFECYCLE ACTIONS
  // ==========================================

  const addReferral = (newReferralData) => {
    const formatted = createReferral(newReferralData);
    const current = dataRef.current;
    commit({
      ...current,
      referrals: [formatted, ...current.referrals],
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
        ...current.notifications,
      ],
    });
    setActiveReferralId(formatted.id);
    return formatted;
  };

  const acknowledgeReferral = (id, actor, notes) =>
    applyToReferral(id, (r) => workflow.acknowledgeReferral(r, { actor, notes }));

  const rejectReferral = (id, actor, reason) =>
    applyToReferral(id, (r) => workflow.rejectReferral(r, { actor, reason }));

  const redirectReferral = (id, fromFacility, toFacility, reason, actor) =>
    applyToReferral(id, (r) => workflow.redirectReferral(r, { toFacility, reason, actor }));

  const confirmArrival = (id, arrivalPayload) =>
    applyToReferral(id, (r) => workflow.confirmArrival(r, arrivalPayload));

  const recordClinicalOutcome = (id, outcomePayload) =>
    applyToReferral(id, (r) => workflow.recordClinicalOutcome(r, outcomePayload));

  // Backwards compatible status updater with validation
  const updateReferralStatus = (id, newStatus, note = "") => {
    if (newStatus === ReferralStatus.ACKNOWLEDGED) {
      return acknowledgeReferral(id, "Intake Staff", note);
    }
    if (newStatus === ReferralStatus.ARRIVAL_CONFIRMED) {
      return confirmArrival(id, { notes: note });
    }
    if (newStatus === ReferralStatus.COMPLETED) {
      return recordClinicalOutcome(id, { clinicalNotes: note });
    }
    return applyToReferral(id, (r) => workflow.transitionReferralStatus(r, newStatus, note));
  };

  // ==========================================
  // BARRIER MANAGEMENT ACTIONS
  // ==========================================

  const identifyBarrier = (referralId, barrierPayload) =>
    applyToReferral(referralId, (r) => workflow.identifyBarrier(r, barrierPayload));

  const updateBarrierStatus = (referralId, barrierId, nextStatus, notes) =>
    applyToReferral(referralId, (r) => workflow.updateBarrierStatus(r, barrierId, nextStatus, notes));

  const resolveBarrier = (referralId, barrierIdOrTitle, resolutionNote) =>
    applyToReferral(referralId, (r) => workflow.resolveBarrier(r, barrierIdOrTitle, resolutionNote));

  // ==========================================
  // TRANSPORT MANAGEMENT ACTIONS
  // ==========================================

  const requestTransport = (referralId, transportPayload) =>
    applyToReferral(referralId, (r) => workflow.requestTransport(r, transportPayload));

  const dispatchTransport = (referralId, dispatchPayload) =>
    applyToReferral(referralId, (r) => workflow.dispatchTransport(r, dispatchPayload));

  const recordTransportPickup = (referralId) =>
    applyToReferral(referralId, (r) => workflow.recordTransportPickup(r));

  const recordTransportFailure = (referralId, reason) =>
    applyToReferral(referralId, (r) => workflow.recordTransportFailure(r, reason));

  // ==========================================
  // CONTINUITY OF CARE ACTIONS
  // ==========================================

  const completeFollowUpTask = (referralId, taskId, notes) =>
    applyToReferral(referralId, (r) => workflow.completeFollowUpTask(r, taskId, notes));

  // Contact history logging
  const recordContactAttempt = (referralId, contact) =>
    applyToReferral(referralId, (r) => workflow.recordContactAttempt(r, contact));

  // Notifications management
  const markNotificationRead = (id) => {
    const current = dataRef.current;
    commit({
      ...current,
      notifications: current.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  };

  const dismissNotification = (id) => {
    const current = dataRef.current;
    commit({
      ...current,
      notifications: current.notifications.filter((n) => n.id !== id),
    });
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
    commit(freshData);
    setActiveReferralId(initialSeedReferrals[0].id);
    logout();
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
