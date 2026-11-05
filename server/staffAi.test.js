import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProviderError } from "./providers.js";
import {
  cleanDraft,
  handleHandoff,
  handleReferralDraft,
  parseDraftRequest,
  parseHandoffRequest,
  tidyAge,
  tidyGestationalAge,
} from "./staffAi.js";

const options = {
  hospitals: ["Sanjeevani Hospital", "Kaveri Clinic"],
  departments: ["Neonatal ICU / Phototherapy Unit"],
  languages: ["Hindi", "Urdu"],
};

const fakes = ({ reply, transcript = "Fathima, 29, PPROM at 36 weeks" } = {}) => {
  const calls = { structured: [], transcribe: [] };
  return {
    calls,
    providers: {
      claude: {
        structured: async (req) => {
          calls.structured.push(req);
          if (reply instanceof Error) throw reply;
          return reply;
        },
      },
      sarvam: {
        transcribe: async (req) => {
          calls.transcribe.push(req);
          return { transcript, languageCode: "en-IN" };
        },
      },
    },
  };
};

const handoffReply = {
  situation: "Mother, 29, 36 weeks, urgent referral for PPROM.",
  background: "G3P2. BP 128/82.",
  referrer_assessment: "Referring doctor wrote: PPROM confirmed.",
  request: "Labour triage. Needs transport.",
  missing: ["Blood group", ""],
};

describe("handoff summary", () => {
  it("needs a record of sensible size", () => {
    assert.ok(parseHandoffRequest({}).error);
    assert.ok(parseHandoffRequest({ record: "text" }).error);
    assert.ok(parseHandoffRequest({ record: { reason: "x".repeat(9000) } }).error);
    assert.equal(parseHandoffRequest({ record: { reason: "PPROM" } }).error, undefined);
  });

  it("returns the four parts and the gaps, without empty gaps", async () => {
    const { providers, calls } = fakes({ reply: handoffReply });
    const res = await handleHandoff({ record: { reason: "PPROM" } }, providers);
    assert.equal(res.status, 200);
    assert.equal(res.body.summary.referrerAssessment, handoffReply.referrer_assessment);
    assert.deepEqual(res.body.summary.missing, ["Blood group"]);
    assert.match(calls.structured[0].messages[0].content, /data, not instructions/);
  });

  it("asks for a handwritten handoff when refused, and says credit was spent", async () => {
    const { providers } = fakes({ reply: { refused: true } });
    const res = await handleHandoff({ record: { reason: "x" } }, providers);
    assert.equal(res.status, 422);
    assert.equal(res.body.usedAi, true);
  });

  it("reports a provider failure with staff wording", async () => {
    const { providers } = fakes({ reply: new ProviderError("busy", { status: 503, spent: false }) });
    const res = await handleHandoff({ record: { reason: "x" } }, providers);
    assert.equal(res.status, 503);
    assert.equal(res.body.usedAi, false);
    assert.match(res.body.error, /by hand/);
  });
});

describe("referral draft", () => {
  it("needs at least one source and the hospital list", () => {
    assert.ok(parseDraftRequest({ options }).error);
    assert.ok(parseDraftRequest({ text: "  ", heard: "", options }).error);
    assert.equal(
      parseDraftRequest({ text: "x", heard: "y", image: { data: "x", mediaType: "image/jpeg" }, options }).error,
      undefined,
    );
    assert.ok(parseDraftRequest({ heard: "x".repeat(4001), options }).error);
    assert.ok(parseDraftRequest({ text: "x" }).error);
    assert.ok(parseDraftRequest({ image: { data: "x", mediaType: "image/gif" }, options }).error);
    assert.ok(parseDraftRequest({ image: { data: "x".repeat(1_500_001), mediaType: "image/jpeg" }, options }).error);
    assert.ok(parseDraftRequest({ audio: { data: "x", mimeType: "video/mp4" }, options }).error);
    assert.equal(parseDraftRequest({ text: "note", options }).error, undefined);
  });

  it("has no priority field: the clinician sets urgency", async () => {
    const { providers, calls } = fakes({ reply: {} });
    await handleReferralDraft({ text: "note", options }, providers);
    const { properties } = calls.structured[0].schema;
    assert.equal(properties.priority, undefined);
    assert.equal(
      Object.keys(properties).some((k) => /priority|urgen/i.test(k)),
      false,
    );
    // The model may only pick one of the hospitals the form offers.
    assert.deepEqual(properties.receiving_facility.enum, ["", ...options.hospitals]);
  });

  it("keeps only values the form can take", () => {
    const draft = cleanDraft(
      {
        patient_type: "Alien",
        patient_name: " Fathima Begum ",
        receiving_facility: "Somewhere Else",
        language: "Urdu",
        interpreter_needed: "maybe",
        vitals: { bp: "128/82", fhr: "", nonsense: "1" },
        unclear: ["phone", "priority", "phone"],
      },
      options,
    );
    assert.equal(draft.patientType, "");
    assert.equal(draft.patientName, "Fathima Begum");
    assert.equal(draft.receivingFacility, "");
    assert.equal(draft.language, "Urdu");
    assert.equal(draft.interpreterNeeded, "");
    assert.deepEqual(draft.vitals, { bp: "128/82" });
    assert.deepEqual(draft.unclear, ["phone"]);
  });

  it("hears a voice note first and returns what it heard", async () => {
    const { providers, calls } = fakes({ reply: { patient_name: "Fathima" } });
    const audio = { data: Buffer.from("x").toString("base64"), mimeType: "audio/webm" };
    const res = await handleReferralDraft({ audio, options }, providers);
    assert.equal(res.status, 200);
    assert.equal(res.body.heard, "Fathima, 29, PPROM at 36 weeks");
    assert.match(calls.structured[0].messages[0].content.at(-1).text, /SPOKEN NOTE[\s\S]*Fathima, 29/);
    assert.equal(res.body.draft.patientName, "Fathima");
  });

  it("sends a photo as an image block", async () => {
    const { providers, calls } = fakes({ reply: {} });
    await handleReferralDraft({ image: { data: "QUFB", mediaType: "image/jpeg" }, options }, providers);
    const [image] = calls.structured[0].messages[0].content;
    assert.equal(image.type, "image");
    assert.equal(image.source.media_type, "image/jpeg");
  });

  it("sends every source together and adds a new recording to what was heard before", async () => {
    const { providers, calls } = fakes({ reply: {}, transcript: "BP 140/90" });
    const audio = { data: Buffer.from("x").toString("base64"), mimeType: "audio/webm" };
    const res = await handleReferralDraft(
      {
        text: "Fathima Begum, 29",
        heard: "PPROM since morning",
        audio,
        image: { data: "QUFB", mediaType: "image/jpeg" },
        options,
      },
      providers,
    );
    assert.equal(res.body.heard, "PPROM since morning\nBP 140/90");
    const [image, text] = calls.structured[0].messages[0].content;
    assert.equal(image.type, "image");
    assert.match(text.text, /TYPED NOTE[\s\S]*Fathima Begum, 29/);
    assert.match(text.text, /SPOKEN NOTE[\s\S]*PPROM since morning\nBP 140\/90/);
    assert.match(text.text, /PHOTO/);
  });

  it("says credit was spent when hearing worked but the draft failed", async () => {
    const { providers } = fakes({ reply: new ProviderError("Claude failed", { status: 503, spent: false }) });
    const audio = { data: Buffer.from("x").toString("base64"), mimeType: "audio/webm" };
    const res = await handleReferralDraft({ audio, options }, providers);
    assert.equal(res.body.usedAi, true);
  });
});

describe("linked evidence", () => {
  const reply = {
    patient_name: "Fathima Begum",
    indication: "PPROM since this morning.",
    vitals: { bp: "128/82" },
    evidence: [
      { field: "patientName", quote: "Fathima  Begum", source: "note" },
      { field: "indication", quote: "waters broke in the car", source: "photo" },
      { field: "vital:bp", quote: "BP 128/82", source: "photo" },
      { field: "phone", quote: "+91 1", source: "note" },
    ],
  };
  const note = "Fathima Begum, 29, PPROM since this morning, BP 128/82";

  it("keeps quotes found in the source and flags fields it can't show", () => {
    const draft = cleanDraft(reply, options, { note });
    assert.deepEqual(Object.keys(draft.evidence).sort(), ["patientName", "vital:bp"]);
    // No photo was sent, so a "photo" quote that is really in the note is credited to the note.
    assert.deepEqual(draft.evidence["vital:bp"], { quote: "BP 128/82", source: "note" });
    // A made-up quote, or one for a field that wasn't filled, links nothing.
    assert.deepEqual(draft.unsourced, ["indication"]);
  });

  it("can't check a photo's quotes, so it keeps them when a photo was sent", () => {
    const draft = cleanDraft(reply, options, { note, photo: true });
    assert.deepEqual(draft.evidence.indication, { quote: "waters broke in the car", source: "photo" });
  });

  it("finds a quote in the recording when the AI named the wrong source", () => {
    const draft = cleanDraft(
      { patient_name: "Fathima", evidence: [{ field: "patientName", quote: "Fathima", source: "note" }] },
      options,
      { note: "PPROM", voice: "this is Fathima" },
    );
    assert.deepEqual(draft.evidence.patientName, { quote: "Fathima", source: "voice" });
  });

  it("checks quotes against what was heard", async () => {
    const { providers } = fakes({ reply, transcript: note });
    const audio = { data: Buffer.from("x").toString("base64"), mimeType: "audio/webm" };
    const res = await handleReferralDraft({ audio, options }, providers);
    assert.deepEqual(res.body.draft.unsourced, ["indication"]);
  });
});

// Each row is [what was written, what the form should get].
const check = (tidy, rows) => {
  for (const [written, expected] of rows) assert.equal(tidy(written), expected, `${JSON.stringify(written)}`);
};

describe("tidyAge", () => {
  it("reduces an adult's age to plain digits", () => {
    check(tidyAge, [
      ["24", "24"],
      ["24y", "24"],
      ["24Y", "24"],
      ["24 yr", "24"],
      ["24 yrs", "24"],
      ["24 Yrs.", "24"],
      ["24 yo", "24"],
      ["24 y/o", "24"],
      ["24 Y/O", "24"],
      ["24 y.o.", "24"],
      ["24 years", "24"],
      ["24 years old", "24"],
      ["24 year old", "24"],
      ["24-year-old", "24"],
      ["24 years of age", "24"],
      ["aged 24", "24"],
      ["Age: 24", "24"],
      ["age - 24 yrs", "24"],
      ["  24  ", "24"],
      ["24.", "24"],
      ["twenty four years", "24"],
      ["Twenty-four", "24"],
      ["thirty", "30"],
    ]);
  });

  it("reads Indian-language unit words", () => {
    check(tidyAge, [
      ["24 साल", "24"],
      ["24 साल की", "24"],
      ["24 वर्ष", "24"],
      ["24 saal", "24"],
      ["24 baras", "24"],
      ["24 वर्षे", "24"],
      ["24 ವರ್ಷ", "24"],
      ["24 வயது", "24"],
      ["வயது 24", "24"],
      ["24 సంవత్సరాలు", "24"],
      ["24 বছর", "24"],
      ["उम्र 24", "24"],
    ]);
  });

  it("turns native-script digits into ASCII", () => {
    check(tidyAge, [
      ["२४", "24"],
      ["२४ साल", "24"],
      ["২৪ বছর", "24"],
      ["೨೪ ವರ್ಷ", "24"],
      ["౨౪ సంవత్సరాలు", "24"],
      ["௨௪ வயது", "24"],
      ["૨૪ વર્ષ", "24"],
      ["٢٤", "24"],
    ]);
  });

  it("writes a baby's age as a number and an English unit", () => {
    check(tidyAge, [
      ["3 days", "3 days"],
      ["3 day", "3 days"],
      ["3d", "3 days"],
      ["3 d", "3 days"],
      ["D3", "3 days"],
      ["d 3", "3 days"],
      ["day 3", "3 days"],
      ["DOL 3", "3 days"],
      ["DOL3", "3 days"],
      ["day 3 of life", "3 days"],
      ["day of life 3", "3 days"],
      ["3rd day of life", "3 days"],
      ["3rd day", "3 days"],
      ["3 days old", "3 days"],
      ["3-day-old", "3 days"],
      ["3 din", "3 days"],
      ["three days", "3 days"],
      ["३ दिन", "3 days"],
      ["1 day", "1 day"],
      ["1d", "1 day"],
      ["6 hours", "6 hours"],
      ["6 hrs", "6 hours"],
      ["6 hr old", "6 hours"],
      ["6h", "6 hours"],
      ["6 h", "6 hours"],
      ["1 hour", "1 hour"],
      ["6 ghante", "6 hours"],
      ["48 hours of life", "48 hours"],
      ["2 weeks", "2 weeks"],
      ["2 wks", "2 weeks"],
      ["2wk", "2 weeks"],
      ["2 w", "2 weeks"],
      ["1 week", "1 week"],
      ["2 hafte", "2 weeks"],
      ["4 months", "4 months"],
      ["4 mo", "4 months"],
      ["4 mos", "4 months"],
      ["4 month old", "4 months"],
      ["1 month", "1 month"],
      ["4 mahine", "4 months"],
      ["4 महीने", "4 months"],
    ]);
  });

  it("keeps the unit for a child under ten years", () => {
    check(tidyAge, [
      ["5 yrs", "5 years"],
      ["5y", "5 years"],
      ["1 year", "1 year"],
      ["9 साल", "9 years"],
      ["10 yrs", "10"],
    ]);
  });

  it('leaves "m" alone, because it could be male, months or minutes', () => {
    check(tidyAge, [
      ["24M", "24M"],
      ["24 m", "24 m"],
      ["3m", "3m"],
      ["3 m", "3 m"],
      ["30 min", "30 min"],
      ["30 minutes", "30 minutes"],
    ]);
  });

  it("leaves anything it is not sure of exactly as written", () => {
    check(tidyAge, [
      ["", ""],
      ["approx 24", "approx 24"],
      ["~24", "~24"],
      ["24+", "24+"],
      ["24-26", "24-26"],
      ["24.5 years", "24.5 years"],
      ["24y F", "24y F"],
      ["24y/F", "24y/F"],
      ["24 years, G2P1", "24 years, G2P1"],
      ["1 day 4 hours", "1 day 4 hours"],
      ["1 year 6 months", "1 year 6 months"],
      ["born 3 days ago", "born 3 days ago"],
      ["8th month", "8th month"],
      ["month 3", "month 3"],
      ["3rd month", "3rd month"],
      ["hour 6", "hour 6"],
      ["young", "young"],
      ["चौबीस साल", "चौबीस साल"],
    ]);
  });

  it("rejects impossible values", () => {
    check(tidyAge, [
      ["0", "0"],
      ["0 yrs", "0 yrs"],
      ["100 yrs", "100 yrs"],
      ["150", "150"],
      ["2400", "2400"],
      ["१५०", "१५०"],
      ["0 days", "0 days"],
      ["100 days", "100 days"],
      ["200 hours", "200 hours"],
      ["0 hours", "0 hours"],
      ["60 weeks", "60 weeks"],
      ["40 months", "40 months"],
    ]);
  });

  it("is unchanged when run again on its own output", () => {
    for (const written of ["24 Yrs.", "D3", "6h", "2 wks", "4 mo", "5 yrs", "२४ साल"]) {
      const once = tidyAge(written);
      assert.equal(tidyAge(once), once);
    }
  });
});

describe("tidyGestationalAge", () => {
  it("writes whole weeks", () => {
    check(tidyGestationalAge, [
      ["34", "34 weeks"],
      ["34w", "34 weeks"],
      ["34 W", "34 weeks"],
      ["34wk", "34 weeks"],
      ["34 wks", "34 weeks"],
      ["34 wks.", "34 weeks"],
      ["34 week", "34 weeks"],
      ["34 weeks", "34 weeks"],
      ["34 Weeks", "34 weeks"],
      ["34/40", "34 weeks"],
      ["34 / 40", "34 weeks"],
      ["34.0", "34 weeks"],
      ["34.0 weeks", "34 weeks"],
      ["34 completed weeks", "34 weeks"],
      ["thirty four weeks", "34 weeks"],
      ["thirty-four", "34 weeks"],
      ["4 weeks", "4 weeks"],
      ["45 weeks", "45 weeks"],
    ]);
  });

  it("writes weeks and days", () => {
    check(tidyGestationalAge, [
      ["34+2", "34 weeks, 2 days"],
      ["34 + 2", "34 weeks, 2 days"],
      ["34+2/40", "34 weeks, 2 days"],
      ["34+1", "34 weeks, 1 day"],
      ["34w2d", "34 weeks, 2 days"],
      ["34 w 2 d", "34 weeks, 2 days"],
      ["34W2D", "34 weeks, 2 days"],
      ["34wk2d", "34 weeks, 2 days"],
      ["34 wks 2 days", "34 weeks, 2 days"],
      ["34wks+2d", "34 weeks, 2 days"],
      ["34 wks + 2 days", "34 weeks, 2 days"],
      ["34 weeks+2", "34 weeks, 2 days"],
      ["34+2 weeks", "34 weeks, 2 days"],
      ["34 weeks 2 days", "34 weeks, 2 days"],
      ["34 weeks and 2 days", "34 weeks, 2 days"],
      ["34 weeks & 2 days", "34 weeks, 2 days"],
      ["34 weeks, 2 days", "34 weeks, 2 days"],
      ["34 weeks, 1 day", "34 weeks, 1 day"],
      ["34 weeks 6 days", "34 weeks, 6 days"],
    ]);
  });

  it('drops "0 days"', () => {
    check(tidyGestationalAge, [
      ["34w0d", "34 weeks"],
      ["34+0", "34 weeks"],
      ["34 weeks 0 days", "34 weeks"],
    ]);
  });

  it("ignores the label in front", () => {
    check(tidyGestationalAge, [
      ["GA 34 weeks", "34 weeks"],
      ["GA: 34 weeks", "34 weeks"],
      ["G.A. 34w", "34 weeks"],
      ["POG 34 wks", "34 weeks"],
      ["POG: 34+2", "34 weeks, 2 days"],
      ["P.O.G. 34 wks", "34 weeks"],
      ["period of gestation 34 weeks", "34 weeks"],
      ["gestational age: 34 weeks 2 days", "34 weeks, 2 days"],
      ["gestation 34w", "34 weeks"],
    ]);
  });

  it("reads Indian-language unit words and digits", () => {
    check(tidyGestationalAge, [
      ["34 hafte", "34 weeks"],
      ["34 hafta", "34 weeks"],
      ["34 हफ्ते", "34 weeks"],
      ["34 हफ़्ते", "34 weeks"],
      ["34 सप्ताह", "34 weeks"],
      ["३४ सप्ताह", "34 weeks"],
      ["34 हफ्ते 2 दिन", "34 weeks, 2 days"],
      ["34 हफ्ते और 2 दिन", "34 weeks, 2 days"],
      ["34 hafte 2 din", "34 weeks, 2 days"],
      ["34 ವಾರ", "34 weeks"],
      ["34 வாரம்", "34 weeks"],
      ["34 వారాలు", "34 weeks"],
      ["৩৪ সপ্তাহ", "34 weeks"],
      ["३४ आठवडे", "34 weeks"],
    ]);
  });

  it('does not guess what "34.2" means', () => {
    // Often 34 weeks 2 days, but some software writes 34.2 weeks, and "34.5" is half a week.
    check(tidyGestationalAge, [
      ["34.2", "34.2"],
      ["34.2 weeks", "34.2 weeks"],
      ["34.5", "34.5"],
      ["34.5 weeks", "34.5 weeks"],
      ["34.0+2", "34.0+2"],
    ]);
  });

  it("leaves months, trimesters and term words exactly as written", () => {
    check(tidyGestationalAge, [
      ["8 months pregnant", "8 months pregnant"],
      ["8 months", "8 months"],
      ["8th month", "8th month"],
      ["8 mahine", "8 mahine"],
      ["third trimester", "third trimester"],
      ["3rd trimester", "3rd trimester"],
      ["term", "term"],
      ["full term", "full term"],
      ["preterm", "preterm"],
      ["post dates", "post dates"],
      ["34 weeks preterm", "34 weeks preterm"],
      ["34 weeks (preterm)", "34 weeks (preterm)"],
      ["34th week", "34th week"],
      ["34 weeks by LMP", "34 weeks by LMP"],
    ]);
  });

  it("leaves anything it is not sure of exactly as written", () => {
    check(tidyGestationalAge, [
      ["", ""],
      ["approx 34 weeks", "approx 34 weeks"],
      ["~34", "~34"],
      ["34+", "34+"],
      ["34+ weeks", "34+ weeks"],
      ["34-36 weeks", "34-36 weeks"],
      ["34 2", "34 2"],
      ["34 weeks, 2", "34 weeks, 2"],
      ["34, 2 days", "34, 2 days"],
      ["34 days", "34 days"],
      ["34 2 days", "34 2 days"],
      ["34 weeks + 2 weeks", "34 weeks + 2 weeks"],
      ["34w2", "34w2"],
      ["34 yrs", "34 yrs"],
      ["34/42", "34/42"],
      ["34/7", "34/7"],
      ["unknown", "unknown"],
    ]);
  });

  it("rejects impossible values", () => {
    check(tidyGestationalAge, [
      ["34 weeks 7 days", "34 weeks 7 days"],
      ["34+7", "34+7"],
      ["34w9d", "34w9d"],
      ["3 weeks", "3 weeks"],
      ["3", "3"],
      ["0", "0"],
      ["46", "46"],
      ["46 weeks", "46 weeks"],
      ["340", "340"],
      ["99 weeks", "99 weeks"],
    ]);
  });

  it("is unchanged when run again on its own output", () => {
    for (const written of ["34", "34w2d", "34+2/40", "34 hafte 2 din", "thirty four weeks"]) {
      const once = tidyGestationalAge(written);
      assert.equal(tidyGestationalAge(once), once);
    }
  });

  it("stays fast on long, awkward input", () => {
    const awkward = `${"3 ".repeat(30)}${"\u0903".repeat(20)}`;
    const start = Date.now();
    tidyGestationalAge(awkward);
    tidyAge(awkward);
    assert.ok(Date.now() - start < 100);
  });
});

describe("cleanDraft tidies age and gestational age", () => {
  it("rewrites both before the form is filled", () => {
    const draft = cleanDraft({ age: "२४ साल", gestational_age: "POG 34w2d" }, options);
    assert.equal(draft.age, "24");
    assert.equal(draft.gestationalAge, "34 weeks, 2 days");
  });

  it("passes a newborn's age and an unclear gestation through as written or tidied", () => {
    const draft = cleanDraft({ age: "DOL 3", gestational_age: "8th month" }, options);
    assert.equal(draft.age, "3 days");
    assert.equal(draft.gestationalAge, "8th month");
  });
});
