import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { LinkStatus, latestRequestFor } from "../domain/selfRegistration.js";
import { Button, Card, Field, Icon, Input, Page, PageHeader } from "./ui/index.js";

/**
 * What a self-registered patient or family member sees until their account is linked to a referral.
 * No case data shows here: only their own request and a way to add a referral number.
 */
const AwaitingLink = () => {
  const { account, signOut } = useAuth();
  // No patient name here: typing a referral number must not tell a stranger whose it is.
  const { linkRequests, askToLink } = useReferrals();
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const request = account ? latestRequestFor({ linkRequests }, account.id) : null;
  const waiting = request?.status === LinkStatus.PENDING;

  const submit = (e) => {
    e.preventDefault();
    if (!account) return;
    const result = askToLink(account.id, reference);
    if (!result.ok) {
      setMessage("");
      return setError(result.error);
    }
    setError("");
    setReference("");
    setMessage(result.linked ? "Linked. Opening your journey." : "");
  };

  return (
    <Page width="sm">
      <PageHeader title={`Welcome, ${account?.name ?? "there"}`} subtitle="Your account is ready" />
      <Card className="space-y-4">
        {waiting ? (
          <div role="status" className="border-l-4 border-accent bg-accent-soft p-4 rounded-control space-y-1">
            <p className="text-sm font-semibold text-ink flex items-center gap-2">
              <Icon name="hourglass_top" />
              Waiting for your care coordinator
            </p>
            <p className="text-sm text-ink">
              You asked to follow referral {request.referralId}. Your care coordinator will call you on {account.phone}{" "}
              to check, then link your account. This page opens your journey as soon as they do.
            </p>
          </div>
        ) : request?.status === LinkStatus.DECLINED ? (
          <div role="status" className="border-l-4 border-danger p-4 rounded-control space-y-1">
            <p className="text-sm font-semibold text-ink">
              Your care coordinator couldn't link referral {request.referralId}
            </p>
            {request.reason && <p className="text-sm text-ink">{request.reason}</p>}
            <p className="text-sm text-ink">Check the number on your slip, or ask your clinic.</p>
          </div>
        ) : (
          <p className="text-sm text-ink">
            To see a referral here, enter the number on the slip from your clinic. If the clinic wrote down this mobile
            number, it opens straight away. If not, your care coordinator checks with you first.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field label={waiting ? "A different referral number" : "Referral number"} hint="Like NX-9042.">
            <Input value={reference} autoCapitalize="characters" onChange={(e) => setReference(e.target.value)} />
          </Field>
          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <Icon name="error" className="shrink-0" />
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-ink">
              {message}
            </p>
          )}
          <Button type="submit" variant="primary" fullWidth disabled={!reference.trim()}>
            {waiting ? "Ask for this one instead" : "Link my referral"}
          </Button>
        </form>

        <p className="text-sm text-ink-muted">In an emergency call 108 (ambulance) or 112.</p>
        <Button variant="link" onClick={signOut}>
          Sign out
        </Button>
      </Card>
    </Page>
  );
};

export default AwaitingLink;
