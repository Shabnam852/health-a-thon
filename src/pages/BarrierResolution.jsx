import { useState } from "react";
import { Link } from "react-router-dom";
import CaseCard, { DetailRow } from "../components/CaseCard.jsx";
import { FormDialog } from "../components/Dialog.jsx";
import SendVanDialog from "../components/SendVanDialog.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, EmptyState, Field, Page, PageHeader, Textarea } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BarrierCategory } from "../domain/enums.js";
import { canDispatchTransport, findOpenBarrier, getDestination } from "../domain/workflow.js";

const BarrierCase = ({ r, onSendVan, onClose }) => {
  const barrier = findOpenBarrier(r);
  const van = r.transit?.vehicle;
  const canSendVan = barrier.category === BarrierCategory.TRANSPORT && canDispatchTransport(r);

  return (
    <CaseCard
      referral={r}
      summary={
        <>
          <p>{barrier.title}</p>
          {van && (
            <p className="font-semibold text-ink">
              Van: {van}
              {r.transit.eta && `, ETA ${r.transit.eta}`}
            </p>
          )}
        </>
      }
      actions={
        <>
          {canSendVan && (
            <Button variant="primary" onClick={() => onSendVan(r)}>
              Send van
            </Button>
          )}
          <Button onClick={() => onClose(r)}>Close barrier</Button>
        </>
      }
    >
      <DetailRow label="Barrier">{barrier.description || r.reason}</DetailRow>
      <DetailRow label="Barrier status">{barrier.status}</DetailRow>
      <DetailRow label="Route">
        {r.fromFacility} → {getDestination(r)}
      </DetailRow>
      <DetailRow label="Case">{r.id}</DetailRow>
      {(r.timeline || [])
        .slice()
        .reverse()
        .map((t) => (
          <DetailRow
            key={`${t.date}-${t.status}-${t.notes}`}
            label={new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          >
            {t.notes}
          </DetailRow>
        ))}
    </CaseCard>
  );
};

const BarrierResolution = () => {
  const { referrals, resolveBarrier } = useReferrals();
  const { toast, report } = useToast();
  const [sendingVanFor, setSendingVanFor] = useState(null);
  const [closing, setClosing] = useState(null);
  const [closingNote, setClosingNote] = useState("");

  const open = referrals.filter(findOpenBarrier);
  const resolved = referrals.filter((r) => !findOpenBarrier(r) && (r.barriers || []).length > 0);

  const closeDialog = () => {
    setClosing(null);
    setClosingNote("");
  };

  const handleCloseBarrier = () => {
    report(
      resolveBarrier(closing.id, findOpenBarrier(closing).id, closingNote.trim()),
      `Barrier closed for ${closing.patientName}.`,
    );
    closeDialog();
  };

  return (
    <Page>
      <Toast toast={toast} />
      <PageHeader title="Barriers" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-muted">Open ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState>No open barriers.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {open.map((r) => (
              <BarrierCase key={r.id} r={r} onSendVan={setSendingVanFor} onClose={setClosing} />
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <details className="text-sm text-ink-muted">
          <summary className="cursor-pointer font-semibold text-ink">Resolved ({resolved.length})</summary>
          <ul className="mt-2 space-y-2">
            {resolved.map((r) => (
              <li key={r.id} className="break-words">
                <Link to={`/referral/${r.id}`} className="font-semibold text-ink underline">
                  {r.patientName}
                </Link>
                : {r.barriers[r.barriers.length - 1].title}
              </li>
            ))}
          </ul>
        </details>
      )}

      {sendingVanFor && (
        <SendVanDialog referral={sendingVanFor} onClose={() => setSendingVanFor(null)} onResult={report} />
      )}

      {closing && (
        <FormDialog
          title={`Close barrier: ${findOpenBarrier(closing).title}`}
          onCancel={closeDialog}
          onSave={handleCloseBarrier}
          saveLabel="Close barrier"
          saveDisabled={!closingNote.trim()}
        >
          <Field label="How was it solved?">
            <Textarea value={closingNote} onChange={(e) => setClosingNote(e.target.value)} />
          </Field>
        </FormDialog>
      )}
    </Page>
  );
};

export default BarrierResolution;
