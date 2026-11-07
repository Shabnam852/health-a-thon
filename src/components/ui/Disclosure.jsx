import Icon from "./Icon.jsx";

/**
 * A section that opens and closes. Built on native <details>, so it works with the keyboard,
 * screen readers and find-in-page, and needs no state.
 *
 * The whole header row is the button (at least 48px tall), with a written "Show" or "Hide" and a
 * chevron, so it is obvious it can be opened and easy to hit. Nothing animates.
 *
 * `variant="card"` is a bordered card of its own; `"inline"` sits inside another card or row.
 */
const Disclosure = ({ title, hint, icon, variant = "card", defaultOpen, className = "", children }) => {
  const isCard = variant === "card";
  return (
    <details
      open={defaultOpen}
      className={`group overflow-hidden ${isCard ? "bg-surface border border-line rounded-card" : "rounded-control border border-line"} ${className}`}
    >
      <summary
        className={`flex min-h-12 cursor-pointer list-none items-center gap-3 hover:bg-muted focus-visible:outline-offset-[-4px] [&::-webkit-details-marker]:hidden ${
          isCard ? "px-5 py-4 sm:px-6" : "px-3 py-2"
        }`}
      >
        {icon && <Icon name={icon} className="text-ink-muted" />}
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold text-ink ${isCard ? "text-lg" : "text-sm"}`}>{title}</span>
          {hint && <span className="block text-sm text-ink-muted">{hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-pill border border-line-strong px-3 py-1 text-sm font-semibold text-ink">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
          <Icon name="expand_more" size="sm" className="group-open:hidden" />
          <Icon name="expand_less" size="sm" className="hidden group-open:inline" />
        </span>
      </summary>
      <div className={isCard ? "border-t border-line px-5 py-4 sm:px-6" : "px-3 pb-3 pt-1"}>{children}</div>
    </details>
  );
};

export default Disclosure;
