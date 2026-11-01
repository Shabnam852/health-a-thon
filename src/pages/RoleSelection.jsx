import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext";

const roles = [
  {
    id: "coordinator",
    title: "Care Coordinator",
    subtitle: "Command Center & Resolution Desk",
    description: "Monitor unresolved referrals, prioritize acuity, dispatch transit vouchers, and manage real-time intake triage.",
    route: "/coordinator",
    icon: "grid_view",
    badge: "Primary Stitch View",
  },
  {
    id: "facility",
    title: "Healthcare Facility",
    subtitle: "Intake & Clinical Handoff",
    description: "Acknowledge incoming patient transfers, manage department beds, confirm patient arrival, and complete referral lifecycles.",
    route: "/facility",
    icon: "domain",
    badge: "Facility Operations",
  },
  {
    id: "patient",
    title: "Patient & Family",
    subtitle: "Continuous Care Journey",
    description: "View live arrival roadmap, transport vehicle ETA, assigned care navigator (Priya Raman, MSW), and digital check-in QR pass.",
    route: "/patient",
    icon: "family_restroom",
    badge: "Patient Experience",
  },
  {
    id: "navigator",
    title: "Care Navigator",
    subtitle: "Community Caseload & Outreach",
    description: "Conduct patient outreach, log call & home contact history, schedule interpreters, and resolve practical barriers to care.",
    route: "/navigator",
    icon: "support_agent",
    badge: "Community Navigator",
  },
];

const RoleSelection = () => {
  const navigate = useNavigate();
  const { setRole } = useReferrals();

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole.id);
    navigate(selectedRole.route);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Active Demo
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md">
              N
            </div>
            <h1 className="font-headline-xl text-3xl sm:text-4xl font-bold text-primary tracking-tight font-headline-xl">
              Navexa Health
            </h1>
          </div>

          <p className="font-title-sm text-base text-on-surface-variant font-medium">
            Maternal & Neonatal Healthcare Referral Coordination Platform
          </p>

          <p className="max-w-xl mx-auto font-body-md text-sm text-on-surface-variant/90 leading-relaxed">
            "A referral sent is not care received." Choose an operational persona to enter its role-specific workspace in the running application.
          </p>
        </div>

        {/* Persona Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((r) => (
            <div
              key={r.id}
              onClick={() => handleRoleSelect(r)}
              className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container hover:border-secondary hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group transform hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[26px]">
                      {r.icon}
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    {r.badge}
                  </span>
                </div>

                <div>
                  <h2 className="font-title-sm text-lg text-primary font-bold group-hover:text-secondary transition-colors">
                    {r.title}
                  </h2>
                  <p className="font-label-sm text-xs text-secondary font-semibold mt-0.5">
                    {r.subtitle}
                  </p>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed mt-2.5">
                    {r.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-container flex items-center justify-between text-secondary font-label-md text-sm font-semibold group-hover:translate-x-1 transition-transform">
                <span>Enter Workspace</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Screen Access Shortcuts */}
        <div className="mt-12 bg-surface-container-low rounded-2xl p-6 border border-surface-container/70 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="font-title-sm text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                layers
              </span>
              Direct Stitch Screen Navigation
            </span>
            <span className="font-label-sm text-xs text-on-surface-variant">
              All 10 Screens Implemented
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-label-md">
            <Link
              to="/coordinator"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>1. Care Coordinator Hub</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/referral/REF-2024-8821"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>2. Referral Case Details & Timeline</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/barriers"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>3. Barrier Resolution & Missed Arrivals</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/patient"
              onClick={() => setRole("patient")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>4. Patient & Family Journey View</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/create"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>5. Create Referral & Care Pathway</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/facility"
              onClick={() => setRole("facility")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>6. Facility Operations View</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/navigator"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>7. Care Navigator Workspace</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/transport"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>8. Transport Coordination</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/continuity"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>9. Continuity of Care (42-Day)</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>

            <Link
              to="/network"
              onClick={() => setRole("coordinator")}
              className="p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-medium flex items-center justify-between border border-surface-container/50 transition-colors"
            >
              <span>10. Regional Care Grid</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">launch</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-10">
        <p className="font-label-sm text-xs text-on-surface-variant">
          Navexa Health System • Google Stitch Design System Implementation • Demonstration Environment (Synthetic PHI)
        </p>
      </footer>
    </div>
  );
};

export default RoleSelection;