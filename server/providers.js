/**
 * The AI services behind the family's assistant. Server-side only: the keys are read
 * from the environment and never reach the browser.
 *   Claude (Sonnet 5.5) writes the answer. Sarvam hears and speaks Indian languages.
 */

import Anthropic, { APIError, AuthenticationError, RateLimitError } from "@anthropic-ai/sdk";
import { SarvamAIClient } from "sarvamai";
import { LANGUAGES } from "../src/domain/assistant.js";
import { BarrierCategory } from "../src/domain/enums.js";

const CLAUDE_MODEL = "claude-sonnet-5-5";

// The answer comes back as data, so the emergency flag is a field, not a guess from text.
const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    language_code: { type: "string", enum: LANGUAGES.map((l) => l.code) },
    emergency: { type: "boolean" },
    // A practical problem the family raised (no money, no one to mind the children...), for
    // their care navigator. "none" when there isn't one.
    report: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["none", "barrier"] },
        category: { type: "string", enum: Object.values(BarrierCategory) },
        summary: { type: "string" },
      },
      required: ["kind", "category", "summary"],
      additionalProperties: false,
    },
  },
  required: ["answer", "language_code", "emergency", "report"],
  additionalProperties: false,
};

export class ProviderError extends Error {
  // spent: whether the failed call still cost credit. Rate limits and bad keys don't.
  constructor(message, { status = 502, cause, spent = true } = {}) {
    super(message, { cause });
    this.name = "ProviderError";
    this.status = status;
    this.spent = spent;
  }
}

const fileNameFor = (mimeType) =>
  mimeType.includes("mp4") || mimeType.includes("m4a")
    ? "question.m4a"
    : mimeType.includes("ogg")
      ? "question.ogg"
      : mimeType.includes("wav")
        ? "question.wav"
        : mimeType.includes("mpeg")
          ? "question.mp3"
          : "question.webm";

export const createClaude = ({ apiKey }) => {
  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });

  /**
   * One request whose reply must match `schema`. Returns the parsed object, or
   * { refused: true } when the safety check declined.
   */
  const structured = async ({ system, messages, schema, maxTokens = 4000, effort = "medium" }) => {
    let response;
    try {
      response = await client.beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        // If a safety check declines, Anthropic re-runs the request on its recommended model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort, format: { type: "json_schema", schema } },
        system,
        messages,
      });
    } catch (error) {
      if (error instanceof RateLimitError)
        throw new ProviderError("Claude is busy", { status: 503, cause: error, spent: false });
      if (error instanceof AuthenticationError)
        throw new ProviderError("Claude key is not valid", { status: 500, cause: error, spent: false });
      if (error instanceof APIError) throw new ProviderError("Claude failed", { cause: error });
      throw new ProviderError("Could not reach Claude", { cause: error, spent: false });
    }

    if (response.stop_reason === "refusal") return { refused: true };
    const text = response.content.find((b) => b.type === "text")?.text;
    try {
      return JSON.parse(text);
    } catch (cause) {
      throw new ProviderError(`Claude gave no usable answer (${response.stop_reason})`, { cause });
    }
  };

  return {
    structured,

    /** Returns { answer, languageCode, emergency, report } or { refused: true }. */
    async answer({ system, messages }) {
      // The cap bounds what one question can cost. Indian scripts take several tokens a letter, so
      // a 900-letter Malayalam answer plus its report needs room: a cut-off reply is unreadable JSON.
      const parsed = await structured({ system, messages, schema: ANSWER_SCHEMA, maxTokens: 3000 });
      if (parsed.refused) return parsed;
      if (typeof parsed.answer !== "string") throw new ProviderError("Claude gave no usable answer");
      return {
        answer: parsed.answer.trim(),
        languageCode: parsed.language_code,
        emergency: parsed.emergency,
        report: parsed.report,
      };
    },
  };
};

export const createSarvam = ({ apiKey }) => {
  const client = new SarvamAIClient({ apiSubscriptionKey: apiKey, timeoutInSeconds: 20, maxRetries: 1 });

  const wrap = async (what, run) => {
    try {
      return await run();
    } catch (error) {
      const status = error?.statusCode === 429 ? 503 : error?.statusCode === 403 ? 500 : 502;
      throw new ProviderError(`Sarvam ${what} failed`, { status, cause: error, spent: status === 502 });
    }
  };

  return {
    /** Speech → { transcript, languageCode }. Sarvam detects the language. */
    transcribe: ({ audio, mimeType, keyterms = [] }) =>
      wrap("speech-to-text", async () => {
        const res = await client.speechToText.transcribe({
          file: { data: audio, filename: fileNameFor(mimeType), contentType: mimeType.split(";")[0] },
          model: "saaras:v4",
          language_code: "unknown",
          ...(keyterms.length > 0 && { keyterms: keyterms.slice(0, 50) }),
        });
        const transcript = (res.transcript || "").trim();
        // With almost no usable sound, speech-to-text can return one of the hints on its own
        // ("Karuna Women & Children's Hospital."). A transcript that is only a hint of two or more
        // words is treated as nothing heard. A single-word hint ("108") is kept: it can be a real answer.
        const bare = (t) =>
          t
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
        const onlyAHint = keyterms.some((k) => bare(k).includes(" ") && bare(k) === bare(transcript));
        return { transcript: onlyAHint ? "" : transcript, languageCode: res.language_code || null };
      }),

    translate: ({ text, target }) =>
      wrap("translate", async () => {
        if (target === "en-IN") return text;
        const res = await client.text.translate({
          input: text.slice(0, 1000),
          source_language_code: "en-IN",
          target_language_code: target,
          model: "mayura:v1",
          // Formal is the only mode that keeps English words out: the colloquial modes leave words
          // like "ride" and "card" in Latin letters, which a family that reads only their own script can't read.
          mode: "formal",
          speaker_gender: "Female",
        });
        return res.translated_text || text;
      }),

    /** Text → base64 MP3 in an Indian voice. */
    speak: ({ text, languageCode }) =>
      wrap("text-to-speech", async () => {
        const res = await client.textToSpeech.convert({
          text: text.slice(0, 2500),
          language_code: languageCode,
          model: "bulbul:v3",
          speaker: "priya",
          // A touch quicker than normal: 0.95 sounded slow to families and staff.
          pace: 1.1,
          speech_sample_rate: 22050,
          output_audio_codec: "mp3",
        });
        // One input text gives one clip. Base64 clips can't be joined as strings.
        return res.audios?.[0] || "";
      }),
  };
};

/**
 * The providers whose keys are set, and the names of the keys that aren't. Each key stands alone:
 * with only ANTHROPIC_API_KEY the typed AI features work and voice is off (server/routes.js).
 */
export const createProviders = (env = process.env) => {
  const missing = ["ANTHROPIC_API_KEY", "SARVAM_API_KEY"].filter((k) => !env[k]);
  return {
    ...(env.ANTHROPIC_API_KEY && { claude: createClaude({ apiKey: env.ANTHROPIC_API_KEY }) }),
    ...(env.SARVAM_API_KEY && { sarvam: createSarvam({ apiKey: env.SARVAM_API_KEY }) }),
    ...(missing.length > 0 && { missing }),
  };
};
