import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";
import ChatPanel from "../components/assistant/ChatPanel.jsx";
import { usePatientCase } from "../components/assistant/usePatientCase.js";
import { EmptyState, Page, PageHeader } from "../components/ui/index.js";

// Matches the lg breakpoint, where the app shows its sidebar and the chat sits in the page.
const LARGE = "(min-width: 1024px)";
const useLarge = () => {
  const [large, setLarge] = useState(() => typeof matchMedia === "function" && matchMedia(LARGE).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const query = matchMedia(LARGE);
    const update = () => setLarge(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return large;
};

/**
 * The assistant as a page. On phones and tablets it is its own full screen: fixed to the visible
 * viewport (100dvh, which shrinks with the keyboard), over the app header and tabs, so only the
 * messages scroll and the message box stays above the keyboard. It leaves room for the demo
 * story bar. On a large screen it is a bordered panel in the page.
 */
const AssistantScreen = () => {
  const { referral, facilities } = usePatientCase();
  const titleId = useId();
  const navigate = useNavigate();
  const large = useLarge();

  // The page behind can't scroll while the chat covers it.
  useEffect(() => {
    if (large) return undefined;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [large]);

  // The page keeps its heading even with nothing to ask about.
  if (!referral)
    return (
      <Page width="md">
        <PageHeader title="Ask about your visit" />
        <EmptyState pictogram="chat">There is no case to ask about yet.</EmptyState>
      </Page>
    );

  // Back to wherever the family came from, or their help screen when the chat was opened directly.
  const close = () => (window.history.length > 1 ? navigate(-1) : navigate("/patient?view=support"));

  if (!large) {
    return (
      <section
        aria-labelledby={titleId}
        className="fixed inset-x-0 top-0 z-50 flex flex-col bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] h-[calc(100dvh-var(--story-bar-height,0px))]"
      >
        <ChatPanel referral={referral} facilities={facilities} variant="screen" titleId={titleId} onClose={close} />
      </section>
    );
  }

  return (
    <div className="px-8 py-6">
      <section
        aria-labelledby={titleId}
        className="flex flex-col h-[calc(100dvh-var(--size-header)-3rem-var(--story-bar-height,0px))] max-w-3xl mx-auto bg-surface overflow-hidden rounded-card border border-line"
      >
        <ChatPanel referral={referral} facilities={facilities} variant="screen" titleId={titleId} />
      </section>
    </div>
  );
};

export default AssistantScreen;
