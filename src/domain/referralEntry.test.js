import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { addReason, formatBp, mergeDraft } from "./referralEntry.js";

test("formatBp turns common separators into a slash", () => {
  // "128.82" is what an iPhone's number pad can type: it has a dot, but no slash.
  for (const typed of ["128 82", "128-82", "128,82", " 128 / 82 ", "128\\82", "128.82"]) {
    assert.equal(formatBp(typed), "128/82");
  }
});

test("formatBp leaves anything else as typed", () => {
  for (const typed of ["", "high", "128", "128/82 sitting", "1280 82"]) {
    assert.equal(formatBp(typed), typed);
  }
});

test("addReason starts an empty note, appends a sentence, and never repeats", () => {
  assert.equal(addReason("", "Bleeding"), "Bleeding");
  assert.equal(addReason("Headache since morning.", "Bleeding"), "Headache since morning. Bleeding");
  assert.equal(addReason("Heavy bleeding at home", "bleeding"), "Heavy bleeding at home");
});

describe("mergeDraft", () => {
  const sampleKeys = ["patientName", "age", "phone", "vital:bp"];

  test("fills fields nobody typed in and clears sample values the AI has nothing for", () => {
    const { values, original, suggestions } = mergeDraft({
      current: { patientName: "Sample Name", age: "29 yrs", phone: "+91 1", "vital:bp": "128/82" },
      draft: { patientName: "Sunita Devi", vitals: { bp: "140/90" }, unclear: [] },
      userKeys: new Set(),
      sampleKeys,
    });
    assert.deepEqual(values, { patientName: "Sunita Devi", "vital:bp": "140/90", age: "", phone: "" });
    assert.deepEqual(original, { patientName: "Sunita Devi", "vital:bp": "140/90" });
    assert.deepEqual(suggestions, {});
  });

  test("never overwrites what the clinician typed; a different AI value becomes a suggestion", () => {
    const { values, suggestions } = mergeDraft({
      current: { patientName: "Sunita Devi", phone: "+91 90000 11111", "vital:bp": "" },
      draft: { patientName: "Sunita Devi", phone: "+91 90000 22222", vitals: { bp: "140/90" } },
      userKeys: new Set(["patientName", "phone"]),
      sampleKeys,
    });
    assert.deepEqual(values, { "vital:bp": "140/90", age: "" });
    // The same value isn't offered again.
    assert.deepEqual(suggestions, { phone: "+91 90000 22222" });
  });

  test("keeps an earlier AI value when the new draft has nothing for it", () => {
    const { values, original } = mergeDraft({
      current: { patientName: "Sunita Devi", age: "" },
      draft: { age: "24 yrs" },
      userKeys: new Set(),
      aiOriginal: { patientName: "Sunita Devi" },
      sampleKeys,
    });
    assert.equal("patientName" in values, false);
    assert.deepEqual(original, { patientName: "Sunita Devi", age: "24 yrs" });
  });

  test("lists a kept AI value that no source gave this time, so it can be checked", () => {
    // Fill 1 read the age from a photo. The photo was removed, and fill 2 has no age.
    const { values, stale } = mergeDraft({
      current: { patientName: "Sunita Devi", age: "24 yrs", phone: "" },
      draft: { patientName: "Sunita Devi" },
      userKeys: new Set(["phone"]),
      aiOriginal: { patientName: "Sunita Devi", age: "24 yrs", phone: "+91 90000 33333" },
      sampleKeys,
    });
    assert.equal("age" in values, false);
    assert.deepEqual(stale, ["age"]);
  });

  test("a field marked as the clinician's is never written, only suggested", () => {
    // The form marks the hospital as the clinician's on every fill: the AI never chooses it.
    const { values, suggestions } = mergeDraft({
      current: { receivingFacility: "Karuna" },
      draft: { receivingFacility: "Vidyaranya" },
      userKeys: new Set(["receivingFacility"]),
      sampleKeys,
    });
    assert.equal("receivingFacility" in values, false);
    assert.deepEqual(suggestions, { receivingFacility: "Vidyaranya" });
  });
});
