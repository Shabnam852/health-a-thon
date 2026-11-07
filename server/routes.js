/**
 * Every AI route, in one table shared by the Vercel functions and the dev server.
 * Providers are made per request, so a missing key gives a clear message, not a crash.
 */

import { handleAsk, handleSpeak } from "./assistant.js";
import { handleHandoff, handleReferralDraft } from "./staffAi.js";

const HANDLERS = {
  ask: handleAsk,
  speak: handleSpeak,
  handoff: handleHandoff,
  draft: handleReferralDraft,
};

/** URL path → route name, for the dev server. Vercel maps the same paths to files in api/. */
export const ROUTE_PATHS = {
  "/api/assistant": "ask",
  "/api/assistant/speak": "speak",
  "/api/ai/handoff": "handoff",
  "/api/ai/referral-draft": "draft",
};

const hasAudio = (body) => Boolean(body && typeof body === "object" && body.audio);

/**
 * What each request needs. Claude does the thinking; Sarvam hears, translates and speaks. A typed
 * question still gets a text answer without Sarvam (handleAsk skips the voice), so each key turns
 * on what it can, and a copy run with no keys at all just shows "AI isn't set up yet."
 */
const NEEDS = {
  ask: (body) => ["claude", ...(hasAudio(body) ? ["sarvam"] : [])],
  speak: () => ["sarvam"],
  handoff: () => ["claude"],
  draft: (body) => ["claude", ...(hasAudio(body) ? ["sarvam"] : [])],
};

export const runRoute = async (route, body, createProviders) => {
  const handle = HANDLERS[route];
  if (!handle) return { status: 404, body: { error: "Not found.", usedAi: false } };
  const providers = createProviders();
  const absent = NEEDS[route](body).filter((name) => !providers[name]);
  if (absent.length > 0) {
    console.error(`[ai] ${route} needs ${absent.join(" and ")}; missing ${(providers.missing ?? []).join(", ")}`);
    const error = absent.includes("claude") ? "AI isn't set up yet." : "Voice isn't set up yet.";
    return { status: 503, body: { error, usedAi: false } };
  }
  return handle(body, providers);
};
