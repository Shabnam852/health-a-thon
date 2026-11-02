import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { Badge, Button, Card, Icon, Tile } from "../components/ui/index.js";
import { useDemoStory } from "../components/useDemoStory.js";
import { STORY_REFERRAL_ID } from "../config/demoStory.js";
import { RoleId } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext";
import {
  getFamilyUpdate,
  getJourneyHeadline,
  getLandingStats,
  getReferralJourney,
  JourneyState,
} from "../domain/landing.js";

const careTeam = [
  {
    id: RoleId.COORDINATOR,
    title: "Coordinator",
    route: "/coordinator",
    icon: "grid_view",
    stat: "urgentNotArrived",
    caption: "urgent, not yet arrived",
  },
  {
    id: RoleId.FACILITY,
    title: "Hospital",
    route: "/facility",
    icon: "domain",
    stat: "expectedArrivals",
    caption: "expected to arrive",
  },
];

const stepStyles = {
  [JourneyState.DONE]: { dot: "bg-accent text-on-fill", icon: "check", label: "text-ink", status: "Done" },
  [JourneyState.ACTIVE]: { dot: "bg-brand text-on-fill", icon: "more_horiz", label: "text-ink", status: "In progress" },
  [JourneyState.AT_RISK]: {
    dot: "bg-danger text-on-fill",
    icon: "priority_high",
    label: "text-danger",
    status: "At risk",
  },
  [JourneyState.UPCOMING]: { dot: "bg-subtle", icon: "", label: "text-ink-muted", status: "Not yet" },
};

const JourneyStrip = ({ referral }) => (
  <Card as="section" aria-label={`Live case: ${referral.patientName}`}>
    <p className="text-xs font-semibold text-ink-muted">{referral.patientName}</p>
    <h2 className="font-display text-lg sm:text-xl font-semibold text-ink mt-1">{getJourneyHeadline(referral)}</h2>

    <ol className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-0">
      {getReferralJourney(referral).map((step, index) => {
        const style = stepStyles[step.state];
        return (
          <li key={step.id} className="relative flex sm:flex-col items-center gap-3 sm:gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`hidden sm:block absolute top-4 right-1/2 w-full h-0.5 ${
                  step.state === JourneyState.UPCOMING ? "bg-subtle" : "bg-accent"
                }`}
              />
            )}
            <span
              className={`relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${style.dot}`}
            >
              <Icon name={style.icon} />
            </span>
            <span className={`text-sm font-semibold ${style.label}`}>
              {step.label}
              <span className="sr-only"> ({style.status})</span>
            </span>
          </li>
        );
      })}
    </ol>
  </Card>
);

const RoleSelection = () => {
  const navigate = useNavigate();
  const { referrals, facilities, setRole, setActiveReferralId, setStoryStep } = useReferrals();
  const { goToStep } = useDemoStory();

  const storyReferral = referrals.find((r) => r.id === STORY_REFERRAL_ID);
  const intakeFacility = facilities.find((f) => f.id === "FAC-SANJEEVANI") || facilities[0];
  const stats = getLandingStats(referrals, intakeFacility?.name);

  const enter = (role, route, referralId) => {
    setStoryStep(null);
    setRole(role);
    if (referralId) setActiveReferralId(referralId);
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-control bg-brand flex items-center justify-center text-on-fill font-bold text-sm"
            >
              N
            </div>
            <span className="font-bold text-ink">Navexa Health</span>
          </div>
          <ThemeToggle iconOnly />
        </div>

        <header className="space-y-4">
          <Badge tone="highlight">Demo: synthetic data</Badge>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-ink tracking-tight leading-tight">
            A referral sent is not care received.
          </h1>
          <p className="text-base sm:text-lg text-ink-muted">
            Navexa tracks every mother and newborn until care actually happens.
          </p>
          <Button variant="primary" onClick={() => goToStep(0)}>
            <Icon name="play_arrow" />
            Watch the demo
          </Button>
        </header>

        {storyReferral && <JourneyStrip referral={storyReferral} />}

        <section aria-label="Choose a role" className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-ink-muted mb-2">Care team</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {careTeam.map((r) => (
                <Tile key={r.id} onClick={() => enter(r.id, r.route)}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name={r.icon} />
                    {r.title}
                  </span>
                  <span className="block font-display text-3xl font-semibold tabular-nums mt-3">{stats[r.stat]}</span>
                  <span className="block text-sm text-ink-muted">{r.caption}</span>
                </Tile>
              ))}
            </div>
          </div>

          {storyReferral && (
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-ink-muted mb-2">Patients</h2>
              <Tile
                className="flex-1 flex flex-col"
                onClick={() => enter(RoleId.PATIENT, "/patient", storyReferral.id)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon name="family_restroom" />
                  Family
                </span>
                <span className="block text-sm text-ink-muted mt-3">{getFamilyUpdate(storyReferral)}</span>
              </Tile>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default RoleSelection;
