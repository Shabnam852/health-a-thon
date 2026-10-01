import React, { createContext, useState, useContext } from 'react';
import { demoReferrals } from '../data/demoReferral';

const ReferralContext = createContext();

export const useReferrals = () => {
  return useContext(ReferralContext);
};

export const ReferralProvider = ({ children }) => {
  const [referrals, setReferrals] = useState(demoReferrals);

  const addReferral = (newReferral) => {
    setReferrals([newReferral, ...referrals]);
  };

  const updateReferralStatus = (id, newStatus, note = "") => {
    setReferrals(referrals.map(ref => {
      if (ref.id === id) {
        return {
          ...ref,
          status: newStatus,
          timeline: [
            ...ref.timeline,
            { status: newStatus, date: new Date().toISOString(), notes: note }
          ]
        };
      }
      return ref;
    }));
  };

  const getReferralById = (id) => {
    return referrals.find(ref => ref.id === id);
  };

  return (
    <ReferralContext.Provider value={{ referrals, addReferral, updateReferralStatus, getReferralById }}>
      {children}
    </ReferralContext.Provider>
  );
};
