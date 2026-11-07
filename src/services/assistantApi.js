// Calls our own /api/assistant. The AI keys live on the server, never here.

export class AssistantRequestError extends Error {
  constructor(message, { status, reachedAi }) {
    super(message);
    this.name = "AssistantRequestError";
    this.status = status;
    // Rejected before any AI call (bad input, not set up, offline): it shouldn't cost a use.
    this.reachedAi = reachedAi;
  }
}

const post = async (path, payload, signal) => {
  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new AssistantRequestError("You seem to be offline. Please check your internet and try again.", {
      status: 0,
      reachedAi: false,
    });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AssistantRequestError(body.error || "Something went wrong. Please try again.", {
      status: res.status,
      reachedAi: body.usedAi === true,
    });
  }
  return body;
};

export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",")[1] || ""));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });

export const askAssistant = (payload, signal) => post("/api/assistant", payload, signal);

export const speakText = (payload, signal) => post("/api/assistant/speak", payload, signal);

// Staff tools. Same server, same rule: the keys never reach the browser.
export const draftHandoff = (payload, signal) => post("/api/ai/handoff", payload, signal);

export const draftReferral = (payload, signal) => post("/api/ai/referral-draft", payload, signal);
