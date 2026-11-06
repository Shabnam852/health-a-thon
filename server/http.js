// Node request/response plumbing shared by the Vercel functions and the Vite dev server.

import { createNeonCounter, createSharedLimiter } from "./sharedLimit.js";
import { databaseUrl } from "./state.js";

const MAX_BODY_BYTES = 2_000_000;

// Requests per address per window, by route. Each one can spend paid AI credit, so this caps
// what one person (or a script) can run up. In memory: it holds for the dev server, and for
// one warm Vercel instance only. A deployed app also needs a shared limit (Vercel Firewall or
// a KV store) and a spend cap in each provider's console.
const WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMITS = { ask: 30, speak: 60, handoff: 20, draft: 20 };
// Across everyone, per route per window: a backstop if many addresses are used at once. Each
// route has its own, so reading answers aloud can't use up what families need for questions.
export const GLOBAL_LIMITS = { ask: 200, speak: 300, handoff: 60, draft: 60 };
// Families on one mobile network can share an address. A failed question still shows "call
// 108" when it sounds urgent (useAssistantChat), and a deployed app limits per signed-in user.

const hits = new Map();

const windowFor = (key, now) => {
  let entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    hits.set(key, entry);
  }
  return entry;
};

/** Counts one request. Returns false once the address or the route is over its limit. */
export const allowRequest = (route, address, now = Date.now()) => {
  const mine = windowFor(`${route}:${address}`, now);
  const everyone = windowFor(`${route}:*`, now);
  // Old windows are dropped now and then, so the map can't grow without end.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
  }
  if (mine.count >= (RATE_LIMITS[route] ?? 20) || everyone.count >= (GLOBAL_LIMITS[route] ?? 100)) return false;
  mine.count += 1;
  everyone.count += 1;
  return true;
};

/** Hands back a request that never reached an AI: a rejected one shouldn't use up the limit. */
export const releaseRequest = (route, address, now = Date.now()) => {
  for (const key of [`${route}:${address}`, `${route}:*`]) {
    const entry = hits.get(key);
    if (entry && now - entry.start <= WINDOW_MS) entry.count = Math.max(0, entry.count - 1);
  }
};

export const resetRateLimits = () => hits.clear();

// Deployed, the same limits are also counted in Neon so they hold across Vercel instances. Only when
// the process has a database URL (Vercel does; the dev server and the tests don't, and there one
// process is all there is).
let sharedLimiter;
const getSharedLimiter = () => {
  if (sharedLimiter !== undefined) return sharedLimiter;
  const url = databaseUrl(process.env);
  sharedLimiter = url
    ? createSharedLimiter(createNeonCounter(url), {
        perAddress: RATE_LIMITS,
        global: GLOBAL_LIMITS,
        windowMs: WINDOW_MS,
      })
    : null;
  return sharedLimiter;
};

/** For tests: use this limiter (or null for none) instead of the one made from the environment. */
export const setSharedLimiter = (limiter) => {
  sharedLimiter = limiter;
};

// Vercel sets x-vercel-forwarded-for itself, so it can't be faked. The dev server only listens
// on this computer, so the socket address is enough there.
const clientAddress = (req) =>
  String(req.headers["x-vercel-forwarded-for"] || "")
    .split(",")[0]
    .trim() ||
  req.socket?.remoteAddress ||
  "unknown";

/**
 * Only our own pages may call the AI routes. A page on another site can still make a browser
 * send a "simple" request (text/plain, no preflight) and spend our credit without reading the
 * answer. Requiring JSON forces a preflight, which fails, and the origin check refuses the rest.
 */
export const fromOwnPage = (req) => {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  if (!type.startsWith("application/json")) return { ok: false, status: 415 };
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return { ok: false, status: 403 };
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      return { ok: false, status: 403 };
    }
    const own = String(req.headers["x-forwarded-host"] || req.headers.host || "");
    if (host !== own) return { ok: false, status: 403 };
  }
  return { ok: true };
};

const readJson = async (req) => {
  // Vercel has already parsed a JSON body.
  if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Too large"), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};

/** route: the name in server/routes.js, for its rate limit. */
export const sendAssistant = async (req, res, handle, route = "ask") => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST.", usedAi: false });
  }
  const origin = fromOwnPage(req);
  if (!origin.ok) return send(res, origin.status, { error: "Not allowed.", usedAi: false });
  // Counted up front, so a burst of requests can't all slip under the limit at once, and
  // handed back below when the request never reached an AI (bad input, too large, not set up).
  const address = clientAddress(req);
  const shared = getSharedLimiter();
  const tooMany = () => {
    res.setHeader("Retry-After", String(WINDOW_MS / 1000));
    return send(res, 429, { error: "Too many requests. Please wait a few minutes and try again.", usedAi: false });
  };
  if (!allowRequest(route, address)) return tooMany();
  if (shared && !(await shared.allow(route, address))) {
    releaseRequest(route, address);
    await shared.release(route, address);
    return tooMany();
  }
  const handBack = async () => {
    releaseRequest(route, address);
    await shared?.release(route, address);
  };
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    await handBack();
    return send(res, error.status || 400, {
      error: error.status === 413 ? "That request is too large." : "Bad request.",
      usedAi: false,
    });
  }
  try {
    const result = await handle(body);
    if (result.body?.usedAi === false) await handBack();
    return send(res, result.status, result.body);
  } catch (error) {
    console.error("[assistant] unexpected failure", error);
    return send(res, 500, { error: "Something went wrong. Please try again.", usedAi: false });
  }
};

// Saved state is read every few seconds by every open tab, so it gets its own, larger limits.
// A visible tab reads 2 documents every 3 s (400 reads per window), and a venue's Wi-Fi or a mobile
// network can put many devices behind one address, so reads get a lot of room.
export const STATE_LIMITS = { read: 20000, write: 3000 };

const allowState = (kind, address, now = Date.now()) => {
  const mine = windowFor(`state-${kind}:${address}`, now);
  if (mine.count >= STATE_LIMITS[kind]) return false;
  mine.count += 1;
  return true;
};

/** GET or PUT /api/state. handle({ method, query, body }) is server/state.js handleState. */
export const sendState = async (req, res, handle) => {
  const method = req.method;
  if (method !== "GET" && method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return send(res, 405, { error: "Use GET or PUT." });
  }
  // A read has no body, so only the fetch-site check applies; a write must pass the full check.
  const site = req.headers["sec-fetch-site"];
  if (method === "GET" && site && site !== "same-origin" && site !== "none")
    return send(res, 403, { error: "Not allowed." });
  if (method === "PUT") {
    const origin = fromOwnPage(req);
    if (!origin.ok) return send(res, origin.status, { error: "Not allowed." });
  }
  if (!allowState(method === "GET" ? "read" : "write", clientAddress(req))) {
    res.setHeader("Retry-After", "60");
    return send(res, 429, { error: "Too many requests." });
  }
  const url = new URL(req.url || "/", "http://localhost");
  const query = Object.fromEntries(url.searchParams);
  let body;
  if (method === "PUT") {
    try {
      body = await readJson(req);
    } catch (error) {
      return send(res, error.status || 400, { error: error.status === 413 ? "Too large." : "Bad request." });
    }
  }
  try {
    const result = await handle({ method, query, body });
    if (result.allow) res.setHeader("Allow", result.allow);
    return send(res, result.status, result.body);
  } catch (error) {
    console.error("[state] unexpected failure", error);
    return send(res, 503, { error: "Saved data isn't available right now." });
  }
};
