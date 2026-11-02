import { useState } from "react";
import CaseCard, { DetailRow } from "../components/CaseCard.jsx";
import { FormDialog } from "../components/Dialog.jsx";
import SendVanDialog from "../components/SendVanDialog.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, EmptyState, Field, Page, PageHeader, Textarea } from "../components/ui/index.js";
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

const TransportCase = ({ r, onSendVan, onPickup, onReport }) => {
  const tr = r.transit;
  const arrived = isArrived(r);
  const failed = !arrived && tr?.status === TransportStatus.FAILED;
  const dispatched = !arrived && tr?.status === TransportStatus.DISPATCHED;
  const pickedUp = !arrived && tr?.status === TransportStatus.PICKED_UP;

  return (
    <CaseCard
      referral={r}
      summary={
        <>
          {failed && <span className="font-semibold text-danger">Last ride failed. </span>}
          {tr?.vehicle && !failed
            ? `${tr.vehicle}${tr.eta ? `, ETA ${tr.eta}` : ""}`
            : `${r.patientAddress || "Residence on file"} → ${getDestination(r)}`}
          {pickedUp && <span className="block">Waiting for the hospital to confirm arrival.</span>}
        </>
      }
      actions={
        <>
          {!arrived && canDispatchTransport(r) && (
            <Button variant="primary" onClick={() => onSendVan(r)}>
              Send a van
            </Button>
          )}
          {dispatched && (
            <Button variant="primary" onClick={() => onPickup(r)}>
              Picked up
            </Button>
          )}
          {(dispatched || pickedUp) && <Button onClick={() => onReport(r)}>Report problem</Button>}
        </>
      }
    >
      <DetailRow label="Pickup">{r.patientAddress || "Residence on file"}</DetailRow>
      <DetailRow label="Destination">{getDestination(r)}</DetailRow>
      <DetailRow label="Family phone">{r.caregiverContact || r.patientPhone}</DetailRow>
      {tr?.driver && (
        <DetailRow label="Driver">
          {tr.driver}
          {tr.driverPhone && `, ${tr.driverPhone}`}
        </DetailRow>
      )}
      <DetailRow label="Case">
        {r.id}, {r.referralType}
      </DetailRow>
    </CaseCard>
  );
};

const TransportCoordination = () => {
  const { referrals, fleet, recordTransportPickup, recordTransportFailure } = useReferrals();

  const [sendingVanFor, setSendingVanFor] = useState(null);
  const [failing, setFailing] = useState(null);
  const [failureReason, setFailureReason] = useState("");
  const { toast, showToast, report } = useToast();

  // Every case lands in exactly one group.
  const cases = referrals.filter((r) => r.transit != null || r.transitBarrier);
  const done = cases.filter(isArrived);
  const needsVan = cases.filter((r) => !isArrived(r) && canDispatchTransport(r));
  const waitingForChoice = cases.filter((r) => !isArrived(r) && isFloating(r) && !isRideMoving(r.transit));
  const onTheWay = cases.filter((r) => !isArrived(r) && !canDispatchTransport(r) && !waitingForChoice.includes(r));

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
      recordTransportFailure(failing.id, failureReason || "Mechanical breakdown / patient unable to travel"),
      `Problem recorded for ${failing.patientName} and sent to the coordinator.`,
    );
    closeFailure();
  };

  const group = (title, list) =>
    list.length > 0 && (
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-muted">
          {title} ({list.length})
        </h2>
        <ul className="space-y-4">
          {list.map((r) => (
            <TransportCase
              key={r.id}
              r={r}
              onSendVan={setSendingVanFor}
              onPickup={handlePickup}
              onReport={setFailing}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <Page>
      <Toast toast={toast} />
      <PageHeader title="Transport" />

      {group("Needs a van", needsVan)}
      {group("On the way", onTheWay)}
      {group("Waiting for the patient to choose a hospital", waitingForChoice)}
      {cases.length === 0 && <EmptyState>No transport requests.</EmptyState>}

      {done.length > 0 && (
        <details className="text-sm text-ink-muted">
          <summary className="cursor-pointer font-semibold text-ink">Arrived ({done.length})</summary>
          <ul className="mt-3 space-y-4">
            {done.map((r) => (
              <TransportCase key={r.id} r={r} />
            ))}
          </ul>
        </details>
      )}

      <details className="text-sm text-ink-muted">
        <summary className="cursor-pointer font-semibold text-ink">Vehicles ({fleet.length})</summary>
        <ul className="mt-2 space-y-2">
          {getVanStatuses(fleet, referrals).map((v) => (
            <li key={v.id} className="break-words">
              <span className="font-semibold text-ink">{v.name}</span> ({v.plate}),{" "}
              {v.busyWith ? `on a trip with ${v.busyWith}` : "free"}. {v.driver}, {v.driverPhone}. {v.equippedWith}
            </li>
          ))}
        </ul>
      </details>

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
