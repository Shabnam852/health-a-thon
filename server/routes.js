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

export const runRoute = async (route, body, createProviders) => {
  const handle = HANDLERS[route];
  if (!handle) return { status: 404, body: { error: "Not found.", usedAi: false } };
  const providers = createProviders();
  if (providers.missing) {
    console.error(`[ai] missing ${providers.missing.join(", ")}`);
    return { status: 503, body: { error: "AI isn't set up yet.", usedAi: false } };
  }
  return handle(body, providers);
};
