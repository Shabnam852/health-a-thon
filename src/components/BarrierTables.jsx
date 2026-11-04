import { useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BARRIER_CATEGORY_LABELS, BarrierCategory, BarrierStatus } from "../domain/enums.js";
import { canDispatchTransport, findOpenBarrier, getDestination, isRideMoving } from "../domain/workflow.js";
import { FormDialog } from "./Dialog.jsx";
import { actionsColumn, caseIdColumn, patientColumn, priorityColumn, serialColumn } from "./referralColumns.jsx";
import SendVanDialog from "./SendVanDialog.jsx";
import { Button, DataTable, DetailRow, Field, Textarea } from "./ui/index.js";

const categoryLabel = (c) => BARRIER_CATEGORY_LABELS[c] || c;

const BarrierDetail = ({ r }) => {
  const barrier = findOpenBarrier(r);
  return (
    <>
      <DetailRow label="Barrier">{barrier.description || r.reason}</DetailRow>
      <DetailRow label="Barrier status">{barrier.status}</DetailRow>
      <DetailRow label="Route">
        {r.fromFacility} → {getDestination(r)}
      </DetailRow>
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
      <Button as={Link} to={`/referral/${r.id}`} variant="link" size="flush">
        Open case
      </Button>
    </>
  );
};

const barrierColumns = (getBarrier) => [
  serialColumn(),
  caseIdColumn(),
  patientColumn(),
  priorityColumn(),
  {
    id: "category",
    header: "Type",
    accessorFn: (r) => getBarrier(r).category,
    meta: { filter: true, label: categoryLabel, className: "whitespace-nowrap" },
    cell: ({ getValue }) => categoryLabel(getValue()),
  },
  {
    id: "barrier",
    header: "Barrier",
    accessorFn: (r) => getBarrier(r).title,
    meta: { className: "min-w-56 text-ink-muted" },
  },
];

const lastBarrier = (r) => r.barriers[r.barriers.length - 1];

// Any open transport barrier counts, not only the first open one.
const hasOpenTransportBarrier = (r) =>
  (r.barriers || []).some((b) => b.status !== BarrierStatus.RESOLVED && b.category === BarrierCategory.TRANSPORT);

const OPEN_COLUMNS = [
  ...barrierColumns(findOpenBarrier),
  {
    id: "van",
    header: "Van",
    // The vehicle's name only; driver and kit are on the Transport page. A failed or cancelled
    // ride keeps its vehicle on the record, but that van is no longer coming.
    accessorFn: (r) =>
      r.transit?.vehicle && isRideMoving(r.transit)
        ? `${r.transit.vehicle.split(" (")[0]}${r.transit.eta ? `, ETA ${r.transit.eta}` : ""}`
        : "",
    meta: { className: "whitespace-nowrap" },
  },
  actionsColumn(({ row: { original: r }, table }) => (
    <div className="flex justify-end gap-2">
      {hasOpenTransportBarrier(r) && canDispatchTransport(r) && (
        <Button
          aria-label={`Send van for ${r.patientName}`}
          size="sm"
          variant="primary"
          onClick={() => table.options.meta.onSendVan(r)}
        >
          Send van
        </Button>
      )}
      <Button aria-label={`Close barrier for ${r.patientName}`} size="sm" onClick={() => table.options.meta.onClose(r)}>
        Close barrier
      </Button>
    </div>
  )),
];
const RESOLVED_COLUMNS = barrierColumns(lastBarrier);

export const getBlocked = (referrals) => referrals.filter(findOpenBarrier);
export const getSolved = (referrals) => referrals.filter((r) => !findOpenBarrier(r) && (r.barriers || []).length > 0);

/** Open barriers (with Send van and Close barrier), or barriers already solved. */
const BarrierTables = ({ view, onResult }) => {
  const { referrals, resolveBarrier } = useReferrals();
  const [sendingVanFor, setSendingVanFor] = useState(null);
  const [closing, setClosing] = useState(null);
  const [closingNote, setClosingNote] = useState("");

  const closeDialog = () => {
    setClosing(null);
    setClosingNote("");
  };

  const handleCloseBarrier = () => {
    onResult(
      resolveBarrier(closing.id, findOpenBarrier(closing).id, closingNote.trim()),
      `Barrier closed for ${closing.patientName}.`,
    );
    closeDialog();
  };

  return (
    <>
      {view === "blocked" ? (
        <DataTable
          key="blocked"
          label="Open barriers"
          data={getBlocked(referrals)}
          columns={OPEN_COLUMNS}
          context={{ onSendVan: setSendingVanFor, onClose: setClosing }}
          searchPlaceholder="Search name, ID or barrier"
          emptyText="No open barriers."
          noMatchText="No barriers match."
          renderDetail={(r) => <BarrierDetail r={r} />}
        />
      ) : (
        <DataTable
          key="solved"
          label="Barriers solved"
          data={getSolved(referrals)}
          columns={RESOLVED_COLUMNS}
          searchPlaceholder="Search name, ID or barrier"
          emptyText="No barriers solved yet."
          noMatchText="No barriers match."
        />
      )}

      {sendingVanFor && (
        <SendVanDialog referral={sendingVanFor} onClose={() => setSendingVanFor(null)} onResult={onResult} />
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
    </>
  );
};

export default BarrierTables;
