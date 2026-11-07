import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { allowRequest, fromOwnPage, GLOBAL_LIMITS, RATE_LIMITS, resetRateLimits, sendAssistant } from "./http.js";

const req = (headers = {}, extra = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", host: "localhost:5173", ...headers },
  socket: { remoteAddress: "127.0.0.1" },
  body: { text: "hi" },
  ...extra,
});

const res = () => {
  const r = { headers: {}, statusCode: 0, body: null };
  r.setHeader = (k, v) => {
    r.headers[k.toLowerCase()] = v;
  };
  r.end = (text) => {
    r.body = JSON.parse(text);
  };
  return r;
};

describe("fromOwnPage", () => {
  it("allows a JSON request from our own page", () => {
    assert.equal(fromOwnPage(req({ origin: "http://localhost:5173", "sec-fetch-site": "same-origin" })).ok, true);
  });
  it("allows a request with no origin, such as a test script on the same machine", () => {
    assert.equal(fromOwnPage(req()).ok, true);
  });
  it("refuses text/plain, the type another site can send without a preflight", () => {
    assert.deepEqual(fromOwnPage(req({ "content-type": "text/plain" })), { ok: false, status: 415 });
  });
  it("refuses form posts", () => {
    assert.equal(fromOwnPage(req({ "content-type": "application/x-www-form-urlencoded" })).status, 415);
  });
  it("refuses a cross-site browser request", () => {
    assert.equal(fromOwnPage(req({ "sec-fetch-site": "cross-site" })).status, 403);
    assert.equal(fromOwnPage(req({ "sec-fetch-site": "same-site" })).status, 403);
  });
  it("refuses another origin, and a broken one", () => {
    assert.equal(fromOwnPage(req({ origin: "https://evil.example" })).status, 403);
    assert.equal(fromOwnPage(req({ origin: "null" })).status, 403);
  });
});

describe("allowRequest", () => {
  beforeEach(resetRateLimits);
  it("stops one address at the route's limit, and lets it back after the window", () => {
    const limit = RATE_LIMITS.ask;
    for (let i = 0; i < limit; i += 1) assert.equal(allowRequest("ask", "a", 1000), true);
    assert.equal(allowRequest("ask", "a", 1000), false);
    assert.equal(allowRequest("ask", "b", 1000), true, "another address has its own count");
    assert.equal(allowRequest("speak", "a", 1000), true, "another route has its own count");
    assert.equal(allowRequest("ask", "a", 1000 + 11 * 60 * 1000), true);
  });
  it("has a ceiling across all addresses, for each route on its own", () => {
    let allowed = 0;
    for (let i = 0; i < 400; i += 1) if (allowRequest("ask", `ip${i}`, 5000)) allowed += 1;
    assert.equal(allowed, GLOBAL_LIMITS.ask);
    // Reading answers aloud has its own budget, and doesn't use up the one for questions.
    resetRateLimits();
    for (let i = 0; i < 400; i += 1) allowRequest("speak", `ip${i}`, 5000);
    assert.equal(allowRequest("ask", "family", 5000), true);
  });
});

describe("sendAssistant", () => {
  beforeEach(resetRateLimits);
  it("never runs the handler for a cross-site request", async () => {
    let ran = false;
    const r = res();
    await sendAssistant(
      req({ "content-type": "text/plain", origin: "https://evil.example" }),
      r,
      async () => {
        ran = true;
        return { status: 200, body: {} };
      },
      "ask",
    );
    assert.equal(ran, false);
    assert.equal(r.statusCode, 415);
    assert.equal(r.body.usedAi, false);
  });
  it("answers 429 once over the limit, without running the handler", async () => {
    let runs = 0;
    const handle = async () => {
      runs += 1;
      return { status: 200, body: { ok: true } };
    };
    for (let i = 0; i < RATE_LIMITS.handoff; i += 1) await sendAssistant(req(), res(), handle, "handoff");
    const r = res();
    await sendAssistant(req(), r, handle, "handoff");
    assert.equal(r.statusCode, 429);
    assert.equal(runs, RATE_LIMITS.handoff);
    assert.ok(r.headers["retry-after"]);
  });
  it("doesn't count a request that never reached an AI", async () => {
    let runs = 0;
    const handle = async () => {
      runs += 1;
      return { status: 400, body: { error: "Send text.", usedAi: false } };
    };
    for (let i = 0; i < RATE_LIMITS.handoff + 5; i += 1) await sendAssistant(req(), res(), handle, "handoff");
    assert.equal(runs, RATE_LIMITS.handoff + 5);
    const r = res();
    await sendAssistant(req(), r, async () => ({ status: 200, body: { ok: true } }), "handoff");
    assert.equal(r.statusCode, 200);
  });
});
