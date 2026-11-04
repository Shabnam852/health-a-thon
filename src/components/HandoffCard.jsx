import { useRef, useState } from "react";
import { useReferrals } from "../context/ReferralContext.jsx";
import { Role } from "../domain/enums.js";
import { handoffRecord } from "../domain/workflow.js";
import { AssistantRequestError, draftHandoff } from "../services/assistantApi.js";
import { assistantStore } from "../services/assistantStore.js";
import { Badge, Button, Card, Icon } from "./ui/index.js";

// SBAR: the order hospitals hand over in, each with its letter so the eye can jump to it.
const PARTS = [
  ["S", "situation", "Situation"],
  ["B", "background", "Background"],
  ["A", "referrerAssessment", "Referrer's assessment"],
  ["R", "request", "Request"],
];

const NOT_RECORDED = "Not recorded";

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** The summary as plain text, for WhatsApp or reading out on the phone. */
export const handoffText = (referral, handoff) =>
  [
    `Handoff: case ${referral.id}`,
    handoff.confirmedAt
      ? `Checked by ${handoff.confirmedBy} at ${timeOf(handoff.confirmedAt)}`
      : "AI draft, not yet checked against the record",
    "",
    ...PARTS.map(([letter, key, label]) => `${letter} - ${label}: ${handoff[key] || NOT_RECORDED}`),
    ...(handoff.missing?.length ? ["", `Not in the record: ${handoff.missing.join(", ")}`] : []),
  ].join("\n");

/**
 * An SBAR handoff for the receiving hospital, drafted by AI from the referral record only.
 * It stays a draft until a named person at the hospital confirms they checked it.
 */
const HandoffCard = ({ referral, className = "" }) => {
  const { role, activeFacility, saveHandoff, confirmHandoff } = useReferrals();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Which version of the summary was copied, so "Copied" goes back to "Copy" once it changes.
  const [copiedVersion, setCopiedVersion] = useState(null);
  const inFlight = useRef(false);
  const handoff = referral.handoff;
  const canConfirm = role === Role.FACILITY;
  // Demo: no sign-in yet, so the person signed in is the active hospital's contact, without the job note.
  const checker = (activeFacility?.directContact || "Hospital staff").replace(/\s*\(.*\)\s*$/, "");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const version = `${handoff?.draftedAt}:${handoff?.confirmedAt}`;
  const copied = copiedVersion === version;

  const draft = async () => {
    if (inFlight.current) return;
    if (!assistantStore.takeUse()) {
      setError("The demo's AI uses are used up. Ask a team member to reset them.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const { summary } = await draftHandoff({ record: handoffRecord(referral) });
      const result = saveHandoff(referral.id, summary);
      if (!result.success) setError(result.reason);
    } catch (err) {
      if (err instanceof AssistantRequestError && !err.reachedAi) assistantStore.returnUse();
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const confirm = () => {
    const result = confirmHandoff(referral.id, checker);
    if (!result.success) setError(result.reason);
    else setError("");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handoffText(referral, handoff));
      setCopiedVersion(version);
      setError("");
    } catch {
      setError("Couldn't copy. Select the text and copy it instead.");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `Handoff: case ${referral.id}`, text: handoffText(referral, handoff) });
    } catch (err) {
      // Closing the share sheet is not an error.
      if (err?.name !== "AbortError") setError("Couldn't share. Use Copy instead.");
    }
  };

  return (
    <Card as="section" title="Handoff summary" className={`space-y-3 ${className}`}>
      {!handoff ? (
        <p className="text-sm text-ink-muted">
          A short SBAR summary for the receiving hospital, drafted by AI from this referral. Names, phone numbers and
          addresses are left out.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {handoff.confirmedAt ? (
              <Badge tone="accent">
                <Icon name="verified" size="sm" className="mr-1" />
                Checked by {handoff.confirmedBy}, {timeOf(handoff.confirmedAt)}
              </Badge>
            ) : (
              <Badge tone="caution">
                <Icon name="info" size="sm" className="mr-1" />
                AI draft, not checked yet
              </Badge>
            )}
            {handoff.draftedAt && <span className="text-xs text-ink-muted">Drafted {timeOf(handoff.draftedAt)}</span>}
          </div>

          <dl className="divide-y divide-line rounded-card border border-line">
            {PARTS.map(([letter, key, label]) => {
              const text = handoff[key] || NOT_RECORDED;
              return (
                <div key={key} className="flex items-start gap-2.5 px-3 py-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-accent-soft text-sm font-semibold text-accent"
                  >
                    {letter}
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
                    <dd className={`text-sm ${text === NOT_RECORDED ? "text-ink-muted" : "text-ink"}`}>{text}</dd>
                  </div>
                </div>
              );
            })}
          </dl>

          {handoff.missing?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink-muted">Not in the record: ask the referring team about</p>
              <ul className="flex flex-wrap gap-1.5">
                {handoff.missing.map((item) => (
                  <li key={item}>
                    <Badge tone="neutral">{item}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!handoff.confirmedAt && canConfirm && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Button variant="primary" size="sm" onClick={confirm}>
                <Icon name="verified" size="sm" />
                Mark checked
              </Button>
              <span className="text-xs text-ink-muted">as {checker}</span>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {handoff && (
          <>
            <Button size="sm" onClick={copy}>
              <Icon name={copied ? "check" : "content_copy"} size="sm" />
              {copied ? "Copied" : "Copy"}
            </Button>
            {canShare && (
              <Button size="sm" onClick={share}>
                <Icon name="share" size="sm" />
                Share
              </Button>
            )}
          </>
        )}
        {!handoff?.confirmedAt && (
          <Button
            size={handoff ? "sm" : undefined}
            onClick={draft}
            disabled={busy}
            variant={handoff ? "ghost" : "primary"}
          >
            <Icon name={handoff ? "refresh" : "edit_note"} size="sm" />
            {busy ? "Drafting…" : handoff ? "Draft again" : "Draft summary"}
          </Button>
        )}
        <p className="ml-auto text-xs text-ink-muted">Demo: made-up patients only.</p>
      </div>
      {copied && (
        <p role="status" className="sr-only">
          Summary copied.
        </p>
      )}
    </Card>
  );
};

export default HandoffCard;
