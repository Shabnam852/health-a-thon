/**
 * AI request limits shared by every server instance, kept in Neon. The in-memory limits in http.js
 * hold for one warm Vercel instance only, so a public URL with real keys could still be used to
 * spend credit across instances. This counts each request in Postgres as well.
 *
 * It fails open: if the database can't be reached the request goes ahead on the in-memory limit
 * alone, so a database problem never takes the AI features down.
 */

import { neon } from "@neondatabase/serverless";

const SCHEMA = `CREATE TABLE IF NOT EXISTS navexa_rate (
  key text PRIMARY KEY,
  window_start bigint NOT NULL,
  count integer NOT NULL
)`;

/** count(key, windowMs, now) adds one and returns the count in the current window. */
export const createNeonCounter = (url) => {
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
    async count(key, windowMs, now) {
      await ensure();
      const expired = now - windowMs;
      const rows = await sql`INSERT INTO navexa_rate (key, window_start, count) VALUES (${key}, ${now}, 1)
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN navexa_rate.window_start <= ${expired} THEN 1 ELSE navexa_rate.count + 1 END,
          window_start = CASE WHEN navexa_rate.window_start <= ${expired} THEN ${now} ELSE navexa_rate.window_start END
        RETURNING count`;
      return rows[0].count;
    },
    async release(key) {
      await ensure();
      await sql`UPDATE navexa_rate SET count = GREATEST(count - 1, 0) WHERE key = ${key}`;
    },
  };
};

/** The same contract in memory, for tests. */
export const createMemoryCounter = () => {
  const windows = new Map();
  return {
    async count(key, windowMs, now) {
      const entry = windows.get(key);
      if (!entry || entry.start <= now - windowMs) {
        windows.set(key, { start: now, count: 1 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
    async release(key) {
      const entry = windows.get(key);
      if (entry) entry.count = Math.max(0, entry.count - 1);
    },
  };
};

/**
 * Limits on top of a counter. allow() counts the address and the route's global key, and refuses
 * once either is over; release() hands both back for a request that never reached an AI.
 */
export const createSharedLimiter = (counter, { perAddress, global, windowMs }) => ({
  async allow(route, address, now = Date.now()) {
    try {
      const [mine, everyone] = await Promise.all([
        counter.count(`${route}:${address}`, windowMs, now),
        counter.count(`${route}:*`, windowMs, now),
      ]);
      return mine <= (perAddress[route] ?? 20) && everyone <= (global[route] ?? 100);
    } catch (error) {
      console.error("[limit] shared limit unavailable, using the in-memory one", error?.message);
      return true;
    }
  },
  async release(route, address) {
    try {
      await Promise.all([counter.release(`${route}:${address}`), counter.release(`${route}:*`)]);
    } catch {
      // Nothing to hand back if the database is down.
    }
  },
});
