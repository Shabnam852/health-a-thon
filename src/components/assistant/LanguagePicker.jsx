import { useId, useState } from "react";
import { AUTO_LANGUAGE, LANGUAGES } from "../../domain/assistant.js";
import { Button } from "../ui/index.js";

const OPTIONS = [
  { code: AUTO_LANGUAGE, native: "Match how I speak", name: "Answers in the language you use" },
  ...LANGUAGES,
];

// Asked once per patient, then changeable from the chat header.
const LanguagePicker = ({ current, suggested, onChoose, onCancel }) => {
  const [choice, setChoice] = useState(current || suggested);
  const name = useId();

  return (
    <form
      className="flex flex-col min-h-0 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        onChoose(choice);
      }}
    >
      <fieldset className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        <legend className="text-base font-semibold text-ink mb-1">Which language should I answer in?</legend>
        <p className="text-sm text-ink-muted pb-1">You can type or speak in any language. You can change this later.</p>
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
      <div className="flex gap-2 justify-end p-3 border-t border-line">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary">
          {current ? "Save" : "Start"}
        </Button>
      </div>
    </form>
  );
};

export default LanguagePicker;
