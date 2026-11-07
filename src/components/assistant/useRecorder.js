import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RECORDING_SECONDS } from "../../domain/assistant.js";

// Tap once and talk: recording stops by itself after this much quiet once speech began.
const SILENCE_MS = 2500;
// Give up if nothing is said at all.
const NO_SPEECH_MS = 7000;
// Speech is judged against each microphone's own background noise, not one fixed level: a quiet
// Bluetooth headset can sit far below a laptop microphone. These bound that judgement.
const MIN_SPEECH_LEVEL = 0.006;
const MAX_SPEECH_LEVEL = 0.025;
const NOISE_MARGIN = 2.5;
const MIN_CLIP_MS = 600;
// Above a dead or muted microphone, below speech: there was some sound.
const QUIET_SOUND_LEVEL = 0.002;
// How far above the room's noise a quiet voice must rise, so plain noise isn't sent and spend a question.
const QUIET_RISE = 1.8;

// The first one this browser can record. Safari records MP4, the others WebM or Ogg.
const pickMimeType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(
    (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t),
  ) || "";

// Automatic gain lifts quiet microphones, such as many Bluetooth headsets.
const CLEAN_AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };

/**
 * Asks for the microphone, with two retries for things Firefox does:
 * - right after the last recording it can still hold the device and say NotReadableError;
 * - some devices reject the cleanup settings (OverconstrainedError, sometimes NotFoundError).
 * A refusal (NotAllowedError) is never retried.
 */
const openMicrophone = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: CLEAN_AUDIO });
  } catch (error) {
    if (error?.name === "NotReadableError") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return navigator.mediaDevices.getUserMedia({ audio: CLEAN_AUDIO });
    }
    if (error?.name === "OverconstrainedError" || error?.name === "NotFoundError") {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw error;
  }
};

/**
 * An AudioContext at the microphone's own sample rate. Firefox can't connect a microphone
 * running at another rate (a Bluetooth headset at 16 kHz, say) and throws, which left no meter
 * and no automatic stop.
 */
const contextFor = (stream) => {
  const rate = stream.getAudioTracks()[0]?.getSettings?.().sampleRate;
  try {
    return rate ? new AudioContext({ sampleRate: rate }) : new AudioContext();
  } catch {
    return new AudioContext();
  }
};

export const canRecord = () =>
  typeof window !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof MediaRecorder !== "undefined";

/**
 * Records one spoken question. `state` is idle | starting | recording | denied | missing | busy | error.
 * missing: no microphone, or the computer blocks the browser from it (Firefox on a Mac says "not found").
 * busy: another app holds the microphone.
 * autoStop: end the clip after a pause (a family's short question). Off for dictation, where people
 * pause to think: only Stop or the time limit ends it, and every clip is sent, since a quiet
 * microphone can sit below the speech level the whole time.
 * `onClip({ blob, mimeType })` runs when a clip with speech in it is ready.
 */
export const useRecorder = ({ onClip, onNoSpeech, autoStop = true }) => {
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const session = useRef(null);
  const starting = useRef(null);
  // The live microphone level for the meter, or null when it can't be measured:
  // { level: RMS (0 to about 0.3), speaking: above this microphone's speech threshold, threshold }.
  // A ref, not state: it changes every frame and only the meter reads it.
  const levelRef = useRef(null);
  const callbacks = useRef({ onClip, onNoSpeech, autoStop });
  useEffect(() => {
    callbacks.current = { onClip, onNoSpeech, autoStop };
  });

  const cleanup = useCallback(() => {
    const s = session.current;
    if (!s) return;
    cancelAnimationFrame(s.frame);
    clearInterval(s.timer);
    for (const track of s.stream.getTracks()) track.stop();
    s.audioContext?.close().catch(() => {});
    session.current = null;
    levelRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const s = session.current;
    if (s?.recorder.state === "recording") s.recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    // Still waiting on the permission prompt: the stream is dropped as soon as it arrives.
    if (starting.current) starting.current.cancelled = true;
    const s = session.current;
    if (!s) {
      if (starting.current) setState("idle");
      return;
    }
    s.cancelled = true;
    if (s.recorder.state === "recording") s.recorder.stop();
    else cleanup();
    setState("idle");
  }, [cleanup]);

  const start = useCallback(async () => {
    if (session.current || starting.current) return;
    const attempt = { cancelled: false };
    starting.current = attempt;
    setState("starting");
    let stream;
    try {
      stream = await openMicrophone();
    } catch (error) {
      starting.current = null;
      const states = {
        NotAllowedError: "denied",
        NotFoundError: "missing",
        OverconstrainedError: "missing",
        NotReadableError: "busy",
      };
      if (!attempt.cancelled) setState(states[error?.name] || "error");
      return;
    }
    starting.current = null;
    // Closed or cancelled while the browser was asking: never record.
    if (attempt.cancelled) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    const mimeType = pickMimeType();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      // Without this the microphone stays on and the screen sticks on "starting".
      for (const track of stream.getTracks()) track.stop();
      setState("error");
      return;
    }
    const chunks = [];
    const startedAt = performance.now();
    const s = { stream, recorder, cancelled: false, heardSpeech: false, lastSound: startedAt };
    session.current = s;

    // Listen to the level, to stop when the person goes quiet.
    try {
      const audioContext = contextFor(stream);
      // Set first, so cleanup closes it even if connecting fails below.
      s.audioContext = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      // Safari starts a context made after the permission prompt suspended, which reads as silence.
      audioContext.resume?.().catch(() => {});
      const watch = () => {
        if (audioContext.state !== "running" && performance.now() - startedAt > 1000) {
          // Still no level after a second: stop judging by sound, the person taps Send.
          s.heardSpeech = true;
          levelRef.current = null;
          return;
        }
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += v * v;
        const level = Math.sqrt(sum / samples.length);
        const now = performance.now();
        // The noise floor follows the quietest moments: it drops at once and rises only slowly,
        // so speech itself doesn't raise it.
        s.floor = s.floor === undefined ? level : level < s.floor ? level : s.floor + (level - s.floor) * 0.002;
        const threshold = Math.min(MAX_SPEECH_LEVEL, Math.max(MIN_SPEECH_LEVEL, s.floor * NOISE_MARGIN));
        const speaking = level > threshold;
        levelRef.current = { level, speaking, threshold };
        s.peak = Math.max(s.peak || 0, level);
        if (speaking) {
          s.heardSpeech = true;
          s.lastSound = now;
        }
        const quietFor = now - s.lastSound;
        const pausedTooLong = s.heardSpeech && quietFor > SILENCE_MS;
        const neverSpoke = !s.heardSpeech && now - startedAt > NO_SPEECH_MS;
        if (callbacks.current.autoStop && (pausedTooLong || neverSpoke)) {
          stop();
          return;
        }
        s.frame = requestAnimationFrame(watch);
      };
      s.frame = requestAnimationFrame(watch);
    } catch {
      // No level meter: the person taps Stop, or the time limit ends it.
      s.heardSpeech = true;
    }

    setSeconds(0);
    s.timer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS) stop();
    }, 250);

    // A headset unplugged or switched mid-question: send what was caught instead of hanging.
    for (const track of stream.getAudioTracks()) track.addEventListener("ended", stop);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const { cancelled, heardSpeech, peak = 0, floor = 0 } = s;
      const longEnough = performance.now() - startedAt > MIN_CLIP_MS;
      cleanup();
      setState("idle");
      if (cancelled) return;
      // Dictation sends every clip: speech-to-text, not the level, decides if anything was said.
      // A very quiet microphone can stay under the speech level the whole time. If there was any
      // sound above plain silence, let speech-to-text decide rather than throw the question away.
      const spoke =
        heardSpeech || !callbacks.current.autoStop || peak > Math.max(QUIET_SOUND_LEVEL, floor * QUIET_RISE);
      if (!spoke || !longEnough || chunks.length === 0) {
        callbacks.current.onNoSpeech?.();
        return;
      }
      const type = recorder.mimeType || mimeType || "audio/webm";
      callbacks.current.onClip({ blob: new Blob(chunks, { type }), mimeType: type });
    };
    try {
      recorder.start(250);
    } catch {
      cleanup();
      setState("error");
      return;
    }
    setState("recording");
  }, [cleanup, stop]);

  // Leaving the screen mid-recording must release the microphone.
  useEffect(() => () => cancel(), [cancel]);

  return { state, seconds, levelRef, start, stop, cancel };
};
