import { useState } from "react";
import { Link } from "react-router-dom";
import { FormDialog } from "../components/Dialog.jsx";
import {
  actionsColumn,
  caseIdColumn,
  patientColumn,
  priorityColumn,
  serialColumn,
} from "../components/referralColumns.jsx";
import SendVanDialog from "../components/SendVanDialog.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, DataTable, DetailRow, Field, FilterTabs, Page, PageHeader, Textarea } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BARRIER_CATEGORY_LABELS, BarrierCategory } from "../domain/enums.js";
import { canDispatchTransport, findOpenBarrier, getDestination } from "../domain/workflow.js";

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

const OPEN_COLUMNS = [
  ...barrierColumns(findOpenBarrier),
  {
    id: "van",
    header: "Van",
    // The vehicle's name only; driver and kit are on the Transport page.
    accessorFn: (r) =>
      r.transit?.vehicle ? `${r.transit.vehicle.split(" (")[0]}${r.transit.eta ? `, ETA ${r.transit.eta}` : ""}` : "",
    meta: { className: "whitespace-nowrap" },
  },
  actionsColumn(({ row: { original: r }, table }) => (
    <div className="flex justify-end gap-2">
      {findOpenBarrier(r).category === BarrierCategory.TRANSPORT && canDispatchTransport(r) && (
        <Button size="sm" variant="primary" onClick={() => table.options.meta.onSendVan(r)}>
          Send van
        </Button>
      )}
      <Button size="sm" onClick={() => table.options.meta.onClose(r)}>
        Close barrier
      </Button>
    </div>
  )),
];
const RESOLVED_COLUMNS = barrierColumns(lastBarrier);

const BarrierResolution = () => {
  const { referrals, resolveBarrier } = useReferrals();
  const { toast, report } = useToast();
  const [sendingVanFor, setSendingVanFor] = useState(null);
  const [closing, setClosing] = useState(null);
  const [closingNote, setClosingNote] = useState("");
  const [view, setView] = useState("open");

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
    <Page width="full">
      <Toast toast={toast} />
      <PageHeader title="Barriers" />

      <FilterTabs
        label="Barrier state"
        items={[
          { id: "open", label: "Open", count: open.length },
          { id: "resolved", label: "Resolved", count: resolved.length },
        ]}
        selected={view}
        onSelect={setView}
      />

      {view === "open" ? (
        <DataTable
          key="open"
          label="Open barriers"
          data={open}
          columns={OPEN_COLUMNS}
          context={{ onSendVan: setSendingVanFor, onClose: setClosing }}
          searchPlaceholder="Search name, ID or barrier"
          emptyText="No open barriers."
          noMatchText="No barriers match."
          renderDetail={(r) => <BarrierDetail r={r} />}
        />
      ) : (
        <DataTable
          key="resolved"
          label="Resolved barriers"
          data={resolved}
          columns={RESOLVED_COLUMNS}
          searchPlaceholder="Search name, ID or barrier"
          emptyText="No resolved barriers yet."
          noMatchText="No barriers match."
        />
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
