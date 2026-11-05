import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTO_LANGUAGE, LANGUAGES } from "../../domain/assistant.js";
import { CHAT_STRINGS, chatStrings, chatStringsLang, ENGLISH_STRINGS } from "./chatStrings.js";

const KEYS = Object.keys(ENGLISH_STRINGS);

describe("chat strings", () => {
  it("has every key, in the same shape, for every language the picker offers", () => {
    for (const { code } of LANGUAGES) {
      const table = CHAT_STRINGS[code];
      assert.ok(table, `missing language ${code}`);
      assert.deepEqual(Object.keys(table).sort(), [...KEYS].sort(), code);
      for (const key of KEYS) {
        const value = table[key];
        if (Array.isArray(ENGLISH_STRINGS[key])) {
          assert.equal(value.length, ENGLISH_STRINGS[key].length, `${code}.${key}`);
          for (const item of value) assert.ok(item.trim(), `${code}.${key}`);
        } else {
          assert.equal(typeof value, "string", `${code}.${key}`);
          assert.ok(value.trim(), `${code}.${key}`);
        }
      }
    }
  });

  it("keeps the emergency number as the digits 108", () => {
    for (const [code, table] of Object.entries(CHAT_STRINGS)) {
      for (const key of ["footer", "call108", "call108Now", "urgent", "offline"]) {
        assert.ok(table[key].includes("108"), `${code}.${key}`);
      }
    }
  });

  it("follows the record's language on auto, and falls back to English", () => {
    assert.equal(chatStrings(AUTO_LANGUAGE, "hi-IN").send, CHAT_STRINGS["hi-IN"].send);
    assert.equal(chatStrings("xx-IN", "xx-IN").send, ENGLISH_STRINGS.send);
    assert.equal(chatStringsLang("xx-IN"), "en-IN");
    assert.equal(chatStringsLang("ta-IN"), "ta-IN");
  });
});
