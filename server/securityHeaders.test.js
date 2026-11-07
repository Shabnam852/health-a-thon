// Guards the deployed site's security headers (vercel.json) so a change can't quietly weaken them.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const page = config.headers.find((h) => h.source === "/(.*)");
const header = (name) => page.headers.find((h) => h.key.toLowerCase() === name.toLowerCase())?.value;
const csp = Object.fromEntries(
  header("Content-Security-Policy")
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .map(([name, ...values]) => [name, values]),
);

test("every page sends the security headers", () => {
  assert.equal(header("X-Content-Type-Options"), "nosniff");
  assert.equal(header("X-Frame-Options"), "DENY");
  assert.equal(header("Cross-Origin-Opener-Policy"), "same-origin");
  assert.equal(header("Cross-Origin-Resource-Policy"), "same-origin");
  assert.equal(header("X-Permitted-Cross-Domain-Policies"), "none");
  assert.match(header("Strict-Transport-Security"), /max-age=(\d{8,})/);
  assert.match(header("Referrer-Policy"), /^(no-referrer|strict-origin|strict-origin-when-cross-origin|same-origin)$/);
});

test("the CSP allows only the site itself for code", () => {
  for (const directive of ["default-src", "script-src", "style-src", "connect-src"]) {
    assert.deepEqual(csp[directive], ["'self'"], directive);
  }
  assert.deepEqual(csp["object-src"], ["'none'"]);
  assert.deepEqual(csp["base-uri"], ["'none'"]);
  assert.deepEqual(csp["frame-ancestors"], ["'none'"]);
  const all = Object.values(csp).flat();
  for (const unsafe of ["'unsafe-inline'", "'unsafe-eval'", "*", "http:", "https:"]) {
    assert.ok(!all.includes(unsafe), `CSP must not allow ${unsafe}`);
  }
});

test("only the microphone is allowed among sensitive browser features", () => {
  const policy = header("Permissions-Policy");
  assert.match(policy, /microphone=\(self\)/);
  for (const feature of ["camera", "geolocation", "payment", "usb", "display-capture"]) {
    assert.match(policy, new RegExp(`${feature}=\\(\\)`), feature);
  }
});

test("AI answers are never cached", () => {
  const api = config.headers.find((h) => h.source === "/api/(.*)");
  assert.equal(api.headers.find((h) => h.key === "Cache-Control").value, "no-store");
});

test("index.html has no inline script or style, which the CSP would block", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
  assert.doesNotMatch(html, /<style[\s>]/);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
});
