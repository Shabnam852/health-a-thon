import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStore, handleState } from "../../server/state.js";
import { createDocSync, mergeDocs } from "./docSync.js";

const ref = (id, status = "SENT", extra = {}) => ({ id, status, ...extra });

describe("mergeDocs", () => {
  it("keeps changes made on both sides to different referrals", () => {
    const base = { referrals: [ref("A"), ref("B")] };
    const local = { referrals: [ref("A", "ACKNOWLEDGED"), ref("B")] };
    const remote = { referrals: [ref("A"), ref("B", "REJECTED")] };
    assert.deepEqual(mergeDocs(base, local, remote).referrals, [ref("A", "ACKNOWLEDGED"), ref("B", "REJECTED")]);
  });

  it("puts a referral added here at the front and keeps one added there", () => {
    const base = { referrals: [ref("A")] };
    const local = { referrals: [ref("NEW"), ref("A")] };
    const remote = { referrals: [ref("OTHER"), ref("A")] };
    assert.deepEqual(
      mergeDocs(base, local, remote).referrals.map((r) => r.id),
      ["NEW", "OTHER", "A"],
    );
  });

  it("drops an item removed here unless it changed there", () => {
    const base = {
      notifications: [
        { id: 1, read: false },
        { id: 2, read: false },
      ],
    };
    const local = { notifications: [] };
    const remote = {
      notifications: [
        { id: 1, read: false },
        { id: 2, read: true },
      ],
    };
    assert.deepEqual(mergeDocs(base, local, remote).notifications, [{ id: 2, read: true }]);
  });

  it("takes the remote copy when nothing changed here", () => {
    const base = { referrals: [ref("A")] };
    const remote = { referrals: [ref("A", "ARRIVAL_CONFIRMED")] };
    assert.deepEqual(mergeDocs(base, base, remote), remote);
  });

  it("merges values that are not lists by whole value", () => {
    const base = { abhaLinks: { A: 1 }, consents: [] };
    const local = { abhaLinks: { A: 1, B: 2 }, consents: [] };
    const remote = { abhaLinks: { A: 1 }, consents: [{ id: "C" }] };
    assert.deepEqual(mergeDocs(base, local, remote), { abhaLinks: { A: 1, B: 2 }, consents: [{ id: "C" }] });
  });
});

// Two browsers talking to one in-memory server through the real handler.
const serverTransport = (store) => ({
  async get(key, since) {
    const query = since === undefined ? { key } : { key, since: String(since) };
    return (await handleState({ method: "GET", query }, store)).body;
  },
  async put(key, doc, baseVersion, force) {
    const res = await handleState({ method: "PUT", query: { key }, body: { doc, baseVersion, force } }, store);
    if (res.status === 409) return { conflict: true, ...res.body };
    return { ok: true, ...res.body };
  },
});

const browser = (store, initial) => {
  const view = { doc: initial };
  const sync = createDocSync({
    key: "domain",
    transport: serverTransport(store),
    onRemote: (doc) => {
      view.doc = doc;
    },
  });
  return { view, sync };
};

describe("createDocSync", () => {
  it("seeds the server from the first browser and loads it in the second", async () => {
    const store = createMemoryStore();
    const a = browser(store, { referrals: [ref("A")] });
    await a.sync.setLocal(a.view.doc);
    await a.sync.pull();
    const b = browser(store, { referrals: [ref("SEED")] });
    await b.sync.setLocal(b.view.doc);
    await b.sync.pull();
    assert.deepEqual(b.view.doc, { referrals: [ref("A")] });
  });

  it("merges two browsers' changes made at the same time", async () => {
    const store = createMemoryStore();
    const start = { referrals: [ref("A"), ref("B")] };
    const a = browser(store, start);
    const b = browser(store, start);
    for (const x of [a, b]) {
      await x.sync.setLocal(x.view.doc);
      await x.sync.pull();
    }
    await a.sync.setLocal({ referrals: [ref("A", "ACKNOWLEDGED"), ref("B")] });
    // B saves without having seen A's change: the server refuses, B merges and saves again.
    b.view.doc = { referrals: [ref("A"), ref("B", "REJECTED")] };
    await b.sync.setLocal(b.view.doc);
    await a.sync.pull();
    const expected = [ref("A", "ACKNOWLEDGED"), ref("B", "REJECTED")];
    assert.deepEqual(b.view.doc.referrals, expected);
    assert.deepEqual(a.view.doc.referrals, expected);
    assert.deepEqual((await store.read("domain")).doc.referrals, expected);
  });

  it("keeps working when the server can't be reached, and sends the change later", async () => {
    const store = createMemoryStore();
    const real = serverTransport(store);
    let up = true;
    const transport = {
      get: (...args) => (up ? real.get(...args) : null),
      put: (...args) => (up ? real.put(...args) : null),
    };
    const view = { doc: { referrals: [ref("A")] } };
    const sync = createDocSync({ key: "domain", transport, onRemote: (doc) => (view.doc = doc) });
    await sync.setLocal(view.doc);
    await sync.pull();
    up = false;
    await sync.setLocal({ referrals: [ref("A", "ARRIVAL_CONFIRMED")] });
    assert.equal(sync.isOnline(), false);
    up = true;
    await sync.pull();
    assert.deepEqual((await store.read("domain")).doc.referrals, [ref("A", "ARRIVAL_CONFIRMED")]);
  });

  it("keeps a change made before the first successful load", async () => {
    const store = createMemoryStore();
    await store.overwrite("domain", { referrals: [ref("A"), ref("B")] });
    const real = serverTransport(store);
    let up = false;
    const transport = {
      get: (...args) => (up ? real.get(...args) : null),
      put: (...args) => (up ? real.put(...args) : null),
    };
    const view = { doc: { referrals: [ref("A")] } };
    const sync = createDocSync({ key: "domain", transport, onRemote: (doc) => (view.doc = doc) });
    await sync.setLocal(view.doc);
    await sync.pull();
    // Made while the server was out of reach: it must survive the first load, not be replaced.
    await sync.setLocal({ referrals: [ref("NEW"), ref("A")] });
    up = true;
    await sync.pull();
    const ids = (await store.read("domain")).doc.referrals.map((r) => r.id);
    assert.deepEqual(ids.sort(), ["A", "B", "NEW"]);
    assert.deepEqual(view.doc.referrals.map((r) => r.id).sort(), ["A", "B", "NEW"]);
  });

  it("a Reset during a save in flight is not merged with the old copy", async () => {
    const store = createMemoryStore();
    const a = browser(store, { referrals: [ref("A")] });
    await a.sync.setLocal(a.view.doc);
    await a.sync.pull();
    // Someone else adds a case, so A's next normal save gets a conflict.
    await store.write("domain", { referrals: [ref("A"), ref("OTHER")] }, 1);
    const saving = a.sync.setLocal({ referrals: [ref("A", "ACKNOWLEDGED")] });
    const resetting = a.sync.replace({ referrals: [ref("FRESH")] });
    await Promise.all([saving, resetting]);
    await a.sync.pull();
    assert.deepEqual((await store.read("domain")).doc.referrals, [ref("FRESH")]);
  });

  it("replace overwrites the server whatever version it holds", async () => {
    const store = createMemoryStore();
    await store.overwrite("domain", { referrals: [ref("OLD")] });
    await store.overwrite("domain", { referrals: [ref("OLDER")] });
    const a = browser(store, { referrals: [ref("FRESH")] });
    await a.sync.replace(a.view.doc);
    await a.sync.pull();
    assert.deepEqual((await store.read("domain")).doc.referrals, [ref("FRESH")]);
  });
});
