import React, {
  createContext,
  useContext,
  useState,
} from "react";

import { demoReferrals } from "../data/demoReferral";

const ReferralContext = createContext();

export const useReferrals = () => {
  return useContext(ReferralContext);
};

export const ReferralProvider = ({ children }) => {
  const [referrals, setReferrals] = useState(demoReferrals);

  // --------------------------------------------------
  // DEMO ROLE
  // Stored in localStorage so refresh does not reset it
  // --------------------------------------------------

  const [role, setRoleState] = useState(
    () => localStorage.getItem("navexa_role") || null
  );

  const setRole = (newRole) => {
    localStorage.setItem("navexa_role", newRole);
    setRoleState(newRole);
  };

  const logout = () => {
    localStorage.removeItem("navexa_role");
    setRoleState(null);
  };

  // --------------------------------------------------
  // REFERRAL FUNCTIONS
  // --------------------------------------------------

  const addReferral = (newReferral) => {
    setReferrals((currentReferrals) => [
      newReferral,
      ...currentReferrals,
    ]);
  };

  const updateReferralStatus = (
    id,
    newStatus,
    note = ""
  ) => {
    setReferrals((currentReferrals) =>
      currentReferrals.map((referral) => {
        if (referral.id !== id) {
          return referral;
        }

        return {
          ...referral,

          status: newStatus,

          timeline: [
            ...(referral.timeline || []),

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

  const getReferralById = (id) => {
    return referrals.find(
      (referral) => referral.id === id
    );
  };

  return (
    <ReferralContext.Provider
      value={{
        referrals,
        addReferral,
        updateReferralStatus,
        getReferralById,

        // Role functions
        role,
        setRole,
        logout,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};