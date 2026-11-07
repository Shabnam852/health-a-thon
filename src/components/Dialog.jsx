import { useEffect, useId, useRef } from "react";
import { Button } from "./ui/index.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// Tab can't reach what is folded inside a closed <details>, only its summary.
const canTabTo = (el) => {
  const folded = el.closest("details:not([open])");
  return !folded || (el.parentElement === folded && el.tagName === "SUMMARY");
};

// Modals can nest (a dialog opened inside the menu drawer) and unmount in either order, so the page
// unlocks only when the last one goes. Restoring a saved value per modal could leave the page locked.
let scrollLocks = 0;
let overflowBeforeLock = "";
const lockScroll = () => {
  if (scrollLocks++ === 0) overflowBeforeLock = document.body.style.overflow;
  document.body.style.overflow = "hidden";
};
const unlockScroll = () => {
  if (--scrollLocks === 0) document.body.style.overflow = overflowBeforeLock;
};

/**
 * Modal behaviour for a panel: moves focus in, keeps Tab inside, closes on Escape,
 * stops the page behind from scrolling, and returns focus to where it was.
 */
export const useModalFocus = (panelRef, onClose) => {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    const opener = document.activeElement;
    const focusable = () => [...panel.querySelectorAll(FOCUSABLE)].filter(canTabTo);

    (focusable()[0] || panel).focus();
    lockScroll();

    const handleKeyDown = (e) => {
      if (e.key !== "Escape" && e.key !== "Tab") return;
      // A dialog can open inside the menu drawer, so these keys must not reach the drawer too.
      e.stopPropagation();
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Focus can rest on the panel itself (a click on its text), which is neither first nor last.
      const atEdge = active === panel || !panel.contains(active);
      if (e.shiftKey && (active === first || atEdge)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (active === last || atEdge)) {
        e.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", handleKeyDown);

    return () => {
      panel.removeEventListener("keydown", handleKeyDown);
      unlockScroll();
      opener?.focus?.();
    };
  }, [panelRef]);
};

// The panel fits the visible viewport (100dvh shrinks with the on-screen keyboard and browser bars) and
// clears the phone's home indicator. Only the body scrolls, so the title and the footer actions stay in reach.
// `wide` is for content that needs the room, such as a photo to read.
const Dialog = ({ title, onClose, danger, footer, wide, children }) => {
  const panelRef = useRef(null);
  const titleId = useId();
  useModalFocus(panelRef, onClose);

  return (
    // !mt-0: a dialog can sit inside a spaced page, whose top margin would leave a gap above the overlay.
    <div className="fixed inset-0 !mt-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-surface rounded-t-card sm:rounded-card ${wide ? "max-w-5xl" : "max-w-md"} w-full max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-overlay border border-line pb-[env(safe-area-inset-bottom)] sm:pb-0`}
      >
        <h2
          id={titleId}
          className={`shrink-0 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 text-lg font-display font-semibold break-words ${danger ? "text-danger" : "text-ink"}`}
        >
          {title}
        </h2>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 space-y-4 ${footer ? "pb-4" : "pb-5 sm:pb-6"}`}
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 sm:px-6 pt-4 pb-5 sm:pb-6 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// A failed save, shown inside the dialog so what was typed stays on screen.
export const DialogError = ({ children }) =>
  children ? (
    <p
      role="alert"
      className="text-sm font-semibold text-danger-strong bg-danger-soft border-l-4 border-danger rounded-control px-3 py-2"
    >
      {children}
    </p>
  ) : null;

// A dialog that ends with Cancel and one action. `error` is a failed save: the dialog stays open with it.
export const FormDialog = ({ title, danger, onCancel, onSave, saveLabel, saveDisabled, error, children }) => (
  <Dialog
    title={title}
    danger={danger}
    onClose={onCancel}
    footer={
      <>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} disabled={saveDisabled} onClick={onSave}>
          {saveLabel}
        </Button>
      </>
    }
  >
    {children}
    <DialogError>{error}</DialogError>
  </Dialog>
);

export default Dialog;
