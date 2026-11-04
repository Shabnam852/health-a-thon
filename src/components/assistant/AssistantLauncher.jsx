import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useReferrals } from "../../context/ReferralContext.jsx";
import { Role } from "../../domain/enums.js";
import { Icon } from "../ui/index.js";
import ChatPanel from "./ChatPanel.jsx";
import { usePatientCase } from "./usePatientCase.js";

export const ASSISTANT_PATH = "/patient/assistant";

const FOCUSABLE = "textarea, input, button:not([disabled])";

/**
 * The family's way into the assistant, on every patient screen. On a desktop it opens a
 * popup beside the page; on a phone it goes to the full chat screen.
 */
const AssistantLauncher = () => {
  const { role, storyStep } = useReferrals();
  const { referral, facilities } = usePatientCase();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const launcherRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const panelId = useId();
  const titleId = useId();

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  // Non-modal: the page stays usable, so focus moves in but is not trapped.
  useEffect(() => {
    if (!open) return undefined;
    // The message box, else the chosen language (the first step), else the first control.
    (
      inputRef.current ||
      panelRef.current?.querySelector("input:checked") ||
      panelRef.current?.querySelector(FOCUSABLE) ||
      panelRef.current
    )?.focus();
    // Escape closes it while focus is inside, as for any dialog.
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || !panelRef.current?.contains(document.activeElement)) return;
      e.stopPropagation();
      setOpen(false);
      launcherRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (role !== Role.PATIENT || !referral || pathname.startsWith(ASSISTANT_PATH)) return null;

  // Clear of the phone tab bar and of the guided demo bar.
  const lift = storyStep !== null ? "bottom-60 lg:bottom-32" : "bottom-[calc(var(--size-tabbar)+1rem)] lg:bottom-6";
  const fab =
    "fixed right-4 lg:right-6 z-40 inline-flex items-center gap-2 min-h-control rounded-full pl-4 pr-5 bg-accent text-on-fill font-semibold shadow-raised hover:bg-accent-hover";

  return (
    <>
      {/* Phone: a full screen chat is easier to use than a popup. */}
      <Link to={ASSISTANT_PATH} className={`lg:hidden ${fab} ${lift}`}>
        <Icon name="support_agent" />
        Ask
      </Link>

      <button
        ref={launcherRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={`max-lg:hidden ${fab} ${lift}`}
      >
        <Icon name={open ? "close" : "support_agent"} />
        {open ? "Close" : "Ask about your visit"}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`hidden lg:flex flex-col fixed right-6 z-40 w-[26rem] max-w-[calc(100vw-3rem)] h-[min(40rem,calc(100dvh-10rem))] rounded-card bg-surface border border-line shadow-overlay overflow-hidden ${
            storyStep !== null ? "bottom-48" : "bottom-24"
          }`}
        >
          <ChatPanel
            referral={referral}
            facilities={facilities}
            titleId={titleId}
            onClose={close}
            inputRef={inputRef}
          />
        </div>
      )}
    </>
  );
};

export default AssistantLauncher;
