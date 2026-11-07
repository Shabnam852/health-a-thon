import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { createMemoryStore, databaseUrl, handleState } from "./state.js";

const put = (store, doc, baseVersion, extra = {}) =>
  handleState({ method: "PUT", query: { key: "domain" }, body: { doc, baseVersion, ...extra } }, store);
const get = (store, query = {}) => handleState({ method: "GET", query: { key: "domain", ...query } }, store);

describe("/api/state", () => {
  it("returns no document before anything is saved", async () => {
    const res = await get(createMemoryStore());
    assert.deepEqual(res, { status: 200, body: { doc: null, version: 0 } });
  });

  it("saves, then refuses a save based on an old version with the newer copy", async () => {
    const store = createMemoryStore();
    assert.equal((await put(store, { referrals: [{ id: "S", status: "SENT" }] }, 0)).body.version, 1);
    assert.equal((await put(store, { referrals: [{ id: "A", status: "SENT" }] }, 1)).body.version, 2);
    const stale = await put(store, { referrals: [{ id: "B", status: "SENT" }] }, 1);
    assert.equal(stale.status, 409);
    assert.deepEqual(stale.body, { doc: { referrals: [{ id: "A", status: "SENT" }] }, version: 2 });
  });

  it("says unchanged when the caller already has the latest version", async () => {
    const store = createMemoryStore();
    await put(store, { referrals: [{ id: "S", status: "SENT" }] }, 0);
    assert.deepEqual((await get(store, { since: "1" })).body, { unchanged: true, version: 1 });
  });

  it("overwrites on force", async () => {
    const store = createMemoryStore();
    await put(store, { referrals: [{ id: "A", status: "SENT" }] }, 0);
    const res = await put(store, { referrals: [{ id: "S", status: "SENT" }] }, 0, { force: true });
    assert.equal(res.status, 200);
    assert.deepEqual((await get(store)).body.doc, { referrals: [{ id: "S", status: "SENT" }] });
  });

  it("refuses unknown keys and documents without referrals", async () => {
    const store = createMemoryStore();
    assert.equal((await handleState({ method: "GET", query: { key: "users" } }, store)).status, 400);
    assert.equal((await put(store, { notReferrals: true }, 0)).status, 400);
    assert.equal((await put(store, [1, 2], 0)).status, 400);
  });

  it("reads the database URL under either name the Neon integration uses", () => {
    assert.equal(databaseUrl({ DATABASE_URL: "a", STORAGE_URL: "b" }), "a");
    assert.equal(databaseUrl({ STORAGE_URL: "b" }), "b");
    // The name production actually has: the integration's STORAGE prefix on DATABASE_URL.
    assert.equal(databaseUrl({ STORAGE_DATABASE_URL: "c", STORAGE_URL: "b" }), "c");
    assert.equal(databaseUrl({}), "");
  });

  it("is served by the Vercel function and the dev server", async () => {
    const fn = await readFile(new URL("../api/state.js", import.meta.url), "utf8");
    assert.ok(fn.includes("handleState"));
    const config = await readFile(new URL("../vite.config.js", import.meta.url), "utf8");
    assert.ok(config.includes('"/api/state"'));
  });
});
