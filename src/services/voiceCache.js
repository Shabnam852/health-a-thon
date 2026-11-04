import { useEffect, useSyncExternalStore } from "react";

/**
 * Voice clips the family has already received, kept so they can be replayed without paying again.
 * In memory as blob URLs for this visit, and in the browser's Cache Storage so they survive a reload.
 * Cache Storage can be missing or blocked (private windows, old browsers); memory still works then.
 */

const CACHE_NAME = "navexa-voice-v1";
// Each clip is a few hundred KB, so keep the newest ones only.
const MAX_SAVED = 60;

const urls = new Map();
const loading = new Map();
const listeners = new Set();
const notify = () => {
  for (const listener of listeners) listener();
};

const openCache = async () => {
  try {
    return typeof caches === "undefined" ? null : await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
};

// Cache Storage needs a URL. A hash keeps long screen texts out of it.
const requestFor = async (key) => {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return new Request(`${location.origin}/__voice/${hex}`);
};

const toBlob = ({ data, mimeType }) => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
};

const remember = (key, blob) => {
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  notify();
  return url;
};

const trim = async (cache) => {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_SAVED)).map((k) => cache.delete(k)));
};

/** Keeps a clip from the server ({ data, mimeType } in base64) and returns a URL to play. */
export const saveVoice = (key, audio) => {
  const blob = toBlob(audio);
  const url = remember(key, blob);
  (async () => {
    const cache = await openCache();
    if (!cache) return;
    try {
      await cache.put(await requestFor(key), new Response(blob, { headers: { "content-type": blob.type } }));
      await trim(cache);
    } catch {
      // Full or blocked storage: the clip still plays from memory for this visit.
    }
  })();
  return url;
};

/** The URL of a clip already in memory, or null. */
export const voiceUrl = (key) => urls.get(key) ?? null;

/** Looks for a clip saved on an earlier visit and brings it into memory. */
export const loadVoice = (key) => {
  if (!key || urls.has(key)) return Promise.resolve(urls.get(key) ?? null);
  if (loading.has(key)) return loading.get(key);
  const job = (async () => {
    const cache = await openCache();
    if (!cache) return null;
    try {
      const res = await cache.match(await requestFor(key));
      return res ? remember(key, await res.blob()) : null;
    } catch {
      return null;
    }
  })().finally(() => loading.delete(key));
  loading.set(key, job);
  return job;
};

/** Forgets every clip, for Reset demo and Reset assistant. */
export const clearVoices = async () => {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  notify();
  try {
    if (typeof caches !== "undefined") await caches.delete(CACHE_NAME);
  } catch {
    // Nothing saved to clear.
  }
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The playable URL for a clip, or null. Checks Cache Storage once for a clip from an earlier visit. */
export const useVoice = (key) => {
  const url = useSyncExternalStore(subscribe, () => (key ? (urls.get(key) ?? null) : null));
  useEffect(() => {
    if (key) loadVoice(key);
  }, [key]);
  return url;
};
