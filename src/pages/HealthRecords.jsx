import { useState } from "react";
import { ConsentStatusBadge, formatDate, hiTypeList } from "../components/abdm/abdmParts.jsx";
import { usePatientCase } from "../components/assistant/usePatientCase.js";
import { Button, Card, EmptyState, Field, Icon, Input, Page, PageHeader } from "../components/ui/index.js";
import { useAbdm } from "../context/AbdmContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ConsentStatus } from "../services/abdm/abdmService.js";

const ErrorText = ({ children }) =>
  children ? (
    <p role="alert" className="flex items-start gap-2 text-sm text-danger">
      <Icon name="error" className="shrink-0" />
      {children}
    </p>
  ) : null;

const LinkAbha = ({ referral, holderName }) => {
  const { requestAbhaCode, linkAbha } = useAbdm();
  const [abhaAddress, setAbhaAddress] = useState("");
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const ask = async (e) => {
    e.preventDefault();
    const result = await requestAbhaCode({ abhaAddress });
    if (!result.ok) return setError(result.error);
    setError("");
    setCode(result.demoCode);
    setSent(result);
  };

  const confirm = async (e) => {
    e.preventDefault();
    const result = await linkAbha({ referralId: referral.id, abhaAddress, holderName, code });
    if (!result.ok) setError(result.error);
  };

  if (sent) {
    return (
      <form onSubmit={confirm} className="space-y-4" noValidate>
        <div role="status" className="border-l-4 border-accent bg-accent-soft p-4 rounded-control">
          <p className="text-sm text-ink">
            ABDM sends a code to the phone linked to your ABHA. Demo only, we filled in your code:{" "}
            <span className="font-semibold tabular-nums tracking-wider">{sent.demoCode}</span>.
          </p>
        </div>
        <Field label="Code">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={code.length !== 6}>
            Link my ABHA
          </Button>
          <Button onClick={() => setSent(null)}>Back</Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={ask} className="space-y-4" noValidate>
      <p className="text-sm text-ink">
        Your ABHA is your national health ID. With it, the hospital can ask to see records from other clinics. You
        decide every time.
      </p>
      <Field label="ABHA address or number" hint="For example name@sbx, or the 14 digits on your ABHA card.">
        <Input value={abhaAddress} onChange={(e) => setAbhaAddress(e.target.value)} autoComplete="off" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="primary">
        Send me a code
      </Button>
    </form>
  );
};

const RequestRow = ({ consent }) => {
  const { respondToConsent, revokeConsent } = useAbdm();
  const { status } = consent;

  return (
    <li className="py-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ConsentStatusBadge status={status} audience="family" />
        <span className="text-xs text-ink-muted">{formatDate(consent.createdAt)}</span>
      </div>
      <p className="text-sm text-ink">
        <span className="font-semibold">{consent.requester.name}</span>
        {consent.requester.facility && `, ${consent.requester.facility}`} wants to see:{" "}
        {hiTypeList(consent.hiTypes).toLowerCase()}, from {formatDate(consent.dateRange.from)} to{" "}
        {formatDate(consent.dateRange.to)}.
      </p>
      <p className="text-xs text-ink-muted">Reason: {consent.purpose.text.toLowerCase()}.</p>

      {status === ConsentStatus.REQUESTED && (
        <>
          <p className="text-xs text-ink-muted">In real use, you answer this in your ABHA app.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => respondToConsent({ consentId: consent.id, approve: true })}>
              Yes, share
            </Button>
            <Button onClick={() => respondToConsent({ consentId: consent.id, approve: false })}>No</Button>
          </div>
        </>
      )}
      {status === ConsentStatus.GRANTED && (
        <>
          <p className="text-sm text-ink">
            {consent.records.length} record{consent.records.length === 1 ? "" : "s"} shared. The hospital's copy is
            deleted on {formatDate(consent.dataEraseAt)}.
          </p>
          <Button variant="danger-quiet" onClick={() => revokeConsent({ consentId: consent.id })}>
            Stop sharing now
          </Button>
        </>
      )}
    </li>
  );
};

/** The family's side of ABDM: link their health ID, and answer requests to see their records. */
const HealthRecords = () => {
  const { referral } = usePatientCase();
  const { session } = useAuth();
  const { abhaFor, consentsFor, unlinkAbha } = useAbdm();

  if (!referral) {
    return (
      <Page width="md">
        <PageHeader title="Health records" />
        <EmptyState pictogram="clipboard">No care case is linked to this account yet.</EmptyState>
      </Page>
    );
  }

  const abha = abhaFor(referral.id);
  const consents = consentsFor(referral.id);
  const holderName = session?.relation === "self" ? session.name : referral.patientName;

  return (
    <Page width="md">
      <PageHeader title="Health records" subtitle="Your health ID, and who can see your records" />

      <Card title="Your ABHA (health ID)" className="space-y-3">
        {abha ? (
          <>
            <p className="text-sm text-ink break-words">
              <span className="font-semibold">{abha.abhaAddress}</span>, linked {formatDate(abha.linkedAt)}
            </p>
            <Button size="sm" variant="link" onClick={() => unlinkAbha({ referralId: referral.id })}>
              Unlink
            </Button>
          </>
        ) : (
          <LinkAbha referral={referral} holderName={holderName} />
        )}
      </Card>

      <Card title="Requests to see your records">
        {consents.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No requests yet. When a hospital asks, it shows here and in your ABHA app.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {consents.map((c) => (
              <RequestRow key={c.id} consent={c} />
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-ink-muted">Demo only. Nothing is sent to ABDM yet.</p>
    </Page>
  );
};

export default HealthRecords;
