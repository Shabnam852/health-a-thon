import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AUTO_LANGUAGE, getLanguage, profileLanguageCode } from "../../domain/assistant.js";
import { assistantStore } from "../../services/assistantStore.js";
import Dialog from "../Dialog.jsx";
import { Button, Icon } from "../ui/index.js";
import { chatStrings, chatStringsLang } from "./chatStrings.js";
import LanguagePicker from "./LanguagePicker.jsx";
import { useAssistantStore } from "./useAssistantChat.js";
import { usePatientCase } from "./usePatientCase.js";

/**
 * The family's one language setting, in the header of every family screen. Listen, the chat and
 * its words all follow it. Until the family picks one it is the language on the patient's record,
 * and the button always shows which language that is, so nothing is spoken in a surprise language.
 */
const LanguageButton = () => {
  const { referral } = usePatientCase();
  const snapshot = useAssistantStore();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  if (!referral) return null;

  const chosen = snapshot.languages[referral.id] ?? null;
  const fromRecord = profileLanguageCode(referral.language);
  const shown = getLanguage(chosen && chosen !== AUTO_LANGUAGE ? chosen : fromRecord) ?? getLanguage("en-IN");
  const t = chatStrings(chosen, fromRecord);
  const lang = chatStringsLang(chosen, fromRecord);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        className="px-3"
        onClick={() => setOpen(true)}
        aria-label={`Language: ${shown.name}. Change language`}
        title="Change language"
      >
        <Icon name="translate" />
        <span lang={shown.code} className="text-sm font-semibold">
          {shown.native}
        </span>
      </Button>
      {/* Out of the header, whose stacking layer would put the tabs and Ask button over the dialog. */}
      {open &&
        createPortal(
          <Dialog title="Language" onClose={close}>
            <LanguagePicker
              strings={t}
              lang={lang}
              current={chosen || fromRecord}
              suggested={fromRecord}
              onChoose={(code) => {
                assistantStore.setLanguage(referral.id, code);
                close();
              }}
              onCancel={close}
            />
          </Dialog>,
          document.body,
        )}
    </>
  );
};

export default LanguageButton;
