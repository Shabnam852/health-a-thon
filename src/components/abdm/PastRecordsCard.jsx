import { useState } from "react";
import { useAbdm } from "../../context/AbdmContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useReferrals } from "../../context/ReferralContext.jsx";
import {
  CARE_MANAGEMENT,
  ConsentStatus,
  DEFAULT_KEEP_DAYS,
  HI_TYPE_LABELS,
  HiType,
} from "../../services/abdm/abdmService.js";
import { FormDialog } from "../Dialog.jsx";
import { Button, Card, Field, Input, Select } from "../ui/index.js";
import { ConsentStatusBadge, formatDate, hiTypeList, RecordList } from "./abdmParts.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

const AskDialog = ({ referral, onClose }) => {
  const { requestConsent } = useAbdm();
  const { session } = useAuth();
  const { activeFacility } = useReferrals();
  const [hiTypes, setHiTypes] = useState([HiType.OP_CONSULTATION, HiType.DIAGNOSTIC_REPORT, HiType.PRESCRIPTION]);
  // Read the clock once, when the dialog opens.
  const [today] = useState(() => Date.now());
  const [fromDate, setFromDate] = useState(() => isoDay(today - 365 * DAY_MS));
  const [toDate, setToDate] = useState(() => isoDay(today));
  const [keepDays, setKeepDays] = useState(DEFAULT_KEEP_DAYS);
  const [error, setError] = useState("");

  const toggle = (type) =>
    setHiTypes((list) => (list.includes(type) ? list.filter((t) => t !== type) : [...list, type]));

  const send = async () => {
    const result = await requestConsent({
      referralId: referral.id,
      hiTypes,
      fromDate,
      toDate,
      keepDays: Number(keepDays),
      requester: {
        name: session?.name ?? "Care team",
        hprId: session?.hprId,
        facility: session?.facilityId ? activeFacility?.name : "Navexa care coordination",
      },
    });
    if (!result.ok) return setError(result.error);
    onClose();
  };

  return (
    <FormDialog
      title="Ask for past records"
      onCancel={onClose}
      onSave={send}
      saveLabel="Send request"
      saveDisabled={hiTypes.length === 0}
      error={error}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink">
          The family gets this request in their ABHA app and decides. Reason sent: {CARE_MANAGEMENT.text.toLowerCase()}.
        </p>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-ink mb-1">Kinds of record</legend>
          {Object.values(HiType).map((type) => (
            <label key={type} className="flex items-center gap-3 text-sm text-ink min-h-control-sm">
              <input
                type="checkbox"
                className="w-5 h-5 accent-accent"
                checked={hiTypes.includes(type)}
                onChange={() => toggle(type)}
              />
              {HI_TYPE_LABELS[type]}
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="From">
            <Input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={toDate} max={isoDay(today)} onChange={(e) => setToDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Delete our copy after">
          <Select value={keepDays} onChange={(e) => setKeepDays(e.target.value)}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
};

/**
 * Staff side of ABDM on a case: ask the family for records other clinics hold, and read what they
 * shared. Demo only: nothing goes to ABDM yet.
 */
const PastRecordsCard = ({ referral, className = "" }) => {
  const { abhaFor, consentsFor, respondToConsent } = useAbdm();
  const [asking, setAsking] = useState(false);
  const abha = abhaFor(referral.id);
  const consents = consentsFor(referral.id);
  const latest = consents[0];
  const waiting = latest?.status === ConsentStatus.REQUESTED;

  return (
    <Card as="section" className={`space-y-3 sm:!p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Past records (ABDM)</h2>
        {abha && !waiting && (
          <Button size="sm" variant="primary" onClick={() => setAsking(true)}>
            Ask for records
          </Button>
        )}
      </div>

      {!abha ? (
        <p className="text-sm text-ink-muted">
          No ABHA (health ID) is linked for this patient. The family can link one from their Health records screen.
        </p>
      ) : (
        <p className="text-sm text-ink-muted break-words">
          ABHA: <span className="text-ink">{abha.abhaAddress}</span>
          {abha.holderRelation !== "self" && ` (${abha.holderRelation.toLowerCase()}'s)`}
        </p>
      )}

      {latest && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ConsentStatusBadge status={latest.status} />
            <span className="text-xs text-ink-muted">
              Asked {formatDate(latest.createdAt)} by {latest.requester.name}
            </span>
          </div>
          <p className="text-sm text-ink">
            {hiTypeList(latest.hiTypes)}, {formatDate(latest.dateRange.from)} to {formatDate(latest.dateRange.to)}
          </p>
          {waiting && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-ink-muted flex-1 min-w-48">
                Waiting for the family to answer in their ABHA app.
              </p>
              <Button size="sm" onClick={() => respondToConsent({ consentId: latest.id, approve: true })}>
                Demo only: family says yes
              </Button>
            </div>
          )}
          {latest.status === ConsentStatus.GRANTED && (
            <>
              <p className="text-xs text-ink-muted">Our copy is deleted on {formatDate(latest.dataEraseAt)}.</p>
              <RecordList records={latest.records} />
            </>
          )}
        </div>
      )}

      {consents.length > 1 && (
        <p className="text-xs text-ink-muted">
          {consents.length - 1} earlier request{consents.length > 2 ? "s" : ""}.
        </p>
      )}
      <p className="text-xs text-ink-muted">Demo only. No request goes to ABDM yet.</p>

      {asking && <AskDialog referral={referral} onClose={() => setAsking(false)} />}
    </Card>
  );
};

export default PastRecordsCard;
