import { useReferrals } from "../../context/ReferralContext.jsx";

/** The case the patient screens are showing, so every patient view and the assistant agree. */
export const usePatientCase = () => {
  const { referrals, facilities, activeReferralId } = useReferrals();
  const referral =
    referrals.find((r) => r.id === activeReferralId) ||
    referrals.find((r) => r.patientName?.includes("Fathima")) ||
    referrals[0];
  return { referral, facilities };
};
