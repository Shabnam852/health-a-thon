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
import {
  Badge,
  Button,
  DataTable,
  DetailRow,
  Field,
  FilterTabs,
  Page,
  PageHeader,
  Textarea,
} from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { TransportStatus } from "../domain/enums.js";
import { getVanStatuses } from "../domain/fleet.js";
import {
  canDispatchTransport,
  getDestination,
  hasArrivedAtFacility,
  isFloating,
  isRideMoving,
} from "../domain/workflow.js";

const isArrived = (r) => r.transit?.status === TransportStatus.ARRIVED || hasArrivedAtFacility(r);

const TransportDetail = ({ r }) => (
  <>
    <DetailRow label="Pickup">{r.patientAddress || "Residence on file"}</DetailRow>
    <DetailRow label="Destination">{getDestination(r)}</DetailRow>
    <DetailRow label="Family phone">{r.caregiverContact || r.patientPhone}</DetailRow>
    {r.transit?.driver && (
      <DetailRow label="Driver">
        {r.transit.driver}
        {r.transit.driverPhone && `, ${r.transit.driverPhone}`}
      </DetailRow>
    )}
    <DetailRow label="Case">
      {r.id}, {r.referralType}
    </DetailRow>
    <Button as={Link} to={`/referral/${r.id}`} variant="link" size="flush">
      Open case
    </Button>
  </>
);

const STAGES = ["Needs a van", "On the way", "Waiting for the patient to choose", "Arrived"];

const RIDE_COLUMNS = [
  serialColumn(),
  caseIdColumn(),
  patientColumn(),
  priorityColumn(),
  {
    id: "stage",
    header: "Stage",
    accessorKey: "stage",
    sortingFn: (a, b) => STAGES.indexOf(a.original.stage) - STAGES.indexOf(b.original.stage),
    meta: { filter: true, className: "whitespace-nowrap" },
    cell: ({ getValue }) => <Badge tone={getValue() === STAGES[0] ? "danger" : "neutral"}>{getValue()}</Badge>,
  },
  {
    id: "ride",
    header: "Ride",
    accessorFn: (r) => {
      const tr = r.transit;
      if (tr?.vehicle && tr.status !== TransportStatus.FAILED) return `${tr.vehicle}${tr.eta ? `, ETA ${tr.eta}` : ""}`;
      return `${r.patientAddress || "Residence on file"} → ${getDestination(r)}`;
    },
    meta: { className: "min-w-56 text-ink-muted" },
    cell: ({ getValue, row: { original: r } }) => (
      <>
        {!isArrived(r) && r.transit?.status === TransportStatus.FAILED && (
          <span className="font-semibold text-danger">Last ride failed. </span>
        )}
        {getValue()}
        {!isArrived(r) && r.transit?.status === TransportStatus.PICKED_UP && (
          <span className="block">Waiting for the hospital to confirm arrival.</span>
        )}
      </>
    ),
  },
  actionsColumn(({ row: { original: r }, table }) => {
    if (isArrived(r)) return null;
    const { onSendVan, onPickup, onReport } = table.options.meta;
    const status = r.transit?.status;
    const dispatched = status === TransportStatus.DISPATCHED;
    const moving = dispatched || status === TransportStatus.PICKED_UP;
    return (
      <div className="flex justify-end gap-2">
        {canDispatchTransport(r) && (
          <Button
            aria-label={`Send a van for ${r.patientName}`}
            size="sm"
            variant="primary"
            onClick={() => onSendVan(r)}
          >
            Send a van
          </Button>
        )}
        {dispatched && (
          <Button aria-label={`Picked up for ${r.patientName}`} size="sm" variant="primary" onClick={() => onPickup(r)}>
            Picked up
          </Button>
        )}
        {moving && (
          <Button aria-label={`Report problem for ${r.patientName}`} size="sm" onClick={() => onReport(r)}>
            Report problem
          </Button>
        )}
      </div>
    );
  }),
];

const VAN_COLUMNS = [
  { id: "name", header: "Vehicle", accessorKey: "name", meta: { className: "font-semibold text-ink" } },
  { id: "plate", header: "Plate", accessorKey: "plate" },
  {
    id: "state",
    header: "Status",
    accessorFn: (v) => (v.busyWith ? `On a trip with ${v.busyWith}` : "Free"),
  },
  { id: "driver", header: "Driver", accessorFn: (v) => `${v.driver}, ${v.driverPhone}` },
  { id: "kit", header: "Equipped with", accessorKey: "equippedWith", meta: { className: "min-w-56" } },
];

const TransportCoordination = () => {
  const { referrals, fleet, recordTransportPickup, recordTransportFailure } = useReferrals();

  const [sendingVanFor, setSendingVanFor] = useState(null);
  const [failing, setFailing] = useState(null);
  const [failureReason, setFailureReason] = useState("");
  const [view, setView] = useState("active");
  const { toast, showToast, report } = useToast();

  // Every case lands in exactly one group.
  const cases = referrals.filter((r) => r.transit != null || r.transitBarrier);
  const done = cases.filter(isArrived);
  const needsVan = cases.filter((r) => !isArrived(r) && canDispatchTransport(r));
  const waitingForChoice = cases.filter((r) => !isArrived(r) && isFloating(r) && !isRideMoving(r.transit));
  const onTheWay = cases.filter((r) => !isArrived(r) && !canDispatchTransport(r) && !waitingForChoice.includes(r));
  // Work first, finished rides last. The stage rides on the row so the table can sort and filter by it.
  const rows = [needsVan, onTheWay, waitingForChoice, done].flatMap((list, i) =>
    list.map((r) => ({ ...r, stage: STAGES[i] })),
  );
  const active = rows.filter((r) => r.stage !== STAGES[3]);
  const arrived = rows.filter((r) => r.stage === STAGES[3]);
  const vans = getVanStatuses(fleet, referrals);

  const handlePickup = (ref) => {
    const res = recordTransportPickup(ref.id);
    if (!res.success) return showToast(`Action failed: ${res.reason}`, "error");
    showToast(`${ref.patientName} picked up${isFloating(ref) ? "" : `, on the way to ${ref.toFacility}`}.`);
  };

  const closeFailure = () => {
    setFailing(null);
    setFailureReason("");
  };

  const handleConfirmFailure = () => {
    report(
      recordTransportFailure(failing.id, failureReason.trim() || "Mechanical breakdown / patient unable to travel"),
      `Problem recorded for ${failing.patientName} and sent to the coordinator.`,
    );
    closeFailure();
  };

  return (
    <Page width="full">
      <Toast toast={toast} />
      <PageHeader title="Transport" />

      <FilterTabs
        label="Transport view"
        items={[
          { id: "active", label: "Active", count: active.length },
          { id: "arrived", label: "Arrived", count: arrived.length },
          { id: "vehicles", label: "Vehicles", count: vans.length },
        ]}
        selected={view}
        onSelect={setView}
      />

      {view === "vehicles" ? (
        <DataTable
          key="vehicles"
          label="Vehicles"
          data={vans}
          columns={VAN_COLUMNS}
          search={false}
          emptyText="No vehicles."
        />
      ) : (
        <DataTable
          key={view}
          label={view === "active" ? "Active rides" : "Arrived"}
          data={view === "active" ? active : arrived}
          columns={RIDE_COLUMNS}
          context={{ onSendVan: setSendingVanFor, onPickup: handlePickup, onReport: setFailing }}
          searchPlaceholder="Search name, ID, van or address"
          emptyText={view === "active" ? "No rides in progress." : "No arrivals yet."}
          noMatchText="No rides match."
          renderDetail={(r) => <TransportDetail r={r} />}
        />
      )}

      {sendingVanFor && (
        <SendVanDialog referral={sendingVanFor} onClose={() => setSendingVanFor(null)} onResult={report} />
      )}

      {failing && (
        <FormDialog
          title={`Report problem: ${failing.patientName}`}
          danger
          onCancel={closeFailure}
          onSave={handleConfirmFailure}
          saveLabel="Send to coordinator"
        >
          <Field label="What happened?">
            <Textarea
              placeholder="e.g. Flooded road, flat tire, patient could not board"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
          </Field>
        </FormDialog>
      )}
    </Page>
  );
};

export default TransportCoordination;
