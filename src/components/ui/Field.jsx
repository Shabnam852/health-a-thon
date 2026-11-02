const CONTROL =
  "w-full min-w-0 min-h-control px-3 py-2 rounded-control bg-surface text-ink text-sm border border-line-strong placeholder:text-ink-muted";

export const Input = ({ className = "", ...props }) => <input {...props} className={`${CONTROL} ${className}`} />;

export const Select = ({ className = "", ...props }) => <select {...props} className={`${CONTROL} ${className}`} />;

export const Textarea = ({ className = "", rows = 3, ...props }) => (
  <textarea rows={rows} {...props} className={`${CONTROL} ${className}`} />
);

// Wraps its control in a <label>, so the two are linked with no ids to manage.
const Field = ({ label, required = false, hint, className = "", children }) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: the control arrives as children.
  <label className={`block min-w-0 ${className}`}>
    <span className="block text-sm font-semibold text-ink mb-1">
      {label}
      {required && " (required)"}
    </span>
    {children}
    {hint && <span className="block text-xs text-ink-muted mt-1">{hint}</span>}
  </label>
);

export default Field;
