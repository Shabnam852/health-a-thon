import { useEffect, useRef, useState } from "react";
import { demoStorySteps, STORY_REFERRAL_ID } from "../config/demoStory.js";
import { roleDefinitions } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import TourSpotlight from "./TourSpotlight.jsx";
import { Icon } from "./ui/index.js";
import { useDemoStory } from "./useDemoStory.js";

const onFill = "rounded-control focus-visible:outline-highlight";

// The bar's frame. It publishes its height (it grows when its text wraps) so a toast can sit above it
// instead of on its buttons.
const BarFrame = ({ children }) => {
  const barRef = useRef(null);
  useEffect(() => {
    const bar = barRef.current;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--story-bar-height", `${bar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--story-bar-height");
    };
  }, []);

  return (
    // The outer frame only positions; the card inside floats clear of the page edges, like a coach mark.
    <section
      ref={barRef}
      aria-label="Guided demo"
      className="fixed inset-x-0 lg:left-sidebar bottom-above-tabs lg:bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-card bg-brand text-on-fill shadow-overlay overflow-hidden">
        {children}
      </div>
    </section>
  );
};

// One segment per step. Each is a button, so a presenter can jump back to any part of the story.
const Progress = ({ stepIndex, goToStep }) => (
  <ol className="hidden sm:flex items-center gap-1" aria-label="Demo steps">
    {demoStorySteps.map((s, i) => (
      <li key={s.path + s.title} className="flex">
        <button
          type="button"
          onClick={() => goToStep(i)}
          aria-label={`Step ${i + 1}: ${s.title}`}
          aria-current={i === stepIndex ? "step" : undefined}
          className={`group py-2 ${onFill}`}
        >
          <span
            className={`block h-1.5 rounded-full ${
              i === stepIndex
                ? "w-8 bg-highlight"
                : i < stepIndex
                  ? "w-4 bg-highlight/60 group-hover:bg-highlight"
                  : "w-4 bg-on-fill/25 group-hover:bg-on-fill/50"
            }`}
          />
        </button>
      </li>
    ))}
  </ol>
);

const ExitButton = ({ onExit, className = "" }) => (
  <button
    type="button"
    onClick={onExit}
    aria-label="Exit demo"
    title="Exit demo"
    className={`w-control min-h-control-sm items-center justify-center rounded-pill text-on-fill-muted hover:text-on-fill hover:bg-on-fill/10 ${onFill} ${className}`}
  >
    <Icon name="close" />
  </button>
);

/**
 * Whether the step's task has happened: read from the shared data on every render, or seen on the
 * page (a dialog that opened), which is remembered for the step once seen.
 */
const useStepDone = (step, stepIndex) => {
  const { referrals, linkRequests, getReferralById } = useReferrals();
  const [seenOnPage, setSeenOnPage] = useState({});
  let fromData = false;
  try {
    fromData = Boolean(
      step?.done?.({ data: { referrals, linkRequests }, referral: getReferralById(STORY_REFERRAL_ID) }),
    );
  } catch {
    fromData = false;
  }
  const checkPage = step?.doneOnPage;
  const seen = Boolean(seenOnPage[stepIndex]);

  useEffect(() => {
    if (!checkPage || seen) return undefined;
    const timer = setInterval(() => {
      let found = false;
      try {
        found = Boolean(checkPage(document));
      } catch {
        found = false;
      }
      if (found) setSeenOnPage((current) => ({ ...current, [stepIndex]: true }));
    }, 300);
    return () => clearInterval(timer);
  }, [checkPage, seen, stepIndex]);

  return fromData || seen;
};

// The one thing to do on this step, ticked off once it's done.
const TaskLine = ({ task, done }) => (
  <p className="mt-2 flex items-start gap-2 text-sm font-semibold">
    <Icon
      name={done ? "check_circle" : "radio_button_unchecked"}
      filled={done}
      size="sm"
      className={`mt-px shrink-0 ${done ? "text-highlight" : "text-on-fill-muted"}`}
    />
    <span>{done ? "Done. Press Next to carry on." : `Do this: ${task}`}</span>
  </p>
);

const StoryBar = () => {
  const { setActiveReferralId } = useReferrals();
  const { step, stepIndex, goToStep, endStory } = useDemoStory();
  const isActive = Boolean(step);
  const done = useStepDone(step, stepIndex);

  // The story always follows its own patient, whoever was active before it started.
  useEffect(() => {
    if (isActive) setActiveReferralId(STORY_REFERRAL_ID);
  }, [isActive, setActiveReferralId]);

  if (!step) return null;

  const isLast = stepIndex === demoStorySteps.length - 1;
  const role = roleDefinitions[step.role];

  return (
    <>
      <TourSpotlight target={step.target} stepKey={stepIndex} hasTask={Boolean(step.task)} done={done} />
      <BarFrame>
        {/* Phones: a slim progress line instead of the tappable track, which needs room for 44px targets.
          "Step n of 5" above already says the same thing to screen readers. */}
        <div aria-hidden="true" className="sm:hidden h-1 bg-on-fill/10">
          <div
            className="h-full bg-highlight"
            style={{ width: `${((stepIndex + 1) / demoStorySteps.length) * 100}%` }}
          />
        </div>
        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              aria-hidden="true"
              className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-control bg-on-fill/10 text-on-fill"
            >
              <Icon name={role.icon} size="sm" />
            </span>
            <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
              <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-on-fill-muted">
                <span className="text-highlight tabular-nums">
                  Step {stepIndex + 1} of {demoStorySteps.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>Viewing as {role.shortTitle}</span>
              </p>
              <p className="font-display text-sm sm:text-base font-bold leading-snug sm:leading-6">{step.title}</p>
              <p className="text-sm text-on-fill-muted leading-snug">{step.text}</p>
              {step.task && <TaskLine task={step.task} done={done} />}
            </div>
            {/* On a phone the controls row is full, so Exit sits in the corner. */}
            <ExitButton onExit={endStory} className="flex sm:hidden -mt-2 -mr-2 shrink-0" />
          </div>

          <div className="flex items-center justify-end gap-3 shrink-0">
            <Progress stepIndex={stepIndex} goToStep={goToStep} />
            <div className="flex items-center gap-1">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex - 1)}
                  className={`pl-2 pr-3 min-h-control-sm flex items-center gap-0.5 rounded-pill text-sm font-semibold hover:bg-on-fill/10 ${onFill}`}
                >
                  <Icon name="chevron_left" size="sm" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? endStory() : goToStep(stepIndex + 1))}
                className={`pl-5 pr-3 min-h-control-sm flex items-center gap-1 rounded-pill bg-highlight text-on-highlight text-sm font-bold hover:bg-on-fill ${onFill}`}
              >
                {isLast ? "Finish" : "Next"}
                <Icon name={isLast ? "check" : "chevron_right"} size="sm" />
              </button>
              <ExitButton onExit={endStory} className="hidden sm:flex" />
            </div>
          </div>
        </div>
      </BarFrame>
    </>
  );
};

export default StoryBar;
