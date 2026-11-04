import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getPrimaryRoleForRoute,
  getRoleDefinition,
  isKnownRoute,
  isRouteAllowedForRole,
} from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import AssistantLauncher from "./assistant/AssistantLauncher.jsx";
import { useModalFocus } from "./Dialog.jsx";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";
import StoryBar from "./StoryBar";
import TopHeader from "./TopHeader";
import { Button, Icon } from "./ui/index.js";

const MobileDrawer = ({ onClose }) => {
  const panelRef = useRef(null);
  useModalFocus(panelRef, onClose);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="relative w-drawer max-w-full h-full bg-surface shadow-overlay z-10 flex flex-col justify-between"
      >
        <Sidebar onNavigate={onClose} isMobileDrawer={true} onClose={onClose} />
      </div>
    </div>
  );
};

const AppShell = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role, setRole, storyStep } = useReferrals();
  const location = useLocation();

  // The drawer is phone-only: it must not stay open, and keep the page locked, behind a new screen
  // (Back button) or once the window grows to the desktop layout (a rotated tablet).
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (e) => e.matches && setMobileMenuOpen(false);
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [mobileMenuOpen]);
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMobileMenuOpen(false);
  }

  const currentRole = role || "coordinator";
  const roleDef = getRoleDefinition(currentRole);
  // Unknown paths fall through to the 404 page instead of the access-denied screen.
  const isAllowed = !isKnownRoute(location.pathname) || isRouteAllowedForRole(currentRole, location.pathname);

  const primaryRoleForRoute = getPrimaryRoleForRoute(location.pathname);
  const requiredRoleDef = getRoleDefinition(primaryRoleForRoute);

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* biome-ignore lint/a11y/useValidAnchor: a skip link is a real link; onClick only keeps the hash out of the URL. */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-3 focus:rounded-control focus:bg-brand focus:text-on-fill focus:font-bold"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-sidebar z-30 bg-surface border-r border-line shadow-card flex-col justify-between">
        <Sidebar />
      </div>

      {mobileMenuOpen && <MobileDrawer onClose={() => setMobileMenuOpen(false)} />}

      <div className="lg:pl-sidebar flex flex-col flex-1 min-w-0">
        <TopHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 pt-header bg-canvas min-h-screen w-full ${storyStep !== null ? "pb-56 lg:pb-28" : "pb-20 lg:pb-0"}`}
        >
          {!isAllowed ? (
            <div className="w-full max-w-lg mx-auto py-16 px-4 sm:px-6 text-center space-y-4">
              <Icon name="lock" size="xl" className="text-danger" />
              <h1 className="font-display text-2xl font-semibold text-ink">For {requiredRoleDef.title}</h1>
              <p className="text-sm text-ink-muted">You are viewing as {roleDef.title}.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button as={Link} to={roleDef.homePath}>
                  Back to my screens
                </Button>
                <Button variant="primary" onClick={() => setRole(requiredRoleDef.id)}>
                  Switch to {requiredRoleDef.shortTitle}
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {isAllowed && <AssistantLauncher />}
      <MobileNav onOpenMenu={() => setMobileMenuOpen(true)} />
      <StoryBar />
    </div>
  );
};

export default AppShell;
