import { useEffect } from "react";
import { demoStorySteps, STORY_REFERRAL_ID } from "../config/demoStory.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { Icon } from "./ui/index.js";
import { useDemoStory } from "./useDemoStory.js";

const onFill = "rounded-control focus-visible:outline-highlight";

const StoryBar = () => {
  const { setActiveReferralId } = useReferrals();
  const { step, stepIndex, goToStep, endStory } = useDemoStory();
  const isActive = Boolean(step);

  // The story always follows its own patient, whoever was active before it started.
  useEffect(() => {
    if (isActive) setActiveReferralId(STORY_REFERRAL_ID);
  }, [isActive, setActiveReferralId]);

  if (!step) return null;

  const isLast = stepIndex === demoStorySteps.length - 1;

  return (
    <section
      aria-label="Guided demo"
      className="fixed inset-x-0 lg:left-sidebar bottom-above-tabs lg:bottom-0 z-40 bg-brand text-on-fill shadow-overlay"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1">
        <p className="flex-1 basis-full sm:basis-0 text-sm" aria-live="polite">
          <span className="font-bold text-highlight mr-2">
            {stepIndex + 1}/{demoStorySteps.length}
          </span>
          {step.text}
        </p>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
              className={`px-3 min-h-control-sm text-sm font-semibold hover:bg-on-fill/10 ${onFill}`}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? endStory() : goToStep(stepIndex + 1))}
            className={`px-4 min-h-control-sm bg-highlight text-on-highlight text-sm font-bold ${onFill}`}
          >
            {isLast ? "Finish" : "Next"}
          </button>
          <button
            type="button"
            onClick={endStory}
            aria-label="Exit demo"
            className={`w-control min-h-control-sm flex items-center justify-center hover:bg-on-fill/10 ${onFill}`}
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default StoryBar;
