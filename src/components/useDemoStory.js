import { useNavigate } from "react-router";
import { demoStorySteps, STORY_REFERRAL_ID } from "../config/demoStory.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";

/** Moves through the guided demo, signing in as the demo account each step needs. */
export const useDemoStory = () => {
  const navigate = useNavigate();
  const { storyStep, setStoryStep, setActiveReferralId } = useReferrals();
  const { signInAsDemoRole } = useAuth();

  const goToStep = (index) => {
    const step = demoStorySteps[index];
    setStoryStep(index);
    signInAsDemoRole(step.role);
    setActiveReferralId(STORY_REFERRAL_ID);
    navigate(step.path);
  };

  const endStory = () => {
    setStoryStep(null);
    navigate("/");
  };

  return { step: demoStorySteps[storyStep] ?? null, stepIndex: storyStep, goToStep, endStory };
};
