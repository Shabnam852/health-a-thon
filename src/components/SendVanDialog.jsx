import { useState } from "react";
import { useReferrals } from "../context/ReferralContext.jsx";
import { buildDispatch, getFreeVans } from "../domain/fleet.js";
import Dialog from "./Dialog.jsx";
import { Button, Field, Input, Select } from "./ui/index.js";

// Choosing a van, and the arrival time the family will see, for one patient.
const SendVanDialog = ({ referral, onClose, onResult }) => {
  const { fleet, referrals, dispatchTransport } = useReferrals();
  const vans = getFreeVans(fleet, referrals);
  const [vanId, setVanId] = useState(vans[0]?.id);
  const [eta, setEta] = useState("");
  const van = vans.find((v) => v.id === vanId);

  const send = () => {
    const res = dispatchTransport(referral.id, buildDispatch(referral, van, eta.trim()));
    onResult(res, `${van.name} sent for ${referral.patientName}. Driver: ${van.driver}.`);
    onClose();
  };

  return (
    <Dialog title={`Send a van: ${referral.patientName}`} onClose={onClose}>
      {vans.length === 0 ? (
        <p className="text-sm text-ink">All vans are out. Call 108 if the patient can't wait.</p>
      ) : (
        <>
          <Field label="Van">
            <Select value={vanId} onChange={(e) => setVanId(e.target.value)}>
              {vans.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}: {v.equippedWith}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Arrives in">
            <Input placeholder="Ask the driver, e.g. 12 mins" value={eta} onChange={(e) => setEta(e.target.value)} />
          </Field>
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        {van && (
          <Button variant="primary" disabled={!eta.trim()} onClick={send}>
            Send {van.name}
          </Button>
        )}
      </div>
    </Dialog>
  );
};

export default SendVanDialog;
