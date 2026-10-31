import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const NetworkView = () => {
  const { facilities } = useReferrals();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFacilities = (facilities || []).filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.capabilities.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Network Header Banner */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 max-w-[1600px] mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-container via-primary to-primary-container p-6 md:p-8 shadow-sm text-on-primary">
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-4xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs uppercase tracking-wider font-bold">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  Active Network Directory
                </span>
                <span className="text-xs text-primary-fixed-dim">
                  Midwest Perinatal Regional Coordination
                </span>
              </div>

              <h1 className="font-headline-lg text-2xl sm:text-3xl text-on-primary tracking-tight font-bold">
                Regional Perinatal Facility Grid
              </h1>

              <p className="font-body-md text-xs sm:text-sm text-surface-container-high leading-relaxed">
                Directory of interconnected clinical centers, maternal & neonatal triage capabilities, bed capacities, and direct transfer contacts.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-xs sm:text-sm font-semibold hover:bg-on-secondary-container transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Initiate Transfer</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Network Health Stats */}
      <div className="px-4 sm:px-6 lg:px-8 pb-4 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Connected Centers
              </span>
              <span className="font-headline-xl text-xl font-bold text-primary">
                {facilities.length}
              </span>
              <span className="text-[11px] text-secondary flex items-center gap-0.5 mt-0.5 font-medium">
                <span className="material-symbols-outlined text-[13px]">check_circle</span> All Active
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">hub</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Available Level III Beds
              </span>
              <span className="font-headline-xl text-xl font-bold text-secondary">
                {facilities.reduce((acc, f) => acc + (f.bedsAvailable || 0), 0)}
              </span>
              <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5 mt-0.5">
                Across {facilities.length} Regional Centers
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">bed</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Average Transfer Corridor
              </span>
              <span className="font-headline-xl text-xl font-bold text-primary">8.8 mi</span>
              <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5 mt-0.5">
                Estimated 18m transit window
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">alt_route</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Transit Fleet
              </span>
              <span className="font-headline-xl text-xl font-bold text-secondary">3 Units</span>
              <span className="text-[11px] text-secondary flex items-center gap-0.5 mt-0.5 font-medium">
                Infant Car Seats Equipped
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">local_taxi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Search & List */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl border border-surface-container/60">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search facilities by name, capability, or level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            Showing {filteredFacilities.length} Facilities
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFacilities.map((fac) => (
            <div
              key={fac.id}
              className="p-5 rounded-xl bg-surface-container-lowest border border-surface-container/60 shadow-xs hover:border-secondary/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-title-sm text-base text-primary font-bold">{fac.name}</h3>
                    <p className="text-xs text-secondary font-medium">{fac.type}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-fixed text-on-secondary-fixed shrink-0">
                    {fac.bedsAvailable} Beds Open
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg">
                  <div>Location: <strong className="text-primary">{fac.location}</strong></div>
                  <div>Direct Phone: <strong className="text-primary">{fac.phone}</strong></div>
                  <div>Lead: <strong className="text-primary">{fac.directContact}</strong></div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3">
                  {fac.capabilities.map((cap, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-primary font-medium">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-surface-container/60 flex items-center justify-between text-xs">
                <Link
                  to="/facility"
                  className="text-secondary hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Open Operations View</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
                <Link
                  to="/create"
                  className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-medium"
                >
                  Refer Patient
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkView;
