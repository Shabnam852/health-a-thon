import { useState } from "react";
import { useNavigate } from "react-router";
import { useReferrals } from "../context/ReferralContext.jsx";
import { FormDialog } from "./Dialog.jsx";
import { Button, Icon } from "./ui/index.js";

const ResetDemoButton = () => {
  const { resetDemoData } = useReferrals();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmReset = () => {
    resetDemoData();
    setIsConfirming(false);
    navigate("/");
  };

  return (
    <>
      <Button size="icon" onClick={() => setIsConfirming(true)} aria-label="Reset demo" title="Reset demo">
        <Icon name="restart_alt" />
      </Button>

      {isConfirming && (
        <FormDialog
          title="Reset demo?"
          danger
          onCancel={() => setIsConfirming(false)}
          onSave={confirmReset}
          saveLabel="Reset"
        >
          <p className="text-sm text-ink-muted">This restores all demo cases to their starting state.</p>
        </FormDialog>
      )}
    </>
  );
};

export default ResetDemoButton;
