import { useEffect, useRef } from "react";
import { MAX_RECORDING_SECONDS } from "../../domain/assistant.js";

const BARS = 48;
// Fixed ids: the bars never reorder, the meter only changes their heights.
const BAR_IDS = Array.from({ length: BARS }, (_, i) => `bar-${i}`);
// A new bar every 50 ms: about two and a half seconds of sound across the meter.
const STEP_MS = 50;
// Give the person time to start before saying anything is wrong.
const START_GRACE_MS = 3000;
// A pause this long after speaking means they may have moved away from the microphone.
const QUIET_MS = 1800;
const MIN_HEIGHT = 8;

// RMS level → bar height in percent, relative to this microphone's speech threshold, so a quiet
// headset moves the bars as much as a loud laptop microphone. Background noise stays near the floor.
const toHeight = (level, threshold) =>
  Math.round(MIN_HEIGHT + (100 - MIN_HEIGHT) * Math.min(1, Math.sqrt(level / (threshold * 5))));

const formatSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const STATUS = {
  waiting: { text: "Start speaking", tone: "text-ink" },
  hearing: { text: "Hearing you", tone: "text-accent" },
  quiet: { text: "Can't hear you. Speak a little closer.", tone: "text-ink" },
  unknown: { text: "Listening", tone: "text-ink" },
};

/**
 * Shows, as it happens, that the microphone is hearing the person: a status line and a waveform
 * of the last few seconds. The bars follow the real sound level; they are live data, not an
 * animation, so they have no transitions, and they show even with reduced motion because they
 * are the feedback itself. Decorative to screen readers: the surrounding "Listening" status
 * carries the meaning, and a line that flips with every pause would be noisy.
 */
const MicMeter = ({ levelRef, seconds, className = "" }) => {
  const barsRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const heights = Array.from({ length: BARS }, () => MIN_HEIGHT);
    const startedAt = performance.now();
    let frame = 0;
    let last = 0;
    let lastSpeech = null;
    let shown = "";
    const show = (key) => {
      const el = textRef.current;
      if (key === shown || !el) return;
      el.textContent = STATUS[key].text;
      el.className = `text-sm font-semibold ${STATUS[key].tone}`;
      shown = key;
    };
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      if (now - last < STEP_MS) return;
      last = now;
      const reading = levelRef.current;
      if (!reading) {
        show("unknown");
        return;
      }
      if (reading.speaking) lastSpeech = now;
      heights.shift();
      heights.push(toHeight(reading.level, reading.threshold));
      const bars = barsRef.current?.children || [];
      for (let i = 0; i < bars.length; i++) bars[i].style.height = `${heights[i]}%`;
      if (lastSpeech === null) show(now - startedAt > START_GRACE_MS ? "quiet" : "waiting");
      else show(now - lastSpeech > QUIET_MS ? "quiet" : "hearing");
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [levelRef]);

  return (
    <div
      aria-hidden="true"
      className={`rounded-control border border-line bg-muted px-3 py-2.5 space-y-2 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
        <span ref={textRef} className="text-sm font-semibold text-ink">
          Start speaking
        </span>
        {seconds !== undefined && (
          <span className="ml-auto text-sm tabular-nums text-ink-muted">
            {formatSeconds(seconds)}
            {/* The recording ends by itself at the limit, so the time left is shown. */}
            {` of ${formatSeconds(MAX_RECORDING_SECONDS)}`}
          </span>
        )}
      </div>
      <div ref={barsRef} className="flex h-10 items-center justify-between">
        {BAR_IDS.map((id) => (
          <span key={id} className="w-[3px] rounded-pill bg-accent" style={{ height: `${MIN_HEIGHT}%` }} />
        ))}
      </div>
    </div>
  );
};

export default MicMeter;
