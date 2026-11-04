import { useSyncExternalStore } from "react";

// One voice at a time across the app: starting a reply stops a Listen, and the reverse.
let audio = null;
let playingKey = null;
// The clip that last failed to play, so the screen that started it can say so and offer Retry.
let failedKey = null;
const listeners = new Set();

const emit = () => {
  for (const listener of listeners) listener();
};
const set = (key) => {
  playingKey = key;
  emit();
};

export const player = {
  play(key, src) {
    player.stop();
    failedKey = null;
    const clip = new Audio(src);
    const fail = () => {
      if (audio !== clip) return;
      audio = null;
      failedKey = key;
      set(null);
    };
    clip.addEventListener("ended", () => {
      if (audio === clip) set(null);
    });
    clip.addEventListener("error", fail);
    audio = clip;
    set(key);
    // A browser can block playback or fail to decode the clip: tell the person, don't go quiet.
    clip.play().catch(fail);
  },
  stop() {
    // Clearing `audio` first stops the old clip's listeners from touching the new state.
    const clip = audio;
    audio = null;
    clip?.pause();
    if (playingKey !== null) set(null);
  },
  getKey: () => playingKey,
  toggle(key, src) {
    if (playingKey === key) player.stop();
    else player.play(key, src);
  },
  /** Forget a failure once the person has seen it and moved on. */
  clearError(key) {
    if (failedKey !== null && (key === undefined || failedKey === key)) {
      failedKey = null;
      emit();
    }
  },
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePlayingKey = () => useSyncExternalStore(subscribe, () => playingKey);

/** The key of the clip that last failed to play, or null. */
export const useFailedKey = () => useSyncExternalStore(subscribe, () => failedKey);
