import { useEffect, useId, useRef } from "react";
import { Button } from "./ui/index.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// Tab can't reach what is folded inside a closed <details>, only its summary.
const canTabTo = (el) => {
  const folded = el.closest("details:not([open])");
  return !folded || (el.parentElement === folded && el.tagName === "SUMMARY");
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
    // A dialog can open inside the menu drawer, which must keep the page locked when it closes.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", handleKeyDown);

    return () => {
      panel.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [panelRef]);
};

const Dialog = ({ title, onClose, danger, children }) => {
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
        className="bg-surface rounded-t-card sm:rounded-card p-5 sm:p-6 max-w-md w-full max-h-screen overflow-y-auto shadow-overlay border border-line space-y-4"
      >
        <h2
          id={titleId}
          className={`text-lg font-display font-semibold break-words ${danger ? "text-danger" : "text-ink"}`}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

// A dialog that ends with Cancel and one action.
export const FormDialog = ({ title, danger, onCancel, onSave, saveLabel, saveDisabled, children }) => (
  <Dialog title={title} danger={danger} onClose={onCancel}>
    {children}
    <div className="flex justify-end gap-2">
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant={danger ? "danger" : "primary"} disabled={saveDisabled} onClick={onSave}>
        {saveLabel}
      </Button>
    </div>
  </Dialog>
);

export default Dialog;
