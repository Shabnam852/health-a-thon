import { useId } from "react";
import ChatPanel from "../components/assistant/ChatPanel.jsx";
import { usePatientCase } from "../components/assistant/usePatientCase.js";
import { EmptyState } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";

// The assistant as a page: edge to edge on phones, a bordered panel on larger screens.
const AssistantScreen = () => {
  const { referral, facilities } = usePatientCase();
  const titleId = useId();
  // The demo story bar sits over the bottom of the page: leave room so the message box stays visible.
  const { storyStep } = useReferrals();
  const height =
    storyStep !== null
      ? "h-[calc(100dvh-var(--size-header)-14rem)] lg:h-[calc(100dvh-var(--size-header)-10rem)]"
      : "h-[calc(100dvh-var(--size-header)-5rem)] sm:h-[calc(100dvh-var(--size-header)-8rem)] lg:h-[calc(100dvh-var(--size-header)-3rem)]";

  if (!referral) return <EmptyState pictogram="chat">There is no case to ask about yet.</EmptyState>;

  return (
    <div className="px-0 sm:px-6 lg:px-8 sm:py-6">
      <section
        aria-labelledby={titleId}
        className={`flex flex-col ${height} max-w-3xl mx-auto bg-surface overflow-hidden sm:rounded-card sm:border sm:border-line`}
      >
        <ChatPanel referral={referral} facilities={facilities} variant="screen" titleId={titleId} />
      </section>
    </div>
  );
};

export default AssistantScreen;
