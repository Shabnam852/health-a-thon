// Fails if any package in package-lock.json was published less than MIN_DAYS ago.
// .npmrc asks npm for the same rule (min-release-age), but older npm versions ignore that
// setting, so this checks the lockfile itself. Run: npm run deps:age
import { readFileSync } from "node:fs";

const MIN_DAYS = Number(process.env.MIN_RELEASE_AGE_DAYS || 14);
const CONCURRENCY = 16;
const cutoff = Date.now() - MIN_DAYS * 24 * 60 * 60 * 1000;

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const wanted = new Map();
for (const [path, entry] of Object.entries(lock.packages || {})) {
  if (!path || entry.link || !entry.version || !entry.resolved?.startsWith("https://registry.npmjs.org/")) continue;
  const name = entry.name || path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
  const versions = wanted.get(name) || new Set();
  versions.add(entry.version);
  wanted.set(name, versions);
}

const TRIES = 4;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One brief registry error shouldn't fail the build: retry with a growing pause. A 404 is final.
const fetchTimes = async (name) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404) throw Object.assign(new Error("HTTP 404"), { final: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).time || {};
    } catch (error) {
      if (error.final || attempt >= TRIES) throw error;
      await wait(1000 * 2 ** (attempt - 1));
    }
  }
};

const tooNew = [];
const failed = [];
const names = [...wanted.keys()];
let next = 0;
const worker = async () => {
  while (next < names.length) {
    const name = names[next++];
    try {
      const time = await fetchTimes(name);
      for (const version of wanted.get(name)) {
        const published = Date.parse(time[version]);
        if (Number.isNaN(published)) failed.push(`${name}@${version}: no publish date`);
        else if (published > cutoff) tooNew.push(`${name}@${version} (${time[version].slice(0, 10)})`);
      }
    } catch (error) {
      failed.push(`${name}: ${error.message}`);
    }
  }
};
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const count = [...wanted.values()].reduce((n, v) => n + v.size, 0);
console.log(`Checked ${count} package versions against a ${MIN_DAYS}-day minimum age.`);
for (const line of tooNew) console.log(`  too new: ${line}`);
for (const line of failed) console.log(`  could not check: ${line}`);
if (tooNew.length || failed.length) process.exit(1);
console.log("All old enough.");
