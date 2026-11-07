import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNavigationForRole, RoleId } from "../config/navigationConfig.js";
import { AUTO_LANGUAGE, BRING_LIST, LANGUAGES } from "../domain/assistant.js";
import { RIDE_STAGES } from "../domain/patientJourney.js";
import {
  ENGLISH_FAMILY_STRINGS,
  FAMILY_STRINGS,
  familyDateLocale,
  familyLanguageCode,
  familyStrings,
  fill,
  fillParts,
} from "./familyStrings.js";

const KEYS = Object.keys(ENGLISH_FAMILY_STRINGS);
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("family strings", () => {
  it("has every key, in the same shape, for every language the picker offers", () => {
    for (const { code } of LANGUAGES) {
      const table = FAMILY_STRINGS[code];
      assert.ok(table, `missing language ${code}`);
      assert.deepEqual(Object.keys(table).sort(), [...KEYS].sort(), code);
      for (const key of KEYS) {
        const value = table[key];
        if (Array.isArray(ENGLISH_FAMILY_STRINGS[key])) {
          assert.equal(value.length, ENGLISH_FAMILY_STRINGS[key].length, `${code}.${key}`);
          for (const item of value) assert.ok(item.trim(), `${code}.${key}`);
        } else {
          assert.equal(typeof value, "string", `${code}.${key}`);
          assert.ok(value.trim(), `${code}.${key}`);
        }
      }
    }
  });

  it("keeps the same placeholders as English in every language", () => {
    for (const [code, table] of Object.entries(FAMILY_STRINGS)) {
      for (const key of KEYS) {
        if (typeof ENGLISH_FAMILY_STRINGS[key] !== "string") continue;
        assert.deepEqual(placeholders(table[key]), placeholders(ENGLISH_FAMILY_STRINGS[key]), `${code}.${key}`);
      }
    }
  });

  it("keeps the emergency number as the digits 108", () => {
    for (const [code, table] of Object.entries(FAMILY_STRINGS)) {
      for (const key of ["emergencyStat", "call108"]) {
        assert.ok(table[key].includes("108"), `${code}.${key}`);
      }
      assert.ok(table.navPlan.includes("42"), `${code}.navPlan`);
    }
  });

  it("lists the same journey stages and things to bring as the shared domain", () => {
    assert.deepEqual(ENGLISH_FAMILY_STRINGS.rideStages, RIDE_STAGES);
    assert.deepEqual(ENGLISH_FAMILY_STRINGS.bring, BRING_LIST);
  });

  it("has a translated title and tab for every patient nav item", () => {
    for (const item of getNavigationForRole(RoleId.PATIENT)) {
      assert.equal(ENGLISH_FAMILY_STRINGS[item.titleKey], item.title, item.path);
      assert.equal(ENGLISH_FAMILY_STRINGS[item.tabKey], item.tabLabel, item.path);
    }
  });

  it("follows the record's language on auto or unset, and falls back to English", () => {
    assert.equal(familyStrings(AUTO_LANGUAGE, "hi-IN").done, FAMILY_STRINGS["hi-IN"].done);
    assert.equal(familyStrings(null, "ta-IN").done, FAMILY_STRINGS["ta-IN"].done);
    assert.equal(familyStrings("bn-IN", "ta-IN").done, FAMILY_STRINGS["bn-IN"].done);
    assert.equal(familyStrings("xx-IN", "xx-IN").done, ENGLISH_FAMILY_STRINGS.done);
    assert.equal(familyLanguageCode("xx-IN"), "en-IN");
    assert.equal(familyLanguageCode(AUTO_LANGUAGE, "te-IN"), "te-IN");
  });

  it("fills a key missing from a language from English", () => {
    const { done, ...partial } = FAMILY_STRINGS["hi-IN"];
    FAMILY_STRINGS["hi-IN"] = partial;
    try {
      assert.equal(familyStrings("hi-IN").done, ENGLISH_FAMILY_STRINGS.done);
    } finally {
      FAMILY_STRINGS["hi-IN"] = { ...partial, done };
    }
  });

  it("fills placeholders as text or as parts", () => {
    assert.equal(fill("Call {phone}", { phone: "108" }), "Call 108");
    assert.equal(fill("{name} is here", {}), " is here");
    const node = { type: "strong" };
    assert.deepEqual(fillParts("Give {id} at reception", { id: node }), ["Give ", node, " at reception"]);
  });

  it("uses the standard Odia locale for dates", () => {
    assert.equal(familyDateLocale("od-IN"), "or-IN");
    assert.equal(familyDateLocale("hi-IN"), "hi-IN");
  });
});
