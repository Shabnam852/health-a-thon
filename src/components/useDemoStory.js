import { useNavigate } from "react-router-dom";
import { demoStorySteps, STORY_REFERRAL_ID } from "../config/demoStory.js";
import { useReferrals } from "../context/ReferralContext.jsx";

/** Moves through the guided demo, switching to the role each step needs. */
export const useDemoStory = () => {
  const navigate = useNavigate();
  const { storyStep, setStoryStep, setRole, setActiveReferralId } = useReferrals();

  const goToStep = (index) => {
    const step = demoStorySteps[index];
    setStoryStep(index);
    setRole(step.role);
    setActiveReferralId(STORY_REFERRAL_ID);
    navigate(step.path);
  };

  const endStory = () => {
    setStoryStep(null);
    navigate("/");
  };

  return { step: demoStorySteps[storyStep] ?? null, stepIndex: storyStep, goToStep, endStory };
};
