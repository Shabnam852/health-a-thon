import { useState } from "react";
import { useReferrals } from "../context/ReferralContext.jsx";
import { canReportArrival, hasOpenCallBack, isArrivalReportedOnly } from "../domain/familyRequests.js";
import { fill } from "./familyStrings.js";
import { Button, Card, Field, Icon, Input } from "./ui/index.js";

const REASON_MAX = 200;

// What stays true after a request: a plain box, not a live region (the toast already announced it).
const Note = ({ icon, children }) => (
  <p className="flex items-start gap-3 rounded-card border-l-4 border-accent bg-accent-soft p-3 text-sm text-ink">
    <Icon name={icon} className="text-accent mt-0.5 shrink-0" />
    <span className="min-w-0 break-words">{children}</span>
  </p>
);

/**
 * The family tells the care team they have arrived, or asks for a call back (FR-46).
 * Arrival here is only reported: the hospital still confirms it at reception.
 */
const FamilyRequestsCard = ({ referral, t, onResult }) => {
  const { reportArrivalFromFamily, requestCallBack } = useReferrals();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const name = referral.navigator?.name?.split(",")[0] || t.yourCareNavigator;

  const callBackOpen = hasOpenCallBack(referral);
  const showArrivalButton = canReportArrival(referral);
  const showCallBackButton = !callBackOpen && !asking;

  const reportArrival = () => onResult(reportArrivalFromFamily(referral.id), t.arrivedSaved);

  const sendCallBack = (e) => {
    e.preventDefault();
    const res = requestCallBack(referral.id, reason);
    onResult(res, fill(t.callBackSent, { name }));
    if (res.success) {
      setAsking(false);
      setReason("");
    }
  };

  return (
    <Card title={t.tellTeam} className="space-y-3">
      {isArrivalReportedOnly(referral) && (
        <Note icon="where_to_vote">{fill(t.arrivedReported, { id: referral.id })}</Note>
      )}
      {callBackOpen && <Note icon="phone_callback">{fill(t.callBackOpen, { name })}</Note>}
      {(showArrivalButton || showCallBackButton) && (
        <div className="flex flex-wrap gap-2">
          {showArrivalButton && (
            <Button variant="primary" wrap className="w-full sm:w-auto" onClick={reportArrival}>
              <Icon name="where_to_vote" />
              {t.arrivedButton}
            </Button>
          )}
          {showCallBackButton && (
            <Button wrap className="w-full sm:w-auto" onClick={() => setAsking(true)}>
              <Icon name="phone_callback" />
              {t.callBackButton}
            </Button>
          )}
        </div>
      )}
      {asking && !callBackOpen && (
        <form onSubmit={sendCallBack} className="space-y-3">
          <Field label={t.callBackReason}>
            <Input
              value={reason}
              maxLength={REASON_MAX}
              autoComplete="off"
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              {t.callBackSend}
            </Button>
            <Button
              onClick={() => {
                setAsking(false);
                setReason("");
              }}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default FamilyRequestsCard;
