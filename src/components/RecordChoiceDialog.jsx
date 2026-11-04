import { useReferrals } from "../context/ReferralContext.jsx";
import { UrgencyLevel } from "../domain/enums.js";
import Dialog from "./Dialog.jsx";
import HospitalChoice from "./HospitalChoice.jsx";
import { Button } from "./ui/index.js";

// The coordinator records the hospital a floating patient chose. The choice is the family's.
const RecordChoiceDialog = ({ referral, onClose, onResult }) => {
  const { recordPatientChoice, recordPatientGoingElsewhere } = useReferrals();
  const finish = (res, message) => {
    onResult(res, message);
    // On failure keep the dialog open, so the coordinator can pick again.
    if (res.success) onClose();
  };

  return (
    // Cancel is always in view (and Escape closes too), so the coordinator can leave without recording,
    // for example when the family has not decided yet or no hospital has a free bed.
    <Dialog
      title={`Record what ${referral.patientName} chose`}
      onClose={onClose}
      footer={<Button onClick={onClose}>Cancel</Button>}
    >
      <p className="text-sm text-ink-muted">
        Call the family first. The choice is theirs.
        {referral.priority === UrgencyLevel.STAT && (
          <strong className="block text-danger">This is an emergency: tell them to call 108 now.</strong>
        )}
      </p>
      <HospitalChoice
        referral={referral}
        noOptionsText="No suitable hospital has a free bed right now. Ask the family where they want to go."
        onChoose={(hospital) => finish(recordPatientChoice(referral.id, hospital), `Referral sent to ${hospital}.`)}
        onElsewhere={(place) =>
          finish(recordPatientGoingElsewhere(referral.id, place), `Plan saved: going to ${place}.`)
        }
      />
    </Dialog>
  );
};

export default RecordChoiceDialog;
