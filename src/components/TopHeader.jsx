import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getRoleDefinition } from "../config/navigationConfig.js";

const TopHeader = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const {
    referrals,
    notifications,
    markNotificationRead,
    dismissNotification,
    setActiveReferralId,
    role,
    resetDemoData,
  } = useReferrals();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const currentRole = role || "coordinator";
  const roleDef = getRoleDefinition(currentRole);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredReferrals = searchTerm.trim()
    ? referrals.filter(
        (r) =>
          r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.mrn && r.mrn.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.indication && r.indication.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.condition && r.condition.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const handleSelectPatient = (ref) => {
    setActiveReferralId(ref.id);
    setSearchTerm("");
    setIsSearching(false);
    navigate(`/referral/${ref.id}`);
  };

  const handleConfirmReset = () => {
    resetDemoData();
    setShowResetModal(false);
    navigate("/");
  };

  return (
    <>
      <header className="fixed top-0 left-0 lg:left-[270px] right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-surface-container/60">
        {/* Left: Mobile Menu Toggle & Search Bar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
          {/* Mobile Drawer Button */}
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-2 rounded-lg text-primary hover:bg-surface-container transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          {/* Search Input (Hidden on tiny screens if patient, or adaptable) */}
          <div className="relative w-full flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-surface-container-low font-body-sm text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all border border-surface-container/40"
              placeholder={
                currentRole === "patient"
                  ? "Search health resources or instructions..."
                  : "Search patient MRN, name, or indication..."
              }
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isSearching && filteredReferrals.length > 0 && (
            <div className="absolute top-14 left-4 sm:left-6 lg:left-8 max-w-xl w-full bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container py-2 z-50 max-h-72 overflow-y-auto">
              {filteredReferrals.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectPatient(r)}
                  className="px-4 py-2 hover:bg-surface-container-low cursor-pointer flex items-center justify-between border-b border-surface-container/30 last:border-b-0"
                >
                  <div>
                    <div className="font-title-sm text-xs sm:text-sm text-primary font-semibold">
                      {r.patientName}
                    </div>
                    <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                      <span>{r.id}</span>
                      <span>•</span>
                      <span>{r.referralType}</span>
                      <span>•</span>
                      <span className="font-medium text-secondary">{r.status}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    arrow_forward
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Role Indicator & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
          {/* Active Persona Pill */}
          <Link
            to="/"
            title="Switch Demonstration Role"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary hover:bg-surface-container font-label-sm text-xs font-semibold border border-surface-container/60 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${roleDef.avatarBg}`}></span>
            <span className="truncate max-w-[130px]">{roleDef.title}</span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">expand_more</span>
          </Link>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              type="button"
              aria-label="Care Alerts"
              title="Active Care Alerts"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-white font-label-sm text-[10px] font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Flyout Menu */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container z-50 p-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title-sm text-sm font-bold text-primary">Care Alerts</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNotifMenu(false)}
                    className="text-on-surface-variant hover:text-primary text-xs"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-center py-4 text-xs text-on-surface-variant">No alerts at this time.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg border text-xs transition-colors flex items-start justify-between gap-2 ${
                          n.read
                            ? "bg-surface-container-low/40 border-surface-container text-on-surface-variant"
                            : "bg-surface-container-low border-secondary/30 text-on-surface"
                        }`}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            markNotificationRead(n.id);
                            setShowNotifMenu(false);
                            if (n.link) navigate(n.link);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-primary">{n.title}</span>
                            <span className="text-[10px] text-on-surface-variant">{n.timestamp}</span>
                          </div>
                          <p className="mt-0.5 leading-snug">{n.message}</p>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-on-surface-variant hover:text-error p-0.5"
                          title="Dismiss"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-medium transition-colors border border-surface-container"
            title="Reset demonstration data"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Reset Demo</span>
          </button>

          {/* Role-Specific Action: Only show New Referral if coordinator/facility */}
          {currentRole !== "patient" && (
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-secondary text-white font-label-md text-xs hover:bg-on-secondary-container transition-colors shadow-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span className="hidden sm:inline">New Referral</span>
            </Link>
          )}

          {/* Persona Avatar */}
          <Link to="/" title={`Active Persona: ${roleDef.title} • Click to switch`}>
            <div
              className={`w-8 h-8 rounded-full ${roleDef.avatarBg} text-white flex items-center justify-center font-bold text-xs uppercase hover:ring-2 hover:ring-secondary transition-all shadow-xs`}
            >
              {roleDef.avatarText}
            </div>
          </Link>
        </div>
      </header>

      {/* Demo Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="font-headline-md text-lg text-primary font-bold">Reset Demo Data?</h3>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              This will restore all 7 clinical cases, facilities, transport logs, and care plans to their verified initial demonstration state.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container text-primary font-medium text-xs hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-lg bg-error text-white font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopHeader;
