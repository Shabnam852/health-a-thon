import React, { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3500;

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

  return { toast, showToast };
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  const isError = toast.type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up ${
        isError
          ? "bg-error text-white border border-error"
          : "bg-primary text-white border border-secondary/40"
      }`}
    >
      <span className={`material-symbols-outlined text-[22px] ${isError ? "text-white" : "text-secondary-fixed"}`}>
        {isError ? "error" : "check_circle"}
      </span>
      <span className="font-body-sm text-sm font-medium">{toast.message}</span>
    </div>
  );
};

export default Toast;
