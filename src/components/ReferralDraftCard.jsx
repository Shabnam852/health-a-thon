import { useRef, useState } from "react";
import { AssistantRequestError, blobToBase64, draftReferral } from "../services/assistantApi.js";
import { assistantStore } from "../services/assistantStore.js";
import MicMeter from "./assistant/MicMeter.jsx";
import { canRecord, useRecorder } from "./assistant/useRecorder.js";
import { Button, Card, Field, Icon, Textarea } from "./ui/index.js";

// Photos are shrunk in the browser: big enough to read handwriting, small enough to send.
const MAX_SIDE = 1600;

const shrinkPhoto = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.addEventListener("load", () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1] || "");
    });
    img.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a photo this browser can open."));
    });
    img.src = url;
  });

/**
 * The sources the AI fills the form from, kept on screen so they can be checked against the
 * form: a typed note, what the recordings were heard as (which can be corrected), and a photo
 * of a referral slip. They add up: every fill sends all of them together.
 * `onDraft(draft, kinds)` receives the checked fields and the kinds of source used.
 */
// A source with the words behind the field being checked marked, like linked evidence.
const Marked = ({ title, text, quote }) => {
  const flat = text.replace(/\s+/g, " ");
  const at = flat.toLowerCase().indexOf(quote.replace(/\s+/g, " ").toLowerCase());
  if (at < 0) return null;
  const end = at + quote.replace(/\s+/g, " ").length;
  return (
    <div className="rounded-control border border-line bg-muted p-3 text-sm text-ink whitespace-pre-wrap break-words">
      <p className="mb-1 text-xs font-semibold text-ink-muted">{title}</p>
      {flat.slice(0, at)}
      <mark className="rounded bg-highlight px-0.5 text-on-highlight font-semibold">{flat.slice(at, end)}</mark>
      {flat.slice(end)}
    </div>
  );
};

const ReferralDraftCard = ({ options, onDraft, highlight = null, className = "" }) => {
  const [note, setNote] = useState("");
  // Every recording so far, as heard. The clinician can fix wrong words before filling again.
  const [heard, setHeard] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const fileRef = useRef(null);

  // Sends every source there is, plus a new recording or photo when there is one.
  const run = async ({ audio, newPhoto } = {}) => {
    if (inFlight.current) return;
    if (!assistantStore.takeUse()) {
      setError("The demo's AI uses are used up. Ask a team member to reset them.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const usePhoto = newPhoto || photo;
      const clip = audio ? await audio() : null;
      const result = await draftReferral({
        text: note.trim() || undefined,
        heard: heard.trim() || undefined,
        audio: clip || undefined,
        image: usePhoto ? { data: usePhoto.data, mediaType: "image/jpeg" } : undefined,
        options,
      });
      const nextHeard = result.heard || "";
      setHeard(nextHeard);
      if (newPhoto) setPhoto(newPhoto);
      const kinds = [note.trim() && "note", nextHeard && "voice", usePhoto && "photo"].filter(Boolean);
      onDraft(result.draft, kinds);
    } catch (err) {
      if (!(err instanceof AssistantRequestError) || !err.reachedAi) assistantStore.returnUse();
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Clinicians pause while dictating: only Stop and fill, or the time limit, ends the recording.
  const recorder = useRecorder({
    autoStop: false,
    onClip: ({ blob, mimeType }) => run({ audio: async () => ({ data: await blobToBase64(blob), mimeType }) }),
    onNoSpeech: () => setError("Nothing was heard. Tap Record and speak the referral."),
  });
  const recording = recorder.state === "recording" || recorder.state === "starting";
  const micProblem =
    recorder.state === "denied"
      ? "The microphone is blocked. Allow it in the browser, or type the note instead."
      : recorder.state === "missing"
        ? "No microphone found. Check one is connected, and on a Mac that the browser is allowed in System Settings, Privacy & Security, Microphone. Then restart the browser."
        : recorder.state === "busy"
          ? "Another app is using the microphone. Close it and try again, or type the note."
          : recorder.state === "error"
            ? "The microphone didn't start. Type the note instead."
            : "";

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await shrinkPhoto(file);
      run({ newPhoto: { data, url: `data:image/jpeg;base64,${data}` } });
    } catch (err) {
      setError(err.message);
    }
  };

  const hasSource = Boolean(note.trim() || heard.trim() || photo);
  const showMarked = highlight?.quote;

  return (
    <Card as="section" title="Fill with AI" className={`space-y-3 ${className}`}>
      <p className="text-sm text-ink-muted">
        Type, speak or photograph the referral, in any mix. AI fills the empty fields and never changes what you typed.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {canRecord() &&
          (recording ? (
            <Button variant="primary" onClick={recorder.stop} fullWidth className="!px-3">
              <Icon name="stop_circle" size="sm" />
              Stop and fill
            </Button>
          ) : (
            <Button
              onClick={() => {
                // An old "nothing was heard" would contradict the meter.
                setError("");
                recorder.start();
              }}
              disabled={busy}
              fullWidth
              className="!px-3"
            >
              <Icon name="mic" size="sm" />
              {heard ? "Record more" : "Record"}
            </Button>
          ))}
        <Button onClick={() => fileRef.current?.click()} disabled={busy || recording} fullWidth className="!px-3">
          <Icon name="photo_camera" size="sm" />
          {photo ? "New photo" : "Photo of slip"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPhoto}
        />
      </div>

      {recorder.state === "recording" && (
        <>
          <MicMeter levelRef={recorder.levelRef} seconds={recorder.seconds} />
          <p role="status" className="sr-only">
            Listening. Speak the referral, then tap Stop and fill.
          </p>
        </>
      )}

      {showMarked && highlight.source === "note" && (
        <Marked title="From the typed note" text={note} quote={highlight.quote} />
      )}
      {showMarked && highlight.source === "voice" && (
        <Marked title="From the recording" text={heard} quote={highlight.quote} />
      )}
      {showMarked && highlight.source === "photo" && (
        <p className="rounded-control border border-line bg-muted p-3 text-sm text-ink">
          <span className="block text-xs font-semibold text-ink-muted">Read from the photo</span>"{highlight.quote}"
        </p>
      )}

      <Field label="Typed note">
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: Fathima Begum, 29, G3P2 at 36 weeks, PPROM since this morning, BP 128/82, speaks Urdu."
          className="resize-y"
        />
      </Field>

      {heard && (
        <div className="space-y-1">
          <Field label="What the AI heard" hint="Fix any wrong words, then fill again.">
            <Textarea rows={3} value={heard} onChange={(e) => setHeard(e.target.value)} className="resize-y" />
          </Field>
          <Button variant="link" size="flush" onClick={() => setHeard("")} disabled={busy}>
            Remove the recordings
          </Button>
        </div>
      )}

      {photo && (
        <figure className="space-y-1">
          <img
            src={photo.url}
            alt="The referral slip the AI read"
            className="w-full max-h-32 object-contain rounded-control border border-line bg-muted"
          />
          <figcaption className="flex items-center justify-between gap-2 text-xs text-ink-muted">
            The photo the AI read.
            <Button variant="link" size="flush" onClick={() => setPhoto(null)} disabled={busy}>
              Remove photo
            </Button>
          </figcaption>
        </figure>
      )}

      <Button variant="primary" fullWidth onClick={() => run()} disabled={busy || recording || !hasSource}>
        {busy ? "Filling…" : "Fill form"}
      </Button>

      {busy && (
        <p role="status" className="text-sm text-ink">
          Filling the form…
        </p>
      )}
      {(error || micProblem) && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error || micProblem}
        </p>
      )}
      <p className="text-xs text-ink-muted">Demo: made-up patients only.</p>
    </Card>
  );
};

export default ReferralDraftCard;
