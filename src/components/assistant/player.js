import { useSyncExternalStore } from "react";

// One voice at a time across the app: starting a reply stops a Listen, and the reverse.
let audio = null;
let playingKey = null;
const listeners = new Set();

const set = (key) => {
  playingKey = key;
  for (const listener of listeners) listener();
};

export const player = {
  play(key, src) {
    player.stop();
    const clip = new Audio(src);
    const done = () => {
      if (audio === clip) set(null);
    };
    clip.addEventListener("ended", done);
    clip.addEventListener("error", done);
    audio = clip;
    set(key);
    // A browser can still block playback; the text is on screen either way.
    clip.play().catch(() => {
      if (audio === clip) set(null);
    });
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
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePlayingKey = () => useSyncExternalStore(subscribe, () => playingKey);
