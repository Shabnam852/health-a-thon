import { useEffect, useRef, useState } from "react";
import { AUTO_LANGUAGE, profileLanguageCode } from "../../domain/assistant.js";
import { telHref } from "../../domain/contact.js";
import { AssistantRequestError, speakText } from "../../services/assistantApi.js";
import { assistantStore } from "../../services/assistantStore.js";
import { saveVoice, useVoice } from "../../services/voiceCache.js";
import { Button, Icon } from "../ui/index.js";
import { player, useFailedKey, usePlayingKey } from "./player.js";
import { useAssistantStore } from "./useAssistantChat.js";

/** Reads a screen aloud in the family's language, for those who can't read it. */
const ListenButton = ({ text, referral, label = "Listen to this page" }) => {
  const snapshot = useAssistantStore();
  const playingKey = usePlayingKey();
  const failedKey = useFailedKey();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // The voice can arrive after the family has left this screen; it must not start playing then.
  const mounted = useRef(true);
  const keyRef = useRef("");

  const chosen = snapshot.languages[referral.id];
  const languageCode = chosen && chosen !== AUTO_LANGUAGE ? chosen : profileLanguageCode(referral.language);
  const key = `${languageCode}:${text}`;
  const isPlaying = playingKey === key;
  const playFailed = failedKey === key;
  const navHref = telHref(referral.navigator?.phone);
  // The same words in the same language are only paid for once, even after a reload.
  const cached = useVoice(key);
  const outOfUses = !cached && assistantStore.remaining() === 0;
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Leaving the screen stops its reading, but not a chat reply playing elsewhere.
      if (player.getKey() === keyRef.current) player.stop();
    };
  }, []);

  const listen = async () => {
    setError("");
    player.clearError(key);
    if (isPlaying) return player.stop();
    if (cached) return player.play(key, cached);
    if (!assistantStore.takeUse()) return;
    setLoading(true);
    try {
      const res = await speakText({ text, languageCode });
      const src = saveVoice(key, res.audio);
      if (mounted.current) player.play(key, src);
    } catch (e) {
      if (e instanceof AssistantRequestError && !e.reachedAi) assistantStore.returnUse();
      if (mounted.current) setError(e.message || "Couldn't read this aloud.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button size="sm" onClick={listen} disabled={loading || outOfUses}>
        <Icon name={isPlaying ? "stop_circle" : loading ? "hourglass_top" : "volume_up"} size="sm" />
        {isPlaying ? "Stop" : loading ? "Getting voice…" : label}
      </Button>
      {/* Said in words, not only a greyed-out button: why it can't read, and who can help instead. */}
      {outOfUses && (
        <span className="flex flex-wrap items-center gap-2 text-sm text-ink">
          <span>No listens left. Your care navigator can read this to you.</span>
          {navHref && (
            <Button size="sm" variant="secondary" as="a" href={navHref}>
              <Icon name="call" size="sm" />
              Call your care navigator
            </Button>
          )}
        </span>
      )}
      <span role="status" className="flex flex-wrap items-center gap-2 text-sm text-danger-strong">
        {playFailed && (
          <>
            <span>The voice couldn't play. Check your sound is on, then try again.</span>
            <Button size="sm" variant="secondary" onClick={listen}>
              <Icon name="refresh" size="sm" />
              Try again
            </Button>
          </>
        )}
      </span>
      {error && (
        <span role="alert" className="text-xs text-danger-strong">
          {error}
        </span>
      )}
    </span>
  );
};

export default ListenButton;
