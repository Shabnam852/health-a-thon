import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { freshDomainState, seedShape } from "../data/freshState.js";
import { initialFacilities, initialFleet, initialNavigators, initialNotifications } from "../data/seedData.js";
import { getAlarms } from "../domain/alarms.js";
import { Role } from "../domain/enums.js";
import * as familyRequests from "../domain/familyRequests.js";
import { createReferral } from "../domain/models.js";
import { accountsForReferral, linkAccounts } from "../domain/phoneAccounts.js";
import { checkRegistration, decideLink, registerAccount, requestLink } from "../domain/selfRegistration.js";
import { addFamilyTexts } from "../domain/smsTemplates.js";
import * as workflow from "../domain/workflow.js";
import { findPhoneAccount, setLinkedPhoneAccounts } from "../services/auth/demoAccounts.js";
import { createDocSync, httpTransport, startPolling } from "../services/docSync.js";
import { normaliseDomain, StorageAdapter } from "../services/storageAdapter.js";
import { clearVoices } from "../services/voiceCache.js";

const ReferralContext = createContext();

const CLOCK_TICK_MS = 60 * 1000;

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
    return StorageAdapter.loadData(seedShape());
  });

  const referrals = data.referrals;
  // Hospitals never change while the app runs, so they are not saved.
  const facilities = initialFacilities;
  const navigators = data.navigators || initialNavigators;
  const fleet = data.fleet || initialFleet;
  const notifications = data.notifications || initialNotifications;
  const accounts = data.accounts || [];
  const linkRequests = data.linkRequests || [];
  const messages = data.messages || [];
  // Sign-in reads this list while this render runs, so it is handed over here, not in an effect.
  setLinkedPhoneAccounts(accounts);

  // Active Role and Active Referral
  const [role, setRoleState] = useState(() => StorageAdapter.getRole());
  const [activeReferralId, setActiveReferralIdState] = useState(() => {
    const saved = StorageAdapter.getActiveReferralId();
    return referrals.some((r) => r.id === saved) ? saved : referrals[0]?.id || "REF-2024-8821";
  });
  const setActiveReferralId = useCallback((id) => {
    StorageAdapter.setActiveReferralId(id);
    setActiveReferralIdState(id);
  }, []);

  // The hospital using the app: its Intake is on show, and its new referrals are sent from it.
  const [activeFacilityId, setActiveFacilityIdState] = useState(() => StorageAdapter.getActiveFacilityId());
  const activeFacility = facilities.find((f) => f.id === activeFacilityId) || facilities[0];
  const setActiveFacilityId = useCallback((id) => {
    StorageAdapter.setActiveFacilityId(id);
    setActiveFacilityIdState(id);
  }, []);

  // Alarms are worked out from the clock, so the clock has to tick.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  const alarms = useMemo(() => getAlarms(referrals, now), [referrals, now]);

  // Saved in this browser on every change, and sent to the server (Neon) so other devices see it.
  const syncRef = useRef(null);
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

  // Guided demo position, or null when no demo is running.
  const [storyStep, setStoryStepState] = useState(() => StorageAdapter.getStoryStep());

  const setStoryStep = (step) => {
    StorageAdapter.setStoryStep(step);
    setStoryStepState(step);
  };

  // Always the latest state, so two actions in one handler do not validate against a
  // stale render. Actions return their result synchronously for the UI to report.
  const dataRef = useRef(data);

  // Hands each change to the sync engine at once, not after React renders: a server copy that lands
  // in between must not be merged with a stale one (a change made after an await would be lost).
  const commit = useCallback((next, { fromServer = false } = {}) => {
    dataRef.current = next;
    setData(next);
    if (!fromServer) syncRef.current?.setLocal(next);
  }, []);

  // Shared with every other browser through /api/state: the server's copy is loaded on start and
  // checked every few seconds; if the server can't be reached the app carries on with this copy.
  useEffect(() => {
    const sync = createDocSync({
      key: "domain",
      transport: httpTransport,
      validate: (doc) => normaliseDomain(doc, seedShape()),
      onRemote: (doc) => commit(doc, { fromServer: true }),
    });
    syncRef.current = sync;
    sync.setLocal(dataRef.current);
    sync.pull();
    const stop = startPolling(sync);
    return () => {
      stop();
      if (syncRef.current === sync) syncRef.current = null;
    };
  }, [commit]);

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
      // SIMULATED SMS: a change the family should know about also adds a text to the outbox.
      commit(
        addFamilyTexts(
          { ...current, referrals: current.referrals.map((r) => (r.id === id ? result.referral : r)) },
          target,
          result.referral,
        ),
      );
    }
    return result;
  };

  // ==========================================
  // REFERRAL LIFECYCLE ACTIONS
  // ==========================================

  const addReferral = (newReferralData) => {
    const formatted = createReferral(newReferralData);
    const current = dataRef.current;
    // SIMULATED SMS: a referral that goes out straight away texts the family.
    const withTexts = addFamilyTexts(current, null, formatted);
    commit({
      ...withTexts,
      referrals: [formatted, ...current.referrals],
      // The patient's and family's mobiles can now sign in and see this referral.
      accounts: linkAccounts(current.accounts, accountsForReferral(formatted)),
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

  // The patient chooses. Anyone else on this screen is only recording what the patient said.
  const choiceRecorder = () => (role === Role.PATIENT ? workflow.PATIENT_OR_FAMILY : workflow.COORDINATOR);

  const recordPatientChoice = (id, toFacility) =>
    applyToReferral(id, (r) => workflow.recordPatientChoice(r, { toFacility, recordedBy: choiceRecorder() }));

  const recordPatientGoingElsewhere = (id, place) =>
    applyToReferral(id, (r) => workflow.recordPatientGoingElsewhere(r, { place, recordedBy: choiceRecorder() }));

  const confirmArrival = (id, arrivalPayload) => applyToReferral(id, (r) => workflow.confirmArrival(r, arrivalPayload));

  const recordClinicalOutcome = (id, outcomePayload) =>
    applyToReferral(id, (r) => workflow.recordClinicalOutcome(r, outcomePayload));

  // ==========================================
  // BARRIER MANAGEMENT ACTIONS
  // ==========================================

  // The family's assistant heard a danger sign or a practical problem: tell the staff.
  const reportFromFamily = (referralId, report) => {
    const result = applyToReferral(referralId, (r) => workflow.recordFamilyReport(r, report));
    if (!result.success) return result;
    const current = dataRef.current;
    const stamp = Date.now();
    commit({
      ...current,
      notifications: [
        ...result.alerts.map((alert, i) => ({
          id: `NOTIF-${stamp}-${i}`,
          timestamp: "Just now",
          ...alert,
          link: `/referral/${referralId}`,
          read: false,
        })),
        ...current.notifications,
      ],
    });
    return result;
  };

  const saveHandoff = (referralId, summary) => applyToReferral(referralId, (r) => workflow.saveHandoff(r, summary));

  // Checked at the hospital in use: only the receiving hospital can check a summary.
  const confirmHandoff = (referralId, confirmedBy) =>
    applyToReferral(referralId, (r) => workflow.confirmHandoff(r, { confirmedBy, facility: activeFacility?.name }));

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

  const recordTransportPickup = (referralId) => applyToReferral(referralId, (r) => workflow.recordTransportPickup(r));

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

  // ==========================================
  // SELF-REGISTRATION AND FAMILY LINKING
  // ==========================================

  /** Checks a sign-up form before the phone code is used up. */
  const checkSelfRegistration = (input) =>
    checkRegistration(dataRef.current, input, (phone) => Boolean(findPhoneAccount(phone)));

  // Sign-in looks the new account up straight away, before React renders again, so it is handed over now.
  const commitAccounts = (result) => {
    if (!result.ok) return result;
    commit(result.data);
    setLinkedPhoneAccounts(result.data.accounts);
    return result;
  };

  const registerSelf = (input) => commitAccounts(registerAccount(dataRef.current, input));

  const askToLink = (accountId, reference) => commitAccounts(requestLink(dataRef.current, { accountId, reference }));

  const decideLinkRequest = (requestId, approve, decidedBy, reason) =>
    commitAccounts(decideLink(dataRef.current, { requestId, approve, decidedBy, reason }));

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
    clearVoices();
    const freshData = freshDomainState();
    const freshReferrals = freshData.referrals;
    commit(freshData);
    // Everyone's copy starts again, not just this browser's.
    syncRef.current?.replace(freshData);
    setActiveReferralId(freshReferrals[0].id);
    setActiveFacilityIdState(null);
    setStoryStep(null);
    logout();
    return true;
  };

  // ==========================================
  // FAMILY: ARRIVAL REPORT AND CALL BACK (FR-46)
  // ==========================================

  // Same as reportFromFamily: store the referral, then tell the coordinator.
  const applyFamilyRequest = (referralId, action) => {
    const result = applyToReferral(referralId, action);
    if (!result.success) return result;
    const current = dataRef.current;
    const stamp = Date.now();
    commit({
      ...current,
      notifications: [
        ...result.alerts.map((alert, i) => ({
          id: `NOTIF-${stamp}-${i}`,
          timestamp: "Just now",
          ...alert,
          link: `/referral/${referralId}`,
          read: false,
        })),
        ...current.notifications,
      ],
    });
    return result;
  };

  // Evidence only: the hospital still confirms arrival itself.
  const reportArrivalFromFamily = (referralId, place) =>
    applyFamilyRequest(referralId, (r) => familyRequests.reportArrival(r, { place }));

  const requestCallBack = (referralId, reason) =>
    applyFamilyRequest(referralId, (r) => familyRequests.requestCallBack(r, { reason }));

  return (
    <ReferralContext.Provider
      value={{
        referrals,
        facilities,
        activeFacility,
        setActiveFacilityId,
        navigators,
        fleet,
        notifications,
        accounts,
        linkRequests,
        messages,
        checkSelfRegistration,
        registerSelf,
        askToLink,
        decideLinkRequest,
        now,
        alarms,
        activeReferralId,
        setActiveReferralId,
        role,
        setRole,
        storyStep,
        setStoryStep,
        logout,
        getReferralById,
        addReferral,
        acknowledgeReferral,
        rejectReferral,
        recordPatientChoice,
        recordPatientGoingElsewhere,
        confirmArrival,
        recordClinicalOutcome,
        identifyBarrier,
        reportFromFamily,
        saveHandoff,
        confirmHandoff,
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
        // Family: arrival report and call back (FR-46)
        reportArrivalFromFamily,
        requestCallBack,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};
