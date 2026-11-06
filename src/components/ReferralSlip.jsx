import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { buildReferralSlip, qrCodePath } from "../domain/referralSlip.js";
import Dialog from "./Dialog.jsx";
import { BrandMark, Button, Icon } from "./ui/index.js";

// Blank modules around the code, which scanners need to find its edge.
const QUIET_ZONE = 4;

const formatSent = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

// Drawn as one SVG path, so nothing is fetched. Always dark on white, which every scanner reads,
// so it keeps the paper colours in dark mode too.
const QrCode = ({ text, label }) => {
  const { size, path } = useMemo(() => qrCodePath(text), [text]);
  const box = size + QUIET_ZONE * 2;
  return (
    <div className="theme-paper shrink-0 bg-surface border border-line rounded-control p-1">
      <svg
        role="img"
        aria-label={label}
        viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
        className="slip-qr block w-40 h-40 text-ink"
        shapeRendering="crispEdges"
      >
        <path d={path} fill="currentColor" />
      </svg>
    </div>
  );
};

const Item = ({ label, children, wide = false }) => (
  <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
    <dt className="text-xs text-ink-muted">{label}</dt>
    <dd className="text-sm text-ink break-words">{children}</dd>
  </div>
);

const Hospital = ({ hospital }) => (
  <>
    <span className="block font-semibold">{hospital.name}</span>
    {hospital.address && <span className="block text-ink-muted">{hospital.address}</span>}
  </>
);

/** The slip itself: what the family takes home. No clinical notes and no priority. */
export const ReferralSlip = ({ slip }) => (
  <article className="slip space-y-4 text-ink">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">Referral number</p>
        <p className="text-2xl font-semibold tabular-nums break-words">{slip.number}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <BrandMark size="sm" />
        <span className="text-sm font-semibold">Navexa Health</span>
      </div>
    </div>

    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
      <Item label="Patient" wide>
        <span className="font-semibold">{slip.patientName}</span>
      </Item>
      <Item label="From">
        <Hospital hospital={slip.from} />
      </Item>
      <Item label="Going to">
        <Hospital hospital={slip.to} />
      </Item>
      {slip.department && <Item label="Department">{slip.department}</Item>}
      <Item label="Sent">{formatSent(slip.sentAt)}</Item>
      <Item label="Your care coordinator" wide>
        <span className="font-semibold">{slip.coordinator.name}</span>
        {", "}
        <span className="tabular-nums whitespace-nowrap">{slip.coordinator.phone}</span>
      </Item>
    </dl>

    <p className="flex items-start gap-2 rounded-control border-l-4 border-danger bg-danger-soft px-3 py-2 text-sm text-ink">
      <Icon name="emergency" className="shrink-0 text-danger" />
      <span>
        In an emergency, call <strong className="tabular-nums">{slip.emergency}</strong>.
      </span>
    </p>

    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-t border-line pt-4">
      <QrCode text={slip.signUpUrl} label={`QR code to sign up with referral ${slip.number}`} />
      <div className="min-w-0 space-y-1 text-sm max-sm:text-center">
        <p className="font-semibold">Follow this referral on your phone</p>
        <p>Scan the code with your phone camera. It opens Navexa with this referral number filled in.</p>
        <p className="text-xs text-ink-muted break-all">{slip.signUpUrl}</p>
      </div>
    </div>
  </article>
);

/**
 * The slip in a dialog, plus a copy outside the app for the printer: print CSS (index.css) hides
 * everything else, so only the slip goes on paper.
 */
const ReferralSlipDialog = ({ referral, onClose }) => {
  const { facilities } = useReferrals();
  const slip = buildReferralSlip(referral, facilities, window.location.origin);

  return (
    <>
      <Dialog
        title="Referral slip"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Icon name="print" />
              Print
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">Give this to the family. It has no clinical notes.</p>
        <ReferralSlip slip={slip} />
      </Dialog>
      {createPortal(
        <div className="slip-print theme-paper">
          <ReferralSlip slip={slip} />
        </div>,
        document.body,
      )}
    </>
  );
};

export default ReferralSlipDialog;
