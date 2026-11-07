import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { telHref } from "../domain/contact.js";
import { pendingRequests } from "../domain/selfRegistration.js";
import { Button, Card, Icon } from "./ui/index.js";

const DECLINE_REASON = "We couldn't confirm you are linked to this referral.";

/**
 * People who signed up and asked to follow a referral whose recorded numbers don't match theirs.
 * The coordinator calls them to check, then approves or declines. Shown only when there are some.
 */
const LinkRequestsCard = () => {
  const { session } = useAuth();
  const { referrals, linkRequests, decideLinkRequest } = useReferrals();
  const pending = pendingRequests({ linkRequests });
  if (pending.length === 0) return null;

  const decidedBy = session?.name ?? "Care coordinator";

  return (
    <Card as="section" data-tour="link-requests" aria-labelledby="link-requests-title" className="space-y-3">
      <h2 id="link-requests-title" className="font-semibold text-ink flex items-center gap-2">
        <Icon name="person_add" />
        Families asking to be linked ({pending.length})
      </h2>
      <p className="text-sm text-ink-muted">
        Their number isn't on the referral. Call them and check who they are before you approve.
      </p>
      <ul className="divide-y divide-line">
        {pending.map((request) => {
          const referral = referrals.find((r) => r.id === request.referralId);
          const call = telHref(request.phone);
          return (
            <li key={request.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {request.name}{" "}
                  <span className="font-normal text-ink-muted">
                    ({request.relation === "self" ? "says they are the patient" : request.relation})
                  </span>
                </p>
                <p className="text-sm text-ink-muted">
                  {request.phone} · for {referral?.patientName ?? "unknown patient"}, {request.referralId}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {call && (
                  <Button as="a" href={call} size="sm">
                    <Icon name="call" />
                    Call
                  </Button>
                )}
                <Button
                  size="sm"
                  aria-label={`Decline ${request.name}`}
                  onClick={() => decideLinkRequest(request.id, false, decidedBy, DECLINE_REASON)}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  aria-label={`Approve ${request.name}`}
                  onClick={() => decideLinkRequest(request.id, true, decidedBy)}
                >
                  Approve
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default LinkRequestsCard;
