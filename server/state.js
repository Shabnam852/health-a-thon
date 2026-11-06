/**
 * Saved demo state in Neon Postgres: one JSON document per key, each with a version number, so
 * every browser and phone in the demo shares the same referrals. A save names the version it
 * started from; if someone saved first the answer is 409 with the newer copy, and the browser
 * merges and tries again (src/services/docSync.js).
 *
 * Demo grade: there is no sign-in check here, so anyone with the URL can read and change the
 * data. That is fine only because every patient in it is made up.
 */

import { neon } from "@neondatabase/serverless";
import { cleanAbdmDoc, cleanDomainDoc } from "../src/domain/stateShape.js";

/** The documents the app keeps. Anything else is refused. */
export const STATE_KEYS = ["domain", "abdm"];

// Vercel's Neon integration names it DATABASE_URL, or STORAGE_URL with the prefix we chose.
export const databaseUrl = (env = process.env) => env.DATABASE_URL || env.STORAGE_URL || env.POSTGRES_URL || "";

const SCHEMA = `CREATE TABLE IF NOT EXISTS navexa_docs (
  key text PRIMARY KEY,
  doc jsonb NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

/** A store on Neon. The table is made on first use, once per server instance. */
export const createNeonStore = (url) => {
  const sql = neon(url);
  let ready = null;
  const ensure = () => {
    ready ??= sql.query(SCHEMA).catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  };
  return {
    async read(key) {
      await ensure();
      const rows = await sql`SELECT doc, version FROM navexa_docs WHERE key = ${key}`;
      return rows[0] ?? null;
    },
    /** Saves only if the stored version is still `baseVersion` (0: nothing stored yet). */
    async write(key, doc, baseVersion) {
      await ensure();
      const json = JSON.stringify(doc);
      const rows =
        baseVersion === 0
          ? await sql`INSERT INTO navexa_docs (key, doc, version) VALUES (${key}, ${json}::jsonb, 1)
              ON CONFLICT (key) DO NOTHING RETURNING version`
          : await sql`UPDATE navexa_docs SET doc = ${json}::jsonb, version = version + 1, updated_at = now()
              WHERE key = ${key} AND version = ${baseVersion} RETURNING version`;
      return rows[0]?.version ?? null;
    },
    async overwrite(key, doc) {
      await ensure();
      const json = JSON.stringify(doc);
      const rows = await sql`INSERT INTO navexa_docs (key, doc, version) VALUES (${key}, ${json}::jsonb, 1)
        ON CONFLICT (key) DO UPDATE SET doc = EXCLUDED.doc, version = navexa_docs.version + 1, updated_at = now()
        RETURNING version`;
      return rows[0].version;
    },
  };
};

/** The same contract in memory, for tests and for running without a database. */
export const createMemoryStore = () => {
  const docs = new Map();
  return {
    async read(key) {
      return docs.get(key) ?? null;
    },
    async write(key, doc, baseVersion) {
      const current = docs.get(key);
      if ((current?.version ?? 0) !== baseVersion) return null;
      const version = baseVersion + 1;
      docs.set(key, { doc: structuredClone(doc), version });
      return version;
    },
    async overwrite(key, doc) {
      const version = (docs.get(key)?.version ?? 0) + 1;
      docs.set(key, { doc: structuredClone(doc), version });
      return version;
    },
  };
};

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Only items every screen can read are stored, so one bad save can't break the app for everyone.
const CLEANERS = { domain: cleanDomainDoc, abdm: cleanAbdmDoc };

/**
 * One request to /api/state, without any Node plumbing.
 * GET ?key=&since=  → { doc, version } (doc null if nothing saved), or { unchanged: true }
 * PUT ?key=  { doc, baseVersion, force } → { version }, or 409 { doc, version }
 */
export const handleState = async ({ method, query, body }, store) => {
  const key = query.key;
  if (!STATE_KEYS.includes(key)) return { status: 400, body: { error: "Unknown key." } };

  if (method === "GET") {
    const row = await store.read(key);
    const version = row?.version ?? 0;
    if (query.since !== undefined && String(version) === String(query.since)) {
      return { status: 200, body: { unchanged: true, version } };
    }
    return { status: 200, body: { doc: row?.doc ?? null, version } };
  }

  if (method === "PUT") {
    const { doc: sent, baseVersion = 0, force = false } = body ?? {};
    if (!isPlainObject(sent)) return { status: 400, body: { error: "Send a document." } };
    const doc = CLEANERS[key](sent);
    if (!doc) return { status: 400, body: { error: "That document isn't usable." } };
    if (!Number.isInteger(baseVersion) || baseVersion < 0) return { status: 400, body: { error: "Bad version." } };
    if (force) return { status: 200, body: { version: await store.overwrite(key, doc) } };
    const version = await store.write(key, doc, baseVersion);
    if (version !== null) return { status: 200, body: { version } };
    const row = await store.read(key);
    return { status: 409, body: { doc: row?.doc ?? null, version: row?.version ?? 0 } };
  }

  return { status: 405, body: { error: "Use GET or PUT." }, allow: "GET, PUT" };
};
