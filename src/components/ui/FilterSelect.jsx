import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon.jsx";

// On a touch screen, focusing the search box opens the keyboard over the options, so leave it closed.
const isCoarse = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

// Room for the search row above the list.
const SEARCH_ROW = 64;
const LIST_MAX = 256;
const LIST_MIN = 132;

// Fits the list into the part of the screen still visible (a phone keyboard shrinks it), opening
// upward when there is more room above the button than below.
const placeList = (button) => {
  if (!button) return { up: false, max: LIST_MAX };
  const view = window.visualViewport;
  const top = view?.offsetTop ?? 0;
  const bottom = top + (view?.height ?? window.innerHeight);
  const rect = button.getBoundingClientRect();
  const below = bottom - rect.bottom - 8;
  const above = rect.top - top - 8;
  const up = below < LIST_MAX + SEARCH_ROW && above > below;
  const room = (up ? above : below) - SEARCH_ROW;
  return { up, max: Math.max(LIST_MIN, Math.min(LIST_MAX, room)) };
};

/**
 * A filter dropdown you can type into. Shows "Label: value", opens a list with a search box,
 * and picks with a click, or with the arrow keys and Enter. Escape or a click outside closes it.
 * options: [[value, text]]. An empty value means "all".
 */
const FilterSelect = ({ label, value = "", options, onChange, allText = "all", className = "" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState({ up: false, max: LIST_MAX });
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

  // Opening the list moves focus to its search box, so typing narrows it straight away. Not on touch
  // screens: the keyboard would cover the options. Their search box is one tap away.
  useEffect(() => {
    if (open && !isCoarse()) searchRef.current?.focus();
  }, [open]);

  // Keep the list inside the visible screen while it is open, as a keyboard opens or the page scrolls.
  useEffect(() => {
    if (!open) return undefined;
    const update = () => setPlace(placeList(buttonRef.current));
    update();
    const view = window.visualViewport;
    view?.addEventListener("resize", update);
    view?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      view?.removeEventListener("resize", update);
      view?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
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
    // Keys work from anywhere in the open dropdown, since touch screens leave focus on the button.
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        // Touch screens leave focus on the button, so the keys work from here while the list is open.
        onKeyDown={open ? onKeyDown : undefined}
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
        <div
          className={`absolute right-0 z-30 w-full min-w-64 rounded-control ${place.up ? "bottom-full mb-1" : "top-full mt-1"} border border-line bg-surface shadow-overlay`}
        >
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
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            className="overflow-y-auto py-1"
            style={{ maxHeight: place.max }}
          >
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
                className={`flex min-h-control items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${i === active ? "bg-subtle" : ""} ${v === value ? "font-semibold text-ink" : "text-ink"}`}
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
