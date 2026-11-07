import { useEffect, useState } from "react";
import { MAX_RECORDING_SECONDS } from "../../domain/assistant.js";
import { ENGLISH_STRINGS } from "./chatStrings.js";

// How often the microphone level is checked. Nothing on screen moves with it: it only decides
// whether to say "Can't hear you".
const CHECK_MS = 250;
// Give the person time to start before saying anything is wrong.
const START_GRACE_MS = 3000;
// A pause this long after speaking means they may have moved away from the microphone.
const QUIET_MS = 1800;

const formatSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * A still "Recording" panel. No moving waveform (the no-animation rule): the panel only changes
 * when something the person must act on changes, when it can't hear them. That line is a live
 * region, so a screen reader hears it once each time it appears. The time shown is not announced.
 */
const MicMeter = ({ levelRef, seconds, strings = ENGLISH_STRINGS, lang, className = "" }) => {
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let lastSpeech = null;
    const timer = setInterval(() => {
      const reading = levelRef.current;
      if (!reading) return;
      const now = Date.now();
      if (reading.speaking) lastSpeech = now;
      setQuiet(lastSpeech === null ? now - startedAt > START_GRACE_MS : now - lastSpeech > QUIET_MS);
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [levelRef]);

  return (
    <div lang={lang} className={`rounded-control border border-line bg-muted px-3 py-2.5 space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="w-3 h-3 rounded-full bg-danger shrink-0" />
        <span className="text-sm font-semibold text-ink">{strings.recording}</span>
        {seconds !== undefined && (
          // The recording ends by itself at the limit, so the time left is shown. Not announced.
          <span aria-hidden="true" className="ml-auto text-sm tabular-nums text-ink-muted">
            {formatSeconds(seconds)}
            {` / ${formatSeconds(MAX_RECORDING_SECONDS)}`}
          </span>
        )}
      </div>
      <p role="status" className="text-sm font-semibold text-ink">
        {quiet ? strings.cantHear : ""}
      </p>
    </div>
  );
};

export default MicMeter;
