import assert from "node:assert/strict";
import test from "node:test";
import { resolveTheme } from "./theme.js";

test("a saved theme wins over the device setting", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("without a saved theme, the device setting decides", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
});

test("an unknown saved value is ignored", () => {
  assert.equal(resolveTheme("sepia", true), "dark");
});
