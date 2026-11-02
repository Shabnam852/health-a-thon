import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui/index.js";

const TOAST_DURATION_MS = 6000;

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    // A new toast restarts the timer, so an older one cannot hide it early.
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Reports the result of a workflow action.
  const report = (res, successMessage, failurePrefix = "Action failed") =>
    showToast(res.success ? successMessage : `${failurePrefix}: ${res.reason}`, res.success ? undefined : "error");

  return { toast, showToast, report };
};

const Toast = ({ toast }) => {
  const isError = toast?.type === "error";
  const message = toast && (
    <div
      className={`fixed bottom-above-tabs mb-2 lg:mb-0 lg:bottom-6 inset-x-4 sm:left-auto sm:right-6 z-50 px-4 py-3 rounded-control shadow-overlay flex items-center gap-3 text-on-fill ${isError ? "bg-danger" : "bg-brand"}`}
    >
      <Icon name={isError ? "error" : "check_circle"} className={isError ? "text-on-fill" : "text-highlight"} />
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );

  // Screen readers only announce changes to a live region that is already on the page.
  // In the body, so these empty regions don't add to the spacing of the page's own content.
  return createPortal(
    <>
      <div role="status" aria-atomic="true">
        {toast && !isError ? message : null}
      </div>
      <div role="alert" aria-atomic="true">
        {isError ? message : null}
      </div>
    </>,
    document.body,
  );
};

export default Toast;
