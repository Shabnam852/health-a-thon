import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as abdm from "../services/abdm/abdmService.js";
import { createDocSync, httpTransport, startPolling } from "../services/docSync.js";
import { useReferrals } from "./ReferralContext.jsx";

const AbdmContext = createContext(null);

export const useAbdm = () => {
  const context = useContext(AbdmContext);
  if (!context) throw new Error("useAbdm must be used within an AbdmProvider");
  return context;
};

/** Health IDs and record-sharing requests, shared by the staff and family screens. */
export const AbdmProvider = ({ children }) => {
  const { now } = useReferrals();
  const [stored, setStored] = useState(() => abdm.getAbdmState());
  // Delete-by dates pass while the app is open, so expiry is worked out again as the clock ticks.
  // The saved copy catches up on the next action, which reloads it with the same rule.
  const state = useMemo(() => abdm.applyExpiry(stored, now), [stored, now]);

  const refresh = useCallback(() => setStored(abdm.getAbdmState()), []);

  // Shared with the other devices through /api/state, like the referrals: a consent asked for on
  // the hospital laptop shows on the family's phone.
  const syncRef = useRef(null);
  useEffect(() => {
    const sync = createDocSync({
      key: "abdm",
      transport: httpTransport,
      validate: abdm.normaliseAbdmState,
      onRemote: (doc) => {
        abdm.replaceAbdmState(doc);
        setStored(doc);
      },
    });
    syncRef.current = sync;
    abdm.setAbdmSaveListener((saved) => sync.setLocal(saved));
    sync.setLocal(abdm.getAbdmState());
    sync.pull();
    const stop = startPolling(sync);
    return () => {
      stop();
      abdm.setAbdmSaveListener(null);
      if (syncRef.current === sync) syncRef.current = null;
    };
  }, []);

  // Every action reloads the shared state, so the other screens see the change.
  const run = (action) => async (input) => {
    const result = await action(input);
    refresh();
    return result;
  };

  const value = {
    abhaFor: (referralId) => state.abhaLinks[referralId] ?? null,
    consentsFor: (referralId) => abdm.consentsForReferral(state, referralId),
    requestAbhaCode: abdm.requestAbhaCode,
    linkAbha: run(abdm.linkAbha),
    unlinkAbha: run(abdm.unlinkAbha),
    requestConsent: run(abdm.requestConsent),
    respondToConsent: run(abdm.respondToConsent),
    revokeConsent: run(abdm.revokeConsent),
    resetAbdm: () => {
      abdm.resetAbdmData();
      refresh();
      syncRef.current?.replace(abdm.freshAbdmState());
    },
  };

  return <AbdmContext.Provider value={value}>{children}</AbdmContext.Provider>;
};
