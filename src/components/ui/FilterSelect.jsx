import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon.jsx";

/**
 * A filter dropdown you can type into. Shows "Label: value", opens a list with a search box,
 * and picks with a click, or with the arrow keys and Enter. Escape or a click outside closes it.
 * options: [[value, text]]. An empty value means "all".
 */
const FilterSelect = ({ label, value = "", options, onChange, allText = "all", className = "" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();

  const all = ["", allText];
  const q = query.trim().toLowerCase();
  // The reset row is listed as "All", so typing either "all" or its button word finds it.
  const matches = ([v, text]) => !q || text.toLowerCase().includes(q) || (v === "" && "all".includes(q));
  const shown = [all, ...options].filter(matches);
  // A filter whose value has left the data (a row was edited) must still read as active, not as "all".
  const selectedText = options.find(([v]) => v === value)?.[1] ?? (value === "" ? undefined : String(value));

  // Opening the list moves focus to its search box, so typing narrows it straight away.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Arrow keys move the highlight past the edge of the scrolling list, so bring it back into view.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, listId]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openList = () => {
    setQuery("");
    setActive(
      Math.max(
        0,
        [all, ...options].findIndex(([v]) => v === value),
      ),
    );
    setOpen(true);
  };

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.max(0, Math.min(i + 1, shown.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active][0]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      // Close and let Tab carry on from the button, so focus is not dropped when the list unmounts.
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by ${label}: ${selectedText || allText}`}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`w-full min-h-control px-3 py-2 inline-flex items-center justify-between gap-2 rounded-control bg-surface text-sm border border-line-strong ${value ? "text-ink font-semibold" : "text-ink"}`}
      >
        <span className="truncate">
          {label}: {selectedText || allText}
        </span>
        <Icon name="expand_more" size="sm" className="shrink-0 text-ink-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-full min-w-64 rounded-control border border-line bg-surface shadow-overlay">
          <div className="p-2 border-b border-line">
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              aria-label={`Search ${label}`}
              placeholder={`Search ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="w-full min-h-control-sm px-2 rounded-control bg-surface text-ink text-sm border border-line-strong placeholder:text-ink-muted"
            />
          </div>
          <div id={listId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto py-1">
            {shown.length === 0 && <div className="px-3 py-2 text-sm text-ink-muted">No match</div>}
            {shown.map(([v, text], i) => (
              <div
                key={v === "" ? "__all" : String(v)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={v === value}
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(v)}
                onKeyDown={onKeyDown}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${i === active ? "bg-subtle" : ""} ${v === value ? "font-semibold text-ink" : "text-ink"}`}
              >
                <span>{v === "" ? "All" : text}</span>
                {v === value && <Icon name="check" size="sm" className="text-accent" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;
