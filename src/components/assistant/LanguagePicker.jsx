import { useId, useState } from "react";
import { AUTO_LANGUAGE, LANGUAGES } from "../../domain/assistant.js";
import { Button } from "../ui/index.js";
import { ENGLISH_STRINGS } from "./chatStrings.js";

const OPTIONS = [
  { code: AUTO_LANGUAGE, native: "Match how I speak", name: "Answers in the language you use" },
  ...LANGUAGES,
];

// Asked once per patient, then changeable from the chat header. Its own words are in the
// language already chosen, or the one on the patient's record (strings and lang from ChatPanel).
// Every line here also shows in English, so someone stuck in a language they can't read can
// always find their way back (the usual pattern for language pickers).
const Both = ({ text, english, lang }) =>
  text === english ? (
    text
  ) : (
    <>
      <span lang={lang}>{text}</span>
      <span lang="en" className="block font-normal text-ink-muted">
        {english}
      </span>
    </>
  );

// Button labels: both on one line, "ସେଭ କରନ୍ତୁ / Save".
const SameLine = ({ text, english, lang }) =>
  text === english ? (
    text
  ) : (
    <span>
      <span lang={lang}>{text}</span> / <span lang="en">{english}</span>
    </span>
  );

const LanguagePicker = ({ current, suggested, onChoose, onCancel, strings = ENGLISH_STRINGS, lang }) => {
  const [choice, setChoice] = useState(current || suggested);
  const name = useId();
  const en = ENGLISH_STRINGS;

  return (
    <form
      className="flex flex-col min-h-0 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        onChoose(choice);
      }}
    >
      <fieldset className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        <legend className="text-base font-semibold text-ink mb-1">
          <Both text={strings.pickTitle} english={en.pickTitle} lang={lang} />
        </legend>
        <p className="text-sm text-ink-muted pb-1">
          <Both text={strings.pickHint} english={en.pickHint} lang={lang} />
        </p>
        {OPTIONS.map((option) => (
          <label
            key={option.code}
            className="flex items-center gap-3 min-h-control px-3 py-2 rounded-control border border-line cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
          >
            <input
              type="radio"
              name={name}
              value={option.code}
              checked={choice === option.code}
              onChange={() => setChoice(option.code)}
              className="w-5 h-5 accent-control shrink-0"
            />
            <span className="min-w-0">
              <span
                className="block text-sm font-semibold text-ink"
                lang={option.code === AUTO_LANGUAGE ? undefined : option.code}
              >
                {option.native}
              </span>
              {option.name !== option.native && <span className="block text-xs text-ink-muted">{option.name}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2 justify-end p-3 border-t border-line">
        {onCancel && (
          <Button onClick={onCancel} wrap>
            <SameLine text={strings.cancel} english={en.cancel} lang={lang} />
          </Button>
        )}
        <Button type="submit" variant="primary" wrap>
          <SameLine text={current ? strings.save : strings.start} english={current ? en.save : en.start} lang={lang} />
        </Button>
      </div>
    </form>
  );
};

export default LanguagePicker;
