import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { Button, Icon, Input } from "./ui/index.js";

const TopHeader = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const { referrals, notifications, markNotificationRead, dismissNotification, setActiveReferralId, role } =
    useReferrals();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const bellRef = useRef(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const currentRole = role || "coordinator";
  const canSearch = isRouteAllowedForRole(currentRole, "/referral");
  // Alerts carry patient details and link to a workspace, so each role sees only those it can open.
  const visibleNotifications = notifications.filter(
    (n) => !n.link || isRouteAllowedForRole(currentRole, n.link.split("?")[0]),
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  // Only roles that can open a referral chart may search across referrals.
  const filteredReferrals =
    searchTerm.trim() && canSearch
      ? referrals.filter(
          (r) =>
            r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.indication?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.condition?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : [];

  const handleSelectPatient = (ref) => {
    setActiveReferralId(ref.id);
    setSearchTerm("");
    setIsSearching(false);
    setActiveResult(-1);
    navigate(`/referral/${ref.id}`);
  };

  const showResults = isSearching && filteredReferrals.length > 0;

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsSearching(false);
      setActiveResult(-1);
    } else if (showResults && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResult((i) => (i + 1) % filteredReferrals.length);
    } else if (showResults && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResult((i) => (i <= 0 ? filteredReferrals.length : i) - 1);
    } else if (showResults && e.key === "Enter") {
      handleSelectPatient(filteredReferrals[Math.max(activeResult, 0)]);
    }
  };

  const closeAlerts = () => {
    setShowNotifMenu(false);
    bellRef.current?.focus();
  };

  return (
    <header className="fixed top-0 left-0 lg:left-sidebar right-0 h-header bg-surface z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-line">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden -ml-2 shrink-0"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
        >
          <Icon name="menu" size="lg" />
        </Button>

        {canSearch && (
          <div className="relative w-full flex items-center">
            <Icon name="search" className="absolute left-3 text-ink-muted" />
            <Input
              className="pl-9"
              placeholder="Search"
              aria-label="Search patients"
              type="search"
              role="combobox"
              aria-expanded={showResults}
              aria-controls="patient-search-results"
              aria-autocomplete="list"
              aria-activedescendant={showResults && activeResult >= 0 ? `patient-result-${activeResult}` : undefined}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearching(true);
                setActiveResult(-1);
              }}
              onFocus={() => setIsSearching(true)}
              onBlur={() => setIsSearching(false)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        )}

        <div role="status" className="sr-only">
          {isSearching && searchTerm.trim() && canSearch
            ? `${filteredReferrals.length} ${filteredReferrals.length === 1 ? "patient" : "patients"} found`
            : ""}
        </div>
        {isSearching && searchTerm.trim() && canSearch && filteredReferrals.length === 0 && (
          <div className="absolute top-header left-4 right-4 sm:left-6 sm:right-auto lg:left-8 max-w-xl sm:w-full bg-surface rounded-card shadow-overlay border border-line px-4 py-3 z-50 text-sm text-ink-muted">
            No matching patients.
          </div>
        )}
        <div
          id="patient-search-results"
          role="listbox"
          aria-label="Matching patients"
          hidden={!showResults}
          className="absolute top-header left-4 right-4 sm:left-6 sm:right-auto lg:left-8 max-w-xl sm:w-full bg-surface rounded-card shadow-overlay border border-line py-2 z-50 max-h-72 overflow-y-auto"
        >
          {showResults &&
            filteredReferrals.map((r, index) => (
              <div
                key={r.id}
                tabIndex={-1}
                id={`patient-result-${index}`}
                role="option"
                aria-selected={index === activeResult}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectPatient(r);
                }}
                className={`px-4 py-2 min-h-control cursor-pointer border-b border-line last:border-b-0 ${index === activeResult ? "bg-subtle" : "hover:bg-muted"}`}
              >
                <div className="text-sm text-ink font-semibold">{r.patientName}</div>
                <div className="text-xs text-ink-muted">
                  {r.id} • {r.referralType} • {r.status.replace(/_/g, " ")}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        <div className="relative">
          <Button
            ref={bellRef}
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            aria-expanded={showNotifMenu}
            aria-controls="alerts-panel"
            aria-label={unreadCount > 0 ? `Alerts, ${unreadCount} unread` : "Alerts"}
            title="Alerts"
          >
            <Icon name="notifications" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-on-fill text-xs font-bold"
              >
                {unreadCount}
              </span>
            )}
          </Button>

          {showNotifMenu && (
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape from inside the panel closes it.
            <div
              id="alerts-panel"
              role="region"
              aria-label="Alerts"
              onKeyDown={(e) => e.key === "Escape" && closeAlerts()}
              className="fixed inset-x-4 top-header sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96 bg-surface rounded-card shadow-overlay border border-line z-50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-bold text-ink">Alerts</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-danger-soft text-danger-strong text-xs font-bold">
                    {unreadCount} New
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={closeAlerts}>
                  Close
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {visibleNotifications.length === 0 ? (
                  <p className="text-center py-4 text-xs text-ink-muted">No alerts at this time.</p>
                ) : (
                  visibleNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-control border text-xs transition-colors flex items-start justify-between gap-2 ${
                        n.read ? "bg-surface border-line text-ink-muted" : "bg-muted border-line text-ink"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => {
                          markNotificationRead(n.id);
                          setShowNotifMenu(false);
                          if (n.link) navigate(n.link);
                        }}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink">{n.title}</span>
                          <span className="text-xs text-ink-muted shrink-0">{n.timestamp}</span>
                        </span>
                        <span className="block mt-0.5 leading-snug">{n.message}</span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismissNotification(n.id)}
                        aria-label={`Dismiss alert: ${n.title}`}
                      >
                        <Icon name="close" size="sm" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {isRouteAllowedForRole(currentRole, "/create") && (
          <Button
            as={Link}
            to="/create"
            variant="primary"
            aria-label="New referral"
            className="px-0 min-w-control sm:px-4"
          >
            <Icon name="add" />
            <span className="hidden sm:inline">New referral</span>
          </Button>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
