import { Fragment, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useReferrals } from "../../context/ReferralContext.jsx";
import { ASSISTANT_LIMIT, AUTO_LANGUAGE, getLanguage, MAX_QUESTION_CHARS } from "../../domain/assistant.js";
import { telHref } from "../../domain/contact.js";
import { useVoice } from "../../services/voiceCache.js";
import { Button, Icon } from "../ui/index.js";
import { chatStrings, chatStringsLang } from "./chatStrings.js";
import LanguagePicker from "./LanguagePicker.jsx";
import MicMeter from "./MicMeter.jsx";
import { player, useFailedKey, usePlayingKey } from "./player.js";
import { useAssistantChat } from "./useAssistantChat.js";
import { canRecord, useRecorder } from "./useRecorder.js";

// Matches the suggestions in chatStrings: next step, ride, what to bring, who to call, a problem.
const SUGGESTION_ICONS = ["signpost", "airport_shuttle", "luggage", "call", "report"];

// Matches canDo in chatStrings: what the assistant can do, said plainly on the first screen.
const CAN_DO_ICONS = ["help", "volume_up", "forward_to_inbox"];

const languageLabel = (code) => (code === AUTO_LANGUAGE ? "your language" : getLanguage(code)?.name || "English");

// When a message was sent. Messages saved before times were kept carry it in their id.
const sentAt = (message) => {
  if (message.at) return new Date(message.at);
  const fromId = Number.parseInt(String(message.id).slice(1, 9), 36);
  return Number.isFinite(fromId) ? new Date(fromId) : null;
};
const timeLabel = (date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const dayKey = (date) => date.toDateString();
const dayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Today";
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

const CAN_SHARE = typeof navigator !== "undefined" && typeof navigator.share === "function";

// Shows the counter only once the question gets close to the limit.
const COUNTER_FROM = 60;

const subscribeOnline = (listener) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};
const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

const Stamp = ({ message, mine }) => {
  const date = sentAt(message);
  if (!date) return null;
  return (
    <p className={`mt-1 text-xs text-ink-muted ${mine ? "text-right" : ""}`}>
      {message.status === "failed" ? "Not sent · " : ""}
      <time dateTime={date.toISOString()}>{timeLabel(date)}</time>
    </p>
  );
};

const Bubble = ({ message, playingKey, failedKey, navigatorPhone, onRetry, t, lang }) => {
  const mine = message.role === "user";
  const isPlaying = playingKey === message.id;
  const playFailed = failedKey === message.id;
  // The answer's voice, from this visit or saved from an earlier one.
  const voice = useVoice(mine ? null : message.id);
  const [shareState, setShareState] = useState("");

  if (message.status === "hearing" || message.status === "lost") {
    return (
      <li className="flex flex-col items-end">
        <p
          className={`max-w-[85%] rounded-card rounded-br-control px-3 py-2 text-sm italic ${
            message.status === "lost" ? "bg-muted text-ink-muted" : "bg-accent text-on-fill"
          }`}
        >
          <span className="sr-only">You: </span>
          {message.status === "lost"
            ? "This voice question didn't get through. Please ask again."
            : "Voice question sent"}
        </p>
        <Stamp message={message} mine />
      </li>
    );
  }

  if (message.status === "error") {
    return (
      <li className="flex flex-col items-start">
        <div className="max-w-[85%] rounded-card rounded-bl-control px-3 py-2 bg-danger-soft text-danger-strong text-sm space-y-2">
          {/* The reason comes from the server in English; the family also gets it in their language. */}
          {lang !== "en-IN" && (
            <p lang={lang} className="font-semibold">
              {t.failed}
            </p>
          )}
          <p lang={lang !== "en-IN" ? "en" : undefined} className={lang !== "en-IN" ? "text-xs" : undefined}>
            <span className="sr-only">Assistant: </span>
            {message.text}
          </p>
          {message.emergency && (
            <p lang={lang} className="font-semibold">
              {t.urgent}
            </p>
          )}
          <div lang={lang} className="flex flex-wrap gap-2">
            {message.emergency && (
              <Button size="sm" variant="danger" as="a" href="tel:108" wrap>
                <Icon name="call" size="sm" />
                {t.call108Now}
              </Button>
            )}
            {message.retry && (
              <Button size="sm" wrap onClick={() => onRetry(message)}>
                <Icon name="refresh" size="sm" />
                {t.tryAgain}
              </Button>
            )}
            {navigatorPhone && (
              <Button size="sm" wrap as="a" href={telHref(navigatorPhone)}>
                <Icon name="call" size="sm" />
                {t.callNavigator}
              </Button>
            )}
          </div>
        </div>
        <Stamp message={message} />
      </li>
    );
  }

  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-card px-3 py-2 text-sm space-y-2 ${
          mine
            ? "rounded-br-control bg-accent text-on-fill"
            : message.emergency
              ? "rounded-bl-control bg-danger-soft text-danger-strong border border-danger"
              : "rounded-bl-control bg-muted text-ink border border-line"
        }`}
      >
        <p className="whitespace-pre-wrap break-words" lang={mine ? undefined : message.languageCode}>
          <span className="sr-only">{mine ? "You: " : "Assistant: "}</span>
          {mine && message.via === "voice" && <Icon name="mic" size="sm" className="mr-1 align-[-3px]" />}
          {message.text}
        </p>
        {shareState === "failed" && (
          <p role="alert" className="text-xs font-semibold">
            Couldn't copy. Press and hold the answer to copy it.
          </p>
        )}
        {!mine && message.sentToNavigator && (
          <p className="flex items-center gap-1 text-xs font-semibold">
            <Icon name="forward_to_inbox" size="sm" />
            Sent to your care navigator
          </p>
        )}
        {/* Shown here; announced once by the panel's status line. */}
        {!mine && playFailed && (
          <p lang={lang} className="text-xs font-semibold">
            {t.playFailed}
          </p>
        )}
        {!mine && (
          <div className="flex flex-wrap gap-2">
            {message.emergency && (
              <Button size="sm" variant="danger" as="a" href="tel:108" wrap lang={lang}>
                <Icon name="call" size="sm" />
                {t.call108Now}
              </Button>
            )}
            {voice && playFailed && (
              <Button size="sm" variant="secondary" onClick={() => player.play(message.id, voice)} lang={lang}>
                <Icon name="refresh" size="sm" />
                {t.tryAgain}
              </Button>
            )}
            {voice && !playFailed && (
              <Button size="sm" variant="secondary" onClick={() => player.toggle(message.id, voice)}>
                <Icon name={isPlaying ? "stop_circle" : "volume_up"} size="sm" />
                <span lang={lang}>{isPlaying ? t.stop : t.listen}</span>
                <span className="sr-only"> to this answer</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message.text);
                  setShareState("copied");
                } catch {
                  setShareState("failed");
                }
              }}
            >
              <Icon name={shareState === "copied" ? "check" : "content_copy"} size="sm" />
              {shareState === "copied" ? "Copied" : "Copy"}
              <span className="sr-only"> this answer</span>
            </Button>
            {CAN_SHARE && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigator.share({ text: message.text }).catch(() => {})}
              >
                <Icon name="share" size="sm" />
                Share
                <span className="sr-only"> this answer</span>
              </Button>
            )}
          </div>
        )}
      </div>
      <Stamp message={message} mine={mine} />
    </li>
  );
};

/**
 * The family's assistant. A popup on desktop (variant "popup") and a full screen on
 * phones (variant "screen"); the same conversation either way.
 */
const ChatPanel = ({ referral, facilities, variant = "popup", titleId, onClose, inputRef }) => {
  const { reportFromFamily } = useReferrals();
  const chat = useAssistantChat(referral, facilities, (report) => reportFromFamily(referral.id, report));
  const playingKey = usePlayingKey();
  const failedKey = useFailedKey();
  // The chat's own words follow the chosen language (or, before one is chosen or on "auto",
  // the language on the patient's record).
  const t = chatStrings(chat.language, chat.suggestedLanguage);
  const lang = chatStringsLang(chat.language, chat.suggestedLanguage);
  const [draft, setDraft] = useState("");
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  // A plain update, not a problem: shown in grey, not red.
  const [info, setInfo] = useState("");
  const keepRef = useRef(null);
  const listRef = useRef(null);
  const ownInputRef = useRef(null);
  const textRef = inputRef || ownInputRef;
  const hintId = useId();
  const voiceSupported = canRecord();
  const online = useOnline();

  const recorder = useRecorder({
    onClip: ({ blob, mimeType }) => chat.send({ blob, mimeType }),
    onNoSpeech: () => setNotice("noSpeech"),
  });
  const recording = recorder.state === "recording" || recorder.state === "starting";
  const wasRecording = useRef(false);
  const changeLanguageRef = useRef(null);
  const sendRef = useRef(null);
  const outOfUses = chat.remaining === 0;
  const busy = Boolean(chat.pending) || recording;
  const navigatorPhone = referral?.navigator?.phone;
  const Heading = variant === "screen" ? "h1" : "h2";

  // The microphone button is replaced by the recording controls and back: keep focus with the
  // person instead of letting it fall to the page.
  useEffect(() => {
    if (recording) sendRef.current?.focus();
    else if (wasRecording.current) textRef.current?.focus();
    wasRecording.current = recording;
  }, [recording, textRef]);

  // Keep the newest message in view: scroll whenever the conversation's length or state changes.
  const scrollKey = `${chat.messages.length}:${chat.pending}`;
  useEffect(() => {
    const list = listRef.current;
    if (list && scrollKey) list.scrollTo({ top: list.scrollHeight });
  }, [scrollKey]);

  const MIC_NOTICES = { denied: t.micDenied, missing: t.micMissing, busy: t.micBusy, error: t.micError };
  const shownNotice = (!online && t.offline) || MIC_NOTICES[recorder.state] || (notice && t[notice]) || "";

  const submit = (text) => {
    const question = text.trim();
    if (!question || busy || outOfUses || !online) return;
    setNotice("");
    setInfo("");
    setDraft("");
    chat.send({ text: question });
  };

  const header = (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-surface">
      <span
        aria-hidden="true"
        className="w-9 h-9 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center"
      >
        <Icon name="support_agent" />
      </span>
      <div className="min-w-0 flex-1">
        <Heading id={titleId} lang={lang} className="font-display text-base font-semibold text-ink leading-tight">
          {t.title}
        </Heading>
        <p className="text-xs text-ink-muted truncate">
          {chat.language ? `Answers in ${languageLabel(chat.language)}` : "Choose a language to start"}
          {" · "}
          {chat.remaining} of {ASSISTANT_LIMIT} left
        </p>
      </div>
      {chat.language && !choosingLanguage && (
        <Button
          size="icon"
          variant="ghost"
          ref={changeLanguageRef}
          onClick={() => setChoosingLanguage(true)}
          aria-label="Change language"
          title="Change language"
        >
          <Icon name="translate" />
        </Button>
      )}
      {chat.messages.length > 0 && !choosingLanguage && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setConfirmingClear(true);
            requestAnimationFrame(() => keepRef.current?.focus());
          }}
          disabled={busy || confirmingClear}
          aria-label="Clear conversation"
          title="Clear conversation"
        >
          <Icon name="delete_sweep" />
        </Button>
      )}
      {onClose && (
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close assistant" title="Close">
          <Icon name="close" />
        </Button>
      )}
    </div>
  );

  // 108 is one tap away in every state of the assistant, not only after an emergency answer.
  const emergencyBar = (
    <div className="flex items-center px-4 py-2 border-b border-line bg-surface">
      <Button size="sm" variant="danger" as="a" href="tel:108" wrap lang={lang}>
        <Icon name="call" size="sm" />
        {t.call108}
      </Button>
    </div>
  );

  const keepConversation = () => {
    setConfirmingClear(false);
    textRef.current?.focus();
  };

  const keepOnEscape = (e) => {
    if (e.key === "Escape") keepConversation();
  };

  // An ordinary inline question, not a dialog: the rest of the chat stays usable, and Escape keeps.
  const clearBar = confirmingClear && (
    <div
      role="group"
      aria-label="Clear conversation"
      className="flex flex-wrap items-center gap-2 border-b border-line bg-caution-soft px-4 py-2"
    >
      <p className="flex-1 min-w-[10rem] text-sm text-ink">Clear this conversation? It can't be brought back.</p>
      <Button ref={keepRef} size="sm" onClick={keepConversation} onKeyDown={keepOnEscape}>
        Keep
      </Button>
      <Button
        size="sm"
        variant="danger"
        onKeyDown={keepOnEscape}
        onClick={() => {
          chat.clear();
          setConfirmingClear(false);
          // The button disappears with the conversation: focus moves to the message box.
          textRef.current?.focus();
        }}
      >
        Clear
      </Button>
    </div>
  );

  if (!chat.language || choosingLanguage) {
    return (
      <>
        {header}
        {emergencyBar}
        <LanguagePicker
          strings={t}
          lang={lang}
          current={chat.language}
          suggested={chat.suggestedLanguage}
          onChoose={(code) => {
            chat.setLanguage(code);
            setChoosingLanguage(false);
            // The picker is gone: put the family straight into the message box.
            requestAnimationFrame(() => textRef.current?.focus());
          }}
          onCancel={
            chat.language
              ? () => {
                  setChoosingLanguage(false);
                  requestAnimationFrame(() => changeLanguageRef.current?.focus());
                }
              : null
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      {emergencyBar}
      {clearBar}

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-surface">
        {chat.messages.length === 0 && (
          <div lang={lang} className="space-y-5">
            <div className="space-y-1">
              <p className="text-base font-semibold text-ink">{t.welcome}</p>
              <p className="text-sm text-ink-muted">{t.welcomeHint}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">{t.canTitle}</p>
              <ul className="space-y-2">
                {t.canDo.map((text, i) => (
                  <li key={CAN_DO_ICONS[i] || text} className="flex items-start gap-2 text-sm text-ink">
                    <Icon name={CAN_DO_ICONS[i] || "check"} className="text-accent shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">{t.tryAsking}</p>
              <ul aria-label={t.tryAsking} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {t.suggestions.map((q, i) => (
                  <li key={q}>
                    <Button size="sm" fullWidth wrap onClick={() => submit(q)} disabled={busy || outOfUses}>
                      <Icon name={SUGGESTION_ICONS[i] || "help"} size="sm" />
                      {q}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* role="log" announces each new message to screen readers as it arrives. */}
        <div role="log" aria-label="Conversation">
          <ol className="space-y-3">
            {chat.messages.map((m, i) => {
              const date = sentAt(m);
              const previous = i > 0 ? sentAt(chat.messages[i - 1]) : null;
              const newDay = date && (!previous || dayKey(previous) !== dayKey(date));
              return (
                <Fragment key={m.id}>
                  {newDay && <li className="text-center text-xs font-semibold text-ink-muted">{dayLabel(date)}</li>}
                  <Bubble
                    message={m}
                    playingKey={playingKey}
                    failedKey={failedKey}
                    navigatorPhone={navigatorPhone}
                    onRetry={chat.retry}
                    t={t}
                    lang={lang}
                  />
                </Fragment>
              );
            })}
          </ol>
        </div>

        <div role="status" className="text-sm text-ink-muted">
          {failedKey && chat.messages.some((m) => m.id === failedKey) && (
            <span lang={lang} className="sr-only">
              {t.playFailed}
            </span>
          )}
          {chat.pending && (
            <span className="inline-flex items-center gap-2 rounded-card bg-muted px-3 py-2">
              <Icon name={chat.pending === "hearing" ? "hearing" : "hourglass_top"} size="sm" />
              {chat.pending === "hearing" ? "Listening to your question…" : "Thinking…"}
            </span>
          )}
          {chat.pending && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-2"
              onClick={() => {
                const words = chat.cancel();
                if (words) setDraft(words);
                setNotice("");
                setInfo("Question cancelled. It didn't count.");
                textRef.current?.focus();
              }}
            >
              Cancel
              <span className="sr-only"> this question</span>
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-surface p-3 space-y-2">
        {shownNotice && (
          <p role="alert" lang={lang} className="text-xs text-danger-strong">
            {shownNotice}
          </p>
        )}
        {!shownNotice && info && (
          <p role="status" className="text-xs text-ink-muted">
            {info}
          </p>
        )}

        {outOfUses ? (
          <div className="space-y-2">
            <p className="text-sm text-ink">
              You've used all {ASSISTANT_LIMIT} questions. Your care navigator can help.
            </p>
            {navigatorPhone && (
              <Button as="a" href={telHref(navigatorPhone)} variant="primary" fullWidth lang={lang}>
                <Icon name="call" />
                {t.callNavigator}
              </Button>
            )}
          </div>
        ) : recording ? (
          <div className="space-y-2">
            <MicMeter levelRef={recorder.levelRef} seconds={recorder.seconds} strings={t} lang={lang} />
            <div lang={lang} className="flex items-center gap-3">
              <p className="flex-1 text-xs text-ink-muted">{t.stopsByItself}</p>
              <Button variant="ghost" onClick={recorder.cancel}>
                {t.cancel}
              </Button>
              <Button ref={sendRef} variant="primary" onClick={recorder.stop}>
                <Icon name="send" />
                {t.send}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
          >
            <label className="flex-1 min-w-0" lang={lang}>
              <span className="sr-only">{t.inputLabel}</span>
              <textarea
                ref={textRef}
                rows={1}
                value={draft}
                maxLength={MAX_QUESTION_CHARS}
                aria-describedby={hintId}
                placeholder={t.placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit(draft);
                  }
                }}
                className="block w-full min-h-control max-h-32 resize-none px-3 py-2.5 rounded-control bg-surface text-ink text-sm border border-line-strong placeholder:text-ink-muted [field-sizing:content]"
              />
            </label>
            {voiceSupported && (
              <Button
                size="icon"
                variant={draft.trim() ? "secondary" : "primary"}
                onClick={() => {
                  setNotice("");
                  // An old "Question cancelled" would read as if this voice question was cancelled.
                  setInfo("");
                  player.stop();
                  recorder.start();
                }}
                disabled={busy || !online}
                aria-label={t.askByVoice}
                title={t.askByVoice}
              >
                <Icon name="mic" />
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              variant={draft.trim() ? "primary" : "secondary"}
              disabled={busy || !online || !draft.trim()}
              aria-label={t.send}
              title={t.send}
            >
              <Icon name="send" />
            </Button>
          </form>
        )}
        {MAX_QUESTION_CHARS - draft.length <= COUNTER_FROM && !recording && !outOfUses && (
          <p className="text-xs text-ink-muted tabular-nums">{MAX_QUESTION_CHARS - draft.length} characters left</p>
        )}
        <p id={hintId} lang={lang} className="text-xs text-ink-muted">
          {voiceSupported ? t.hint : t.hintNoVoice} {t.footer}
        </p>
      </div>
    </>
  );
};

export default ChatPanel;
