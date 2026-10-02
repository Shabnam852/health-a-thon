import React, { createContext, useContext, useState } from "react";
import { demoReferrals } from "../data/demoReferral";

const ReferralContext = createContext();

export const useReferrals = () => {
  return useContext(ReferralContext);
};

export const ReferralProvider = ({ children }) => {
  const [referrals, setReferrals] = useState(demoReferrals);

  // Create a new referral
  const addReferral = (newReferral) => {
    setReferrals((currentReferrals) => [
      newReferral,
      ...currentReferrals,
    ]);
  };

  // Update referral status and add an event to its timeline
  const updateReferralStatus = (id, newStatus, note = "") => {
    setReferrals((currentReferrals) =>
      currentReferrals.map((referral) => {
        if (referral.id !== id) {
          return referral;
        }

        return {
          ...referral,
          status: newStatus,
          timeline: [
            ...referral.timeline,
            {
              status: newStatus,
              date: new Date().toISOString(),
              notes: note,
            },
          ],
        };
      })
    );
  };

  // Find one referral
  const getReferralById = (id) => {
    return referrals.find((referral) => referral.id === id);
  };

  return (
    <ReferralContext.Provider
      value={{
        referrals,
        addReferral,
        updateReferralStatus,
        getReferralById,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};