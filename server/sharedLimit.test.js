import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { RATE_LIMITS, resetRateLimits, sendAssistant, setSharedLimiter } from "./http.js";
import { createMemoryCounter, createSharedLimiter } from "./sharedLimit.js";

const WINDOW = 10 * 60 * 1000;

const req = (address = "1.2.3.4") => ({
  method: "POST",
  headers: { "content-type": "application/json", "x-vercel-forwarded-for": address },
  body: { question: "hi" },
});
const res = () => {
  const r = { headers: {}, statusCode: 0, body: null };
  r.setHeader = (k, v) => {
    r.headers[k] = v;
  };
  r.end = (b) => {
    r.body = JSON.parse(b);
  };
  return r;
};

afterEach(() => {
  setSharedLimiter(null);
  resetRateLimits();
});

describe("shared AI limits", () => {
  it("refuses once the address is over its limit across instances", async () => {
    const limiter = createSharedLimiter(createMemoryCounter(), {
      perAddress: { ask: 2 },
      global: { ask: 100 },
      windowMs: WINDOW,
    });
    const now = 1_000_000;
    assert.equal(await limiter.allow("ask", "a", now), true);
    assert.equal(await limiter.allow("ask", "a", now), true);
    assert.equal(await limiter.allow("ask", "a", now), false);
    assert.equal(await limiter.allow("ask", "b", now), true);
    assert.equal(await limiter.allow("ask", "a", now + WINDOW + 1), true);
  });

  it("hands a request back", async () => {
    const limiter = createSharedLimiter(createMemoryCounter(), {
      perAddress: { ask: 1 },
      global: { ask: 100 },
      windowMs: WINDOW,
    });
    assert.equal(await limiter.allow("ask", "a", 1), true);
    await limiter.release("ask", "a");
    assert.equal(await limiter.allow("ask", "a", 2), true);
  });

  it("lets requests through if the database fails", async () => {
    const broken = {
      count: async () => {
        throw new Error("down");
      },
      release: async () => {},
    };
    const limiter = createSharedLimiter(broken, { perAddress: {}, global: {}, windowMs: WINDOW });
    assert.equal(await limiter.allow("ask", "a"), true);
  });

  it("is checked by every AI route after the in-memory limit", async () => {
    // As if another instance had already used this address's whole allowance.
    const counter = createMemoryCounter();
    for (let i = 0; i < RATE_LIMITS.ask; i += 1) await counter.count("ask:9.9.9.9", WINDOW, Date.now());
    setSharedLimiter(
      createSharedLimiter(counter, { perAddress: RATE_LIMITS, global: { ask: 1000 }, windowMs: WINDOW }),
    );
    let ran = 0;
    const r = res();
    await sendAssistant(req("9.9.9.9"), r, async () => {
      ran += 1;
      return { status: 200, body: { usedAi: true } };
    });
    assert.equal(r.statusCode, 429);
    assert.equal(ran, 0);
  });

  it("gives a use back when the request never reached an AI", async () => {
    const counter = createMemoryCounter();
    setSharedLimiter(createSharedLimiter(counter, { perAddress: { ask: 1 }, global: { ask: 1000 }, windowMs: WINDOW }));
    const handle = async () => ({ status: 400, body: { usedAi: false } });
    await sendAssistant(req("5.5.5.5"), res(), handle);
    const second = res();
    await sendAssistant(req("5.5.5.5"), second, handle);
    assert.equal(second.statusCode, 400);
  });
});
