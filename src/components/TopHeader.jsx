import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { Button, Icon } from "./ui/index.js";

const TopHeader = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, dismissNotification, role } = useReferrals();

  const bellRef = useRef(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const currentRole = role || "coordinator";
  // Alerts carry patient details and link to a workspace, so each role sees only those it can open.
  const visibleNotifications = notifications.filter(
    (n) => !n.link || isRouteAllowedForRole(currentRole, n.link.split("?")[0]),
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  // A dismissed alert's button disappears, so move focus to the next alert, or to Close.
  const dismissAlert = (id, index) => {
    dismissNotification(id);
    requestAnimationFrame(() => {
      const panel = document.getElementById("alerts-panel");
      const buttons = panel?.querySelectorAll("[data-dismiss]") ?? [];
      const target = buttons[Math.min(index, buttons.length - 1)] ?? panel?.querySelector("[data-close]");
      target?.focus();
    });
  };

  const closeAlerts = () => {
    setShowNotifMenu(false);
    bellRef.current?.focus();
  };

  return (
    <header className="fixed top-0 left-0 lg:left-sidebar right-0 h-header bg-surface z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-line">
      <div className="flex items-center gap-2 sm:gap-3 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden -ml-2 shrink-0"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
        >
          <Icon name="menu" size="lg" />
        </Button>
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
                <Button variant="ghost" size="sm" onClick={closeAlerts} data-close="">
                  Close
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {visibleNotifications.length === 0 ? (
                  <p className="text-center py-4 text-xs text-ink-muted">No alerts at this time.</p>
                ) : (
                  visibleNotifications.map((n, index) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-control border text-xs flex items-start justify-between gap-2 ${
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
                        onClick={() => dismissAlert(n.id, index)}
                        data-dismiss=""
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
