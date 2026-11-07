import { useState } from "react";
import { Link } from "react-router";
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
  Icon,
  Page,
  PageHeader,
  Textarea,
} from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { telHref } from "../domain/contact.js";
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

// A number staff can tap to call; plain text when the field holds no number.
const PhoneLink = ({ contact, label }) => {
  const href = telHref(contact);
  if (!href) return contact || null;
  return (
    <a
      href={href}
      aria-label={`${label}, ${contact}`}
      className="inline-flex min-h-control-sm items-center font-semibold text-accent underline"
    >
      {contact}
    </a>
  );
};

const TransportDetail = ({ r }) => {
  const family = r.caregiverContact || r.patientPhone;
  return (
    <>
      <DetailRow label="Pickup">{r.patientAddress || "Residence on file"}</DetailRow>
      <DetailRow label="Destination">{getDestination(r)}</DetailRow>
      <DetailRow label="Family phone">
        <PhoneLink contact={family} label={`Call family of ${r.patientName}`} />
      </DetailRow>
      {r.transit?.driver && (
        <DetailRow label="Driver">
          {r.transit.driver}
          {r.transit.driverPhone && (
            <>
              {", "}
              <PhoneLink contact={r.transit.driverPhone} label={`Call driver ${r.transit.driver}`} />
            </>
          )}
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
};

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
    sortFn: (a, b) => STAGES.indexOf(a.original.stage) - STAGES.indexOf(b.original.stage),
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
      <div className="flex flex-wrap justify-start md:justify-end gap-2">
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

  const viewTabs = (
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
  );

  return (
    <Page width="full">
      <Toast toast={toast} />
      {/* The 108 fallback sits in the header, so the tabs line up with every other screen. */}
      <PageHeader
        title="Transport"
        subtitle="Patient can't wait for a van, or the van broke down? Call the 108 ambulance."
        actions={
          <Button as="a" href="tel:108" variant="danger" aria-label="Call 108 (ambulance)">
            <Icon name="call" />
            {/* Short on phones, so it fits beside the title. */}
            <span className="sm:hidden">108</span>
            <span className="max-sm:hidden">Call 108 (ambulance)</span>
          </Button>
        }
      />

      {view === "vehicles" ? (
        <DataTable
          key="vehicles"
          label="Vehicles"
          tabs={viewTabs}
          data={vans}
          columns={VAN_COLUMNS}
          searchPlaceholder="Search van, driver or kit"
          emptyText="No vehicles."
        />
      ) : (
        <DataTable
          key={view}
          label={view === "active" ? "Active rides" : "Arrived"}
          tabs={viewTabs}
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
