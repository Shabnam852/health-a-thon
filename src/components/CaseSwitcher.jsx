import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { FilterTabs } from "./ui/index.js";

/**
 * For a phone that follows more than one referral, such as a mother's and her newborn's (FR-80):
 * picks which one the family screens show. Hidden when there is only one.
 */
const CaseSwitcher = () => {
  const { myReferralIds } = useAuth();
  const { referrals, activeReferralId, setActiveReferralId } = useReferrals();
  const mine = myReferralIds.map((id) => referrals.find((r) => r.id === id)).filter(Boolean);
  if (mine.length < 2) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      <FilterTabs
        label="Whose journey"
        items={mine.map((r) => ({ id: r.id, label: r.patientName }))}
        selected={activeReferralId}
        onSelect={setActiveReferralId}
      />
    </div>
  );
};

export default CaseSwitcher;
