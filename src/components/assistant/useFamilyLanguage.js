import { profileLanguageCode } from "../../domain/assistant.js";
import { familyLanguageCode, familyStrings } from "../familyStrings.js";
import { useAssistantStore } from "./useAssistantChat.js";
import { usePatientCase } from "./usePatientCase.js";

/**
 * The family's one language setting (set from the header's language button) for a case, as the
 * words to show and the lang attribute to put on them. Unset or "auto" follows the record.
 * Pass a referral to use it; otherwise it is the case the patient screens are showing.
 */
export const useFamilyLanguage = (referralOverride) => {
  const snapshot = useAssistantStore();
  const { referral: activeReferral } = usePatientCase();
  const referral = referralOverride || activeReferral;
  const chosen = referral ? snapshot.languages[referral.id] : null;
  const fromRecord = profileLanguageCode(referral?.language);
  const lang = familyLanguageCode(chosen, fromRecord);
  return { lang, t: familyStrings(lang) };
};
