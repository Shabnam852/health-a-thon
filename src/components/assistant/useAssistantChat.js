import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { AUTO_LANGUAGE, buildCaseBrief, looksLikeEmergency, profileLanguageCode } from "../../domain/assistant.js";
import { AssistantRequestError, askAssistant, blobToBase64 } from "../../services/assistantApi.js";
import { assistantStore } from "../../services/assistantStore.js";
import { saveVoice } from "../../services/voiceCache.js";
import { player } from "./player.js";

// Questions in flight live here, not in a component, so closing the popup neither loses
// the answer nor lets a second question start alongside the first.
const pendingByReferral = new Map();
const pendingListeners = new Set();
const setPending = (referralId, value) => {
  if (value) pendingByReferral.set(referralId, value);
  else pendingByReferral.delete(referralId);
  for (const listener of pendingListeners) listener();
};
const subscribePending = (listener) => {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
};

// The request for each patient's question in flight, so the family can cancel it.
const controllers = new Map();

// A reply is only read aloud on its own while someone has the chat open.
let openPanels = 0;

let nextId = 0;
const newId = () => `m${Date.now().toString(36)}${(nextId++).toString(36)}`;

// Both are plain functions on the store, so they keep one identity across renders.
export const useAssistantStore = () => useSyncExternalStore(assistantStore.subscribe, assistantStore.getSnapshot);

// Applies a change to the latest saved conversation, never to a copy taken earlier.
const update = (referralId, change) =>
  assistantStore.setMessages(referralId, change(assistantStore.getMessages(referralId)));

/**
 * The conversation for one patient: send a typed or spoken question, get a text and
 * voice answer, play it back. Uses come from the shared limit.
 * onReport passes a possible danger sign or a practical problem on to the care navigator;
 * it returns { success } so the answer can say it was sent.
 */
export const useAssistantChat = (referral, facilities, onReport) => {
  const reportRef = useRef(onReport);
  useEffect(() => {
    reportRef.current = onReport;
  });
  const snapshot = useAssistantStore();
  const referralId = referral?.id;
  const pending = useSyncExternalStore(subscribePending, () => pendingByReferral.get(referralId) ?? null);
  const language = snapshot.languages[referralId] ?? null;
  const remaining = assistantStore.remaining();

  useEffect(() => {
    openPanels += 1;
    return () => {
      openPanels -= 1;
    };
  }, []);

  // A voice question still "hearing" with nothing in flight was cut off by a reload.
  const messages = (snapshot.chats[referralId] ?? []).map((m) =>
    m.status === "hearing" && !pending ? { ...m, status: "lost" } : m,
  );

  const send = useCallback(
    async (input) => {
      if (!referral || pendingByReferral.has(referralId)) return;
      // Only answered questions go back as context, so the model never sees two in a row.
      const answered = new Set();
      const saved = assistantStore.getMessages(referralId);
      saved.forEach((m, i) => {
        if (
          m.role === "user" &&
          m.status === "done" &&
          saved[i + 1]?.role === "assistant" &&
          saved[i + 1].status === "done"
        ) {
          answered.add(m.id).add(saved[i + 1].id);
        }
      });
      const history = saved.filter((m) => answered.has(m.id)).map((m) => ({ role: m.role, content: m.text }));

      if (!assistantStore.takeUse()) return;
      player.stop();

      const question = {
        id: newId(),
        role: "user",
        via: input.blob ? "voice" : "text",
        text: input.text || "",
        status: input.blob ? "hearing" : "done",
        at: new Date().toISOString(),
      };
      update(referralId, (list) => [...list, question]);
      setPending(referralId, input.blob ? "hearing" : "thinking");
      const controller = new AbortController();
      controllers.set(referralId, controller);

      try {
        const payload = {
          brief: buildCaseBrief(referral, facilities),
          language: assistantStore.getLanguage(referralId) || AUTO_LANGUAGE,
          profileLanguage: referral.language || "",
          history,
          ...(input.blob
            ? { audio: { data: await blobToBase64(input.blob), mimeType: input.mimeType } }
            : { text: input.text }),
        };
        const reply = await askAssistant(payload, controller.signal);
        // Told to staff from the family's own words only, never from an earlier turn.
        const told =
          (reply.emergency || reply.report) && reportRef.current
            ? reportRef.current({ question: reply.question, emergency: reply.emergency, report: reply.report })
            : null;
        const answer = {
          id: newId(),
          role: "assistant",
          text: reply.answer,
          languageCode: reply.languageCode,
          emergency: reply.emergency,
          sentToNavigator: Boolean(told?.success),
          status: "done",
          at: new Date().toISOString(),
        };
        // Kept in the voice cache under the answer's id, so it can be replayed after a reload.
        const voice = reply.audio ? saveVoice(answer.id, reply.audio) : null;
        update(referralId, (list) => [
          ...list.map((m) => (m.id === question.id ? { ...m, text: reply.question, status: "done" } : m)),
          answer,
        ]);
        if (voice && openPanels > 0) player.play(answer.id, voice);
      } catch (error) {
        // Cancelled by the family: no answer, so the question doesn't count and isn't kept.
        if (error?.name === "AbortError") {
          assistantStore.returnUse();
          update(referralId, (list) => list.filter((m) => m.id !== question.id));
          return;
        }
        if (error instanceof AssistantRequestError && !error.reachedAi) assistantStore.returnUse();
        const failed = {
          id: newId(),
          role: "assistant",
          text: error.message || "Something went wrong. Please try again.",
          status: "error",
          // No answer came, for any reason (busy, offline, over the limit): a typed question
          // that sounds urgent still gets "call 108" at once.
          emergency: !input.blob && looksLikeEmergency(input.text || ""),
          questionId: question.id,
          retry: input.blob ? null : input.text,
          at: new Date().toISOString(),
        };
        // An unheard voice question has no text to keep. A failed typed one stays visible but is
        // marked, so it is not sent back as context.
        update(referralId, (list) => [
          ...list
            .filter((m) => m.id !== question.id || m.text)
            .map((m) => (m.id === question.id ? { ...m, status: "failed" } : m)),
          failed,
        ]);
      } finally {
        if (controllers.get(referralId) === controller) controllers.delete(referralId);
        setPending(referralId, null);
      }
    },
    [referral, referralId, facilities],
  );

  // Retrying replaces the failed question and its error with a fresh attempt.
  const retry = useCallback(
    (errorMessage) => {
      if (pendingByReferral.has(referralId)) return;
      update(referralId, (list) => list.filter((m) => m.id !== errorMessage.id && m.id !== errorMessage.questionId));
      send({ text: errorMessage.retry });
    },
    [referralId, send],
  );

  // Stops the question in flight. Returns a typed question's words, so they can go back in the box.
  const cancel = useCallback(() => {
    const controller = controllers.get(referralId);
    if (!controller) return "";
    const last = assistantStore.getMessages(referralId).findLast((m) => m.role === "user");
    controller.abort();
    return last?.via === "text" ? last.text : "";
  }, [referralId]);

  const clear = useCallback(() => {
    player.stop();
    assistantStore.setMessages(referralId, []);
  }, [referralId]);

  const setLanguage = useCallback((code) => assistantStore.setLanguage(referralId, code), [referralId]);

  return {
    messages,
    pending,
    remaining,
    language,
    suggestedLanguage: profileLanguageCode(referral?.language),
    setLanguage,
    send,
    retry,
    cancel,
    clear,
  };
};
