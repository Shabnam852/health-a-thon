import { useState } from "react";
import { ASSISTANT_LIMIT } from "../domain/assistant.js";
import { assistantStore } from "../services/assistantStore.js";
import { useAssistantStore } from "./assistant/useAssistantChat.js";
import { FormDialog } from "./Dialog.jsx";
import { Button, Icon } from "./ui/index.js";

// Staff refill the family assistant's limit for this browser once it has been used up.
const ResetAssistantButton = () => {
  useAssistantStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const left = assistantStore.remaining();

  return (
    <>
      <Button
        size="icon"
        onClick={() => setIsConfirming(true)}
        aria-label={`Reset AI help limit, ${left} of ${ASSISTANT_LIMIT} left`}
        title={`AI help: ${left} of ${ASSISTANT_LIMIT} left. Reset`}
      >
        <Icon name="voice_selection" />
      </Button>

      {isConfirming && (
        <FormDialog
          title="Reset the AI help limit?"
          onCancel={() => setIsConfirming(false)}
          onSave={() => {
            assistantStore.resetUsage();
            setIsConfirming(false);
          }}
          saveLabel="Reset"
        >
          <p className="text-sm text-ink-muted">
            {left} of {ASSISTANT_LIMIT} AI questions and Listen uses are left in this browser. Resetting gives back all{" "}
            {ASSISTANT_LIMIT}.
          </p>
        </FormDialog>
      )}
    </>
  );
};

export default ResetAssistantButton;
