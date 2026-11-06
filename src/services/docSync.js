/**
 * Keeps one JSON document in step with the server (/api/state), so every browser and phone in the
 * demo sees the same referrals. The browser copy stays the one the screens read, and it keeps
 * working when the server can't be reached: changes wait and go up on the next successful call.
 *
 * Writes carry the version they were based on. If someone else saved first, the server says so
 * (409) and sends its copy; the two are merged item by item (mergeDocs) and sent again.
 */

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const byId = (list) => new Map((Array.isArray(list) ? list : []).map((item) => [item?.id, item]));

/**
 * Three-way merge of two edits of `base`. For arrays of items with ids, an item this browser added,
 * changed or removed since `base` keeps this browser's version; every other item comes from
 * `remote`. Any other key takes this browser's value if it changed, otherwise the remote one.
 * Pure, so it can be tested on its own.
 */
export const mergeDocs = (base, local, remote) => {
  if (!remote) return local;
  if (!base) return remote;
  const merged = { ...remote };
  for (const key of new Set([...Object.keys(local ?? {}), ...Object.keys(remote)])) {
    const b = base[key];
    const l = local?.[key];
    const r = remote[key];
    const itemList = [b, l, r].every((v) => v === undefined || Array.isArray(v)) && [l, r].some(Array.isArray);
    const items = [l, r].filter(Array.isArray).flat();
    if (!itemList || !items.every((item) => item && item.id !== undefined)) {
      merged[key] = sameJson(l, b) ? r : l;
      continue;
    }
    const baseItems = byId(b);
    const localItems = byId(l);
    const remoteItems = byId(r);
    const changedHere = (id) => !sameJson(localItems.get(id), baseItems.get(id));
    // Remote order first, with items added here put at the front (new referrals show first).
    const out = [];
    for (const [id, item] of localItems) if (!baseItems.has(id) && !remoteItems.has(id)) out.push(item);
    for (const [id, item] of remoteItems) {
      if (!changedHere(id)) out.push(item);
      else if (localItems.has(id)) out.push(localItems.get(id));
      // Removed here and not changed there: stays removed.
      else if (!sameJson(item, baseItems.get(id))) out.push(item);
    }
    merged[key] = out;
  }
  return merged;
};

/**
 * transport: { get(key, since) → { doc, version } | { unchanged: true } | null on network failure,
 *              put(key, doc, baseVersion, force) → { ok, version } | { conflict, doc, version } | null }
 * onRemote(doc): called when the server's copy (or a merge) should replace what the screens show.
 */
export const createDocSync = ({ key, transport, onRemote, validate = (doc) => doc }) => {
  let base = null; // The last copy this browser and the server agreed on.
  let version = 0;
  let local = null;
  // This browser's copy before the first successful load, so changes made while the server was
  // still out of reach are merged in on that load instead of being replaced.
  let firstLocal = null;
  let busy = false;
  let started = false;
  let forceNext = false;
  let online = true;

  const adopt = (doc) => {
    local = doc;
    onRemote(doc);
  };

  const flush = async () => {
    if (busy || local === null) return;
    // Before the first load only a forced write (Reset) may go up; it doesn't need a version.
    if (!forceNext && (!started || sameJson(local, base))) return;
    busy = true;
    const sent = local;
    const force = forceNext;
    forceNext = false;
    try {
      const result = await transport.put(key, sent, version, force);
      if (!result) {
        online = false;
        if (force) forceNext = true;
        return;
      }
      online = true;
      if (result.ok) {
        base = sent;
        version = result.version;
      } else if (result.conflict && forceNext) {
        // A Reset came in while this save was out: it wins, so nothing is merged into it.
        base = result.doc ? validate(result.doc) : null;
        version = result.version;
      } else if (result.conflict) {
        const remote = validate(result.doc);
        const merged = mergeDocs(base, local, remote);
        base = remote;
        version = result.version;
        if (!sameJson(merged, local)) adopt(merged);
      }
    } finally {
      busy = false;
    }
    if (!sameJson(local, base)) await flush();
  };

  /** Reads the server's copy and folds it in. Also the first load, and the retry after being offline. */
  const pull = async () => {
    if (busy) return;
    busy = true;
    let result;
    try {
      result = await transport.get(key, started ? version : undefined);
    } finally {
      busy = false;
    }
    if (!result) {
      online = false;
      return;
    }
    online = true;
    if (!result.unchanged) {
      const remote = result.doc ? validate(result.doc) : null;
      // A pending Reset wins over whatever the server holds, so it isn't folded in.
      if (remote && !forceNext) {
        const agreed = started ? base : firstLocal;
        const pending = local !== null && agreed !== null && !sameJson(local, agreed);
        const merged = pending ? mergeDocs(agreed, local, remote) : remote;
        if (!sameJson(merged, local)) adopt(merged);
      }
      // Nothing saved on the server yet (remote null): this browser's copy becomes the first one.
      base = remote;
      version = result.version ?? 0;
      started = true;
    }
    if (forceNext || !sameJson(local, base)) await flush();
  };

  return {
    /** The screens changed the document. */
    setLocal(doc) {
      if (!started && firstLocal === null) firstLocal = doc;
      local = doc;
      return flush();
    },
    /** Replace the server's copy whatever it holds (Reset demo). */
    replace(doc) {
      local = doc;
      forceNext = true;
      return flush();
    },
    pull,
    isOnline: () => online,
  };
};

/** The real transport: same-origin calls to /api/state. */
export const httpTransport = {
  async get(key, since) {
    try {
      const query = new URLSearchParams({ key });
      if (since !== undefined) query.set("since", String(since));
      const response = await fetch(`/api/state?${query}`, { headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },
  async put(key, doc, baseVersion, force) {
    try {
      const response = await fetch(`/api/state?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ doc, baseVersion, force: Boolean(force) }),
      });
      if (response.status === 409) return { conflict: true, ...(await response.json()) };
      if (!response.ok) return null;
      return { ok: true, ...(await response.json()) };
    } catch {
      return null;
    }
  },
};

/** How often an open, visible tab checks for other people's changes. */
export const POLL_MS = 3000;

/** Calls sync.pull() now and then while the tab is visible. Returns a stop function. */
export const startPolling = (sync, every = POLL_MS) => {
  const tick = () => {
    if (typeof document === "undefined" || document.visibilityState === "visible") sync.pull();
  };
  const timer = setInterval(tick, every);
  const onVisible = () => document.visibilityState === "visible" && sync.pull();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
};
