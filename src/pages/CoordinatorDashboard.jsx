import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    referrals,
    facilities,
    navigators,
    updateReferralStatus,
    setActiveReferralId,
    confirmArrival,
    recordClinicalOutcome,
  } = useReferrals();

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'maternal' | 'neonatal' | 'transport' | 'overdue'
  const [filterQuery, setFilterQuery] = useState("");
  
  const viewFromUrl = searchParams.get("view");
  const [activeViewMode, setActiveViewModeState] = useState(() => {
    if (viewFromUrl && ["queue", "network", "staff"].includes(viewFromUrl)) {
      return viewFromUrl;
    }
    return "queue";
  });

  const setActiveViewMode = (mode) => {
    setActiveViewModeState(mode);
    setSearchParams({ view: mode });
  };

  useEffect(() => {
    if (viewFromUrl && ["queue", "network", "staff"].includes(viewFromUrl)) {
      setActiveViewModeState(viewFromUrl);
    }
  }, [viewFromUrl]);

  const [selectedCaseModal, setSelectedCaseModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic KPI calculations strictly from domain data
  const kpis = useMemo(() => {
    const total = referrals.length;
    const urgent = referrals.filter((r) => r.priority === "Urgent" || r.priority === "STAT").length;
    const unconfirmedArrival = referrals.filter(
      (r) => r.status === "SENT" || r.status === "ACKNOWLEDGED"
    ).length;
    const withBarriers = referrals.filter(
      (r) => r.status === "FOLLOW_UP_REQUIRED" || (r.barriers && r.barriers.some((b) => b.status !== "RESOLVED"))
    ).length;
    const followUps = referrals.filter((r) => r.status === "ARRIVAL_CONFIRMED").length;
    const completed = referrals.filter((r) => r.status === "COMPLETED").length;

    const maternal = referrals.filter((r) => r.referralType === "Maternal").length;
    const neonatal = referrals.filter((r) => r.referralType === "Child").length;

    return {
      total,
      urgent,
      unconfirmedArrival,
      withBarriers,
      followUps,
      completed,
      maternal,
      neonatal,
    };
  }, [referrals]);

  // Filtered referrals list
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      // Category filter
      if (activeTab === "maternal" && r.referralType !== "Maternal") return false;
      if (activeTab === "neonatal" && r.referralType !== "Child") return false;
      if (activeTab === "transport" && !(r.status === "FOLLOW_UP_REQUIRED" || r.transit || r.transitBarrier)) return false;
      if (activeTab === "overdue" && !(r.status === "SENT" || r.status === "FOLLOW_UP_REQUIRED")) return false;

      // Search query
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const matchesName = r.patientName.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesCondition = (r.condition || "").toLowerCase().includes(q);
        const matchesFacility =
          r.fromFacility.toLowerCase().includes(q) ||
          r.toFacility.toLowerCase().includes(q);
        return matchesName || matchesId || matchesCondition || matchesFacility;
      }

      return true;
    });
  }, [referrals, activeTab, filterQuery]);

  const handleRowClick = (ref) => {
    setActiveReferralId(ref.id);
    navigate(`/referral/${ref.id}`);
  };

  const handleVerifyArrival = (e, ref) => {
    e.stopPropagation();
    confirmArrival(ref.id, {
      department: ref.toFacility,
      room: "Triage Intake Room 01",
      verifiedBy: "Sarah Jenkins, RN (Coordinator)",
      notes: "Physical arrival verified by care coordinator.",
    });
    showToast(`Arrival confirmed for ${ref.patientName}!`);
  };

  const handleRecordOutcome = (e, ref) => {
    e.stopPropagation();
    recordClinicalOutcome(ref.id, {
      clinicianName: "Dr. Rachel Sterling, MD",
      referralType: ref.referralType,
      maternalStatus: "STABLE",
      disposition: "DISCHARGED_HOME",
      clinicalNotes: "Patient evaluated and stabilized. Continuing 42-day care plan activated.",
    });
    showToast(`Care delivered for ${ref.patientName}. 42-day postpartum plan initiated.`);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-slide-up">
          <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
            check_circle
          </span>
          <span className="font-body-sm text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Command Center Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-[24px]">hub</span>
            </span>
            <div>
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                Care Coordinator Command Center
              </h1>
              <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                St. Jude Regional Perinatal Network • Real-time Triage & Care Continuity Node
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start xl:self-auto">
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-low flex items-center gap-2 border border-surface-container">
            <span className="material-symbols-outlined text-secondary text-[16px]">sync</span>
            <span className="font-data-tabular text-xs text-primary font-medium">Domain Store Connected</span>
          </div>

          <button
            onClick={() =>
              setSelectedCaseModal({
                title: "Shift Handover Log",
                description: "St. Jude Perinatal Regional Coordination Shift Audit",
                content: `Active Cases in Flight: ${kpis.total} | Immediate Acuity Escalations: ${kpis.urgent} | Handover Closures Verified Today: ${kpis.completed}. All clinical guardrails satisfied under SOP-VER-24.3.`,
              })
            }
            className="px-3.5 py-1.5 rounded-lg bg-primary text-white font-label-md text-xs hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[15px]">print</span>
            <span>Shift Handover Log</span>
          </button>
        </div>
      </div>

      {/* Clinical Safety Guardrail Banner */}
      <div className="bg-primary text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl shrink-0">
            <span className="material-symbols-outlined text-secondary-fixed text-[24px]">health_and_safety</span>
          </div>
          <div className="space-y-0.5">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-secondary-fixed font-bold">
              Mandatory Clinical Guardrail
            </span>
            <p className="font-body-sm text-xs sm:text-sm text-white/90 leading-relaxed">
              <strong className="font-semibold text-white">Clinical Safety Principle:</strong> A referral dispatch is{" "}
              <span className="underline decoration-secondary decoration-2 underline-offset-2">
                not confirmation of clinical care
              </span>
              . Coordinators must verify physical arrival, resolve socioeconomic barriers, and sustain 42-day continuity.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-label-sm text-secondary-fixed bg-primary-container px-3 py-1 rounded-full border border-secondary/30 shrink-0">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          Protocol Active
        </span>
      </div>

      {/* KPI Mission Ribbon: 6 Analytical Pods */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total In Flight */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant font-medium">In-Flight Journeys</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">alt_route</span>
          </div>
          <div className="mt-2">
            <div className="font-headline-lg text-2xl text-primary font-bold">{kpis.total}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-on-surface-variant">
              <span className="font-medium text-secondary">{kpis.maternal} Mat</span>
              <span>•</span>
              <span className="font-medium text-primary">{kpis.neonatal} Neo</span>
            </div>
          </div>
        </div>

        {/* Urgent Triage */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs text-error font-bold">Urgent Acuity</span>
            <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
          </div>
          <div className="mt-2">
            <div className="font-headline-lg text-2xl text-error font-bold">{String(kpis.urgent).padStart(2, "0")}</div>
            <div className="text-[11px] text-error font-medium mt-1">Priority queue</div>
          </div>
        </div>

        {/* Unconfirmed Arrival */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant font-medium">Unconfirmed Arrival</span>
            <span className="material-symbols-outlined text-[16px] text-amber-600">location_searching</span>
          </div>
          <div className="mt-2">
            <div className="font-headline-lg text-2xl text-amber-700 font-bold">{String(kpis.unconfirmedArrival).padStart(2, "0")}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Pending physical check-in</div>
          </div>
        </div>

        {/* Active Barriers */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant font-medium">Active Barriers</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">warning_amber</span>
          </div>
          <div className="mt-2">
            <div className="font-headline-lg text-2xl text-primary font-bold">{String(kpis.withBarriers).padStart(2, "0")}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Transit • Childcare • Lang</div>
          </div>
        </div>

        {/* In Evaluation */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant font-medium">In Assessment</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">stethoscope</span>
          </div>
          <div className="mt-2">
            <div className="font-headline-lg text-2xl text-primary font-bold">{String(kpis.followUps).padStart(2, "0")}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">At hospital triage</div>
          </div>
        </div>

        {/* Care Received */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-xs text-secondary font-bold">Care Received</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">task_alt</span>
          </div>
          <div className="mt-2">
            <div className="font-headline-lg text-2xl text-secondary font-bold">{String(kpis.completed).padStart(2, "0")}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Handovers completed</div>
          </div>
        </div>
      </div>

      {/* Main Split: Left Column Work Queue / Right Triage Insight */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
          {/* Filter & View Switcher Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs space-y-3 border border-surface-container/60">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-surface-container"
                  placeholder="Filter patient MRN, condition, or receiving clinic..."
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                />
              </div>

              {/* View Mode Switcher */}
              <div className="inline-flex p-1 bg-surface-container-low rounded-lg self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setActiveViewMode("queue")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                    activeViewMode === "queue"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">table_rows</span>
                  <span>Priority Queue</span>
                </button>
                <button
                  onClick={() => setActiveViewMode("network")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                    activeViewMode === "network"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">map</span>
                  <span>Regional Grid</span>
                </button>
                <button
                  onClick={() => setActiveViewMode("staff")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                    activeViewMode === "staff"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">group</span>
                  <span>Staff Load</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Categories */}
            {activeViewMode === "queue" && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-container/60">
                <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider mr-1">
                  Filter:
                </span>
                {[
                  { id: "all", label: `All Active (${referrals.length})` },
                  { id: "maternal", label: "High-Risk Maternal" },
                  { id: "neonatal", label: "Critical Neonatal" },
                  { id: "transport", label: "Transport Gap" },
                  { id: "overdue", label: "Overdue Arrival" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      activeTab === tab.id
                        ? "bg-primary text-white font-semibold shadow-xs"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* VIEW MODE 1: PRIORITY WORK QUEUE TABLE */}
          {activeViewMode === "queue" && (
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container bg-surface-container-low/60 text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Patient / Identity</th>
                      <th className="py-3 px-4">Acuity & Condition</th>
                      <th className="py-3 px-4">Facility Corridor</th>
                      <th className="py-3 px-4">Milestone</th>
                      <th className="py-3 px-4">Navigator</th>
                      <th className="py-3 px-4 text-right">Coordination Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container font-body-sm text-xs">
                    {filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                          No referral cases found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((r) => {
                        const isUrgent = r.priority === "Urgent" || r.priority === "STAT";
                        const isArrived = r.status === "ARRIVAL_CONFIRMED";
                        const isCompleted = r.status === "COMPLETED";

                        return (
                          <tr
                            key={r.id}
                            onClick={() => handleRowClick(r)}
                            className="hover:bg-surface-container-low/50 cursor-pointer transition-colors group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {r.patientName.slice(0, 2)}
                                </div>
                                <div>
                                  <div className="font-title-sm text-xs text-primary font-bold group-hover:text-secondary transition-colors">
                                    {r.patientName}
                                  </div>
                                  <div className="text-[10px] text-on-surface-variant">
                                    {r.id} • {r.age || "Perinatal"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                                    isUrgent ? "bg-error-container text-on-error-container" : "bg-surface-container text-primary"
                                  }`}
                                >
                                  {r.priority}
                                </span>
                                <div className="text-[11px] text-on-surface font-medium truncate max-w-[180px]" title={r.condition || r.reason}>
                                  {r.condition || r.reason}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="text-[11px]">
                                <div className="text-on-surface font-medium truncate max-w-[130px]">{r.fromFacility}</div>
                                <div className="text-secondary font-semibold flex items-center gap-0.5">
                                  <span>→</span> {r.toFacility}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  isCompleted
                                    ? "bg-secondary-fixed text-on-secondary-fixed"
                                    : isArrived
                                    ? "bg-secondary/15 text-secondary font-semibold"
                                    : "bg-surface-container text-primary"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="text-[11px] font-medium text-primary">
                                {r.navigator?.name || "Maya Lin, MSW"}
                              </div>
                              <div className="text-[10px] text-on-surface-variant">
                                {r.caregiverContact || "On file"}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1.5">
                                {!isArrived && !isCompleted ? (
                                  <button
                                    onClick={(e) => handleVerifyArrival(e, r)}
                                    className="px-2.5 py-1 rounded bg-secondary text-white font-label-md text-[11px] font-semibold hover:bg-on-secondary-container transition-colors shadow-xs"
                                  >
                                    Verify Arrival
                                  </button>
                                ) : isArrived ? (
                                  <button
                                    onClick={(e) => handleRecordOutcome(e, r)}
                                    className="px-2.5 py-1 rounded bg-primary text-white font-label-md text-[11px] font-semibold hover:bg-primary-container transition-colors shadow-xs"
                                  >
                                    Record Outcome
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-secondary font-bold">Completed</span>
                                )}

                                <Link
                                  to={`/referral/${r.id}`}
                                  className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container"
                                  title="Open Chart"
                                >
                                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: REGIONAL NETWORK BED GRID */}
          {activeViewMode === "network" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {facilities.map((fac) => (
                <div key={fac.id} className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-title-sm text-sm font-bold text-primary">{fac.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed">
                      {fac.bedsAvailable} Beds Free
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">{fac.type} • {fac.location}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {fac.capabilities.slice(0, 3).map((cap, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-surface-container-low text-primary">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW MODE 3: NAVIGATOR STAFF LOAD */}
          {activeViewMode === "staff" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {navigators.map((nav) => {
                const assigned = referrals.filter((r) => r.navigator?.name === nav.name);

                return (
                  <div key={nav.id} className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full object-cover" src={nav.avatar} alt={nav.name} />
                      <div>
                        <h4 className="font-title-sm text-sm font-bold text-primary">{nav.name}</h4>
                        <p className="text-[11px] text-on-surface-variant">{nav.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-container">
                      <span>Active Caseload:</span>
                      <strong className="text-secondary font-bold">{assigned.length} Active Dyads</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Triage Drawer */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
          {/* Active Overdue Alert Card */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs text-error font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                Urgent Action
              </span>
              <span className="text-[10px] text-on-surface-variant font-data-tabular">Active</span>
            </div>

            <div>
              <h3 className="font-title-sm text-sm text-primary font-bold">Baby Boy Chen (3 Days Old)</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                TSB 21.4 mg/dL exceeds AAP phototherapy curve. Transit barrier flagged (lacks compliant infant car seat).
              </p>
            </div>

            <div className="pt-2 border-t border-surface-container space-y-2">
              <Link
                to="/transport"
                className="w-full py-2 px-3 rounded-lg bg-error text-white font-label-md text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 font-semibold text-center"
              >
                <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                <span>Dispatch MediVan with Car Seat</span>
              </Link>
              <button
                onClick={() => showToast("On-call neonatologist Dr. Thorne paged at St. Jude NICU.")}
                className="w-full py-1.5 px-3 rounded-lg bg-surface-container text-primary font-label-md text-xs hover:bg-surface-container-high transition-colors"
              >
                Page Accepting Attending
              </button>
            </div>
          </div>

          {/* Quick Coordination Tools */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-2">
            <span className="text-[10px] font-label-sm font-bold text-on-surface-variant uppercase tracking-wider block">
              Quick Actions
            </span>
            <Link
              to="/transport"
              className="w-full text-left p-2 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-xs text-primary font-medium"
            >
              <span>Transport Coordination Desk</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">arrow_forward</span>
            </Link>
            <Link
              to="/continuity"
              className="w-full text-left p-2 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-xs text-primary font-medium"
            >
              <span>42-Day Continuity Hub</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">arrow_forward</span>
            </Link>
            <Link
              to="/create"
              className="w-full text-left p-2 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-xs text-primary font-medium"
            >
              <span>Initiate Care Pathway</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">add_circle</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Handover Log Modal */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold">{selectedCaseModal.title}</h3>
            <p className="text-xs text-on-surface leading-relaxed">{selectedCaseModal.content}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
              >
                Close & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorDashboard;
