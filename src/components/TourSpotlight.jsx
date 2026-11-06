import { useEffect, useRef, useState } from "react";

// How far the ring sits outside the element, in px.
const GAP = 6;
// The label sits across the ring's top edge, so it covers as little of the page as it can.
const LABEL_HALF = 11;
// Below the fixed top header.
const TOP_CLEAR = 80;

// The guided demo bar covers the bottom of the screen; it publishes its height (StoryBar).
const bottomClear = () => {
  const bar = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--story-bar-height"));
  return (Number.isFinite(bar) ? bar : 160) + 96;
};

const findTarget = (target) => {
  if (!target) return null;
  try {
    return typeof target === "function" ? target() : document.querySelector(target);
  } catch {
    return null;
  }
};

const sameRect = (a, b) =>
  a === b || (a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/**
 * Where the step's target is on screen, followed while the page scrolls, resizes or re-renders.
 * Scrolls it into view once per step, at once (no smooth scroll). Null while it isn't on the page.
 */
const useTargetRect = (target, stepKey) => {
  const [rect, setRect] = useState(null);
  const scrolledFor = useRef(null);

  useEffect(() => {
    let frame = 0;
    let last = null;
    const track = () => {
      const el = findTarget(target);
      const box = el?.getBoundingClientRect();
      const next =
        box && box.width > 0 && box.height > 0
          ? {
              top: Math.round(box.top),
              left: Math.round(box.left),
              width: Math.round(box.width),
              height: Math.round(box.height),
            }
          : null;
      if (el && next && scrolledFor.current !== stepKey) {
        scrolledFor.current = stepKey;
        const offScreen = box.top < TOP_CLEAR || box.bottom > window.innerHeight - bottomClear();
        if (offScreen) el.scrollIntoView({ block: "center", behavior: "instant" });
      }
      if (!sameRect(next, last)) {
        last = next;
        setRect(next);
      }
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [target, stepKey]);

  return rect;
};

/**
 * Outlines the one thing a demo step is about, with a short label: "Do this" when the step has a
 * task, "Look here" when it doesn't. Static: it moves only to stay on its element. It never takes
 * clicks, so the page underneath works as usual.
 */
const TourSpotlight = ({ target, stepKey, hasTask, done }) => {
  const rect = useTargetRect(target, stepKey);
  if (!rect || done) return null;

  const ringTop = rect.top - GAP;
  // Under the top header, the label moves to the ring's bottom edge.
  const labelTop =
    ringTop - LABEL_HALF < TOP_CLEAR - 16 ? rect.top + rect.height + GAP - LABEL_HALF : ringTop - LABEL_HALF;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
      <div
        className="absolute rounded-card border-[3px] border-accent"
        style={{
          top: rect.top - GAP,
          left: rect.left - GAP,
          width: rect.width + GAP * 2,
          height: rect.height + GAP * 2,
        }}
      />
      <span
        className="absolute rounded-pill bg-accent text-on-fill text-xs font-semibold px-2.5 py-1 shadow-overlay whitespace-nowrap"
        style={{
          left: Math.max(8, rect.left + 10),
          top: labelTop,
        }}
      >
        {hasTask ? "Do this" : "Look here"}
      </span>
    </div>
  );
};

export default TourSpotlight;
