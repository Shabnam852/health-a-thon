/**
 * What the assistant remembers in this browser: how many uses are left, the language
 * each patient chose, and this visit's conversation. One small store, so the chat,
 * the Listen buttons and the staff reset button always agree.
 *
 * The use limit is per browser, which is per team member behind the Vercel login.
 * It guards against accidental spend; it is not a security control.
 */

import { ASSISTANT_LIMIT } from "../domain/assistant.js";

const USAGE_KEY = "navexa_assistant_usage";
const LANGUAGE_KEY = "navexa_assistant_language";
const CHAT_KEY = "navexa_assistant_chat";
const MAX_SAVED_MESSAGES = 40;

// Storage is reached through a getter: with site data blocked, even touching
// `localStorage` throws, and that must not crash a patient screen.
const read = (getStorage, key, fallback) => {
  try {
    const value = JSON.parse(getStorage().getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (getStorage, key, value) => {
  try {
    getStorage().setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage. The assistant still works for this visit.
  }
};

const local = () => localStorage;
const session = () => sessionStorage;

const listeners = new Set();
let snapshot = null;

const load = () => ({
  used: Math.max(0, Number(read(local, USAGE_KEY, 0)) || 0),
  languages: read(local, LANGUAGE_KEY, {}),
  chats: read(session, CHAT_KEY, {}),
});

const emit = () => {
  snapshot = load();
  for (const listener of listeners) listener();
};

const onStorage = (e) => {
  // A null key means another tab cleared all site data.
  if (e.key === null || e.key === USAGE_KEY || e.key === LANGUAGE_KEY) emit();
};

export const assistantStore = {
  subscribe(listener) {
    // One "storage" listener for the whole app, added with the first subscriber: another
    // tab used or reset the assistant.
    if (listeners.size === 0) {
      window.addEventListener("storage", onStorage);
      // Nobody was listening, so another tab may have changed things since the last read.
      snapshot = load();
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },

  getSnapshot() {
    if (!snapshot) snapshot = load();
    return snapshot;
  },

  remaining() {
    return Math.max(0, ASSISTANT_LIMIT - this.getSnapshot().used);
  },

  /** Takes one use. Returns false when none are left. */
  takeUse() {
    const { used } = load();
    if (used >= ASSISTANT_LIMIT) return false;
    write(local, USAGE_KEY, used + 1);
    emit();
    return true;
  },

  /** Gives a use back when the request failed before reaching the AI. */
  returnUse() {
    const { used } = load();
    write(local, USAGE_KEY, Math.max(0, used - 1));
    emit();
  },

  resetUsage() {
    write(local, USAGE_KEY, 0);
    emit();
  },

  getLanguage(referralId) {
    return this.getSnapshot().languages[referralId] ?? null;
  },

  setLanguage(referralId, code) {
    write(local, LANGUAGE_KEY, { ...load().languages, [referralId]: code });
    emit();
  },

  getMessages(referralId) {
    return this.getSnapshot().chats[referralId] ?? [];
  },

  // Saved without audio: voice clips are too big for storage and are kept in memory only.
  setMessages(referralId, messages) {
    const saved = messages.slice(-MAX_SAVED_MESSAGES).map(({ audio: _audio, ...rest }) => rest);
    write(session, CHAT_KEY, { ...load().chats, [referralId]: saved });
    emit();
  },
};
