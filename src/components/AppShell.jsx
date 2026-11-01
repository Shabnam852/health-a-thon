import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { useReferrals } from "../context/ReferralContext.jsx";
import {
  isRouteAllowedForRole,
  isKnownRoute,
  getRoleDefinition,
  getPrimaryRoleForRoute,
} from "../config/navigationConfig.js";

const AppShell = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role, setRole } = useReferrals();
  const location = useLocation();

  const currentRole = role || "coordinator";
  const roleDef = getRoleDefinition(currentRole);
  // Unknown paths fall through to the 404 page instead of the access-denied screen.
  const isAllowed = !isKnownRoute(location.pathname) || isRouteAllowedForRole(currentRole, location.pathname);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const primaryRoleForRoute = getPrimaryRoleForRoute(location.pathname);
  const requiredRoleDef = getRoleDefinition(primaryRoleForRoute);

  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-secondary/20">
      {/* Desktop Fixed Sidebar (stationary on desktop, 270px wide) */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[270px] z-30 bg-surface-container-lowest border-r border-surface-container/60 shadow-xs flex-col justify-between"
        aria-label="Desktop Navigation Rail"
      >
        <Sidebar />
      </aside>

      {/* Mobile Drawer (with backdrop, esc key, aria-modal, focus trap) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="relative w-[280px] max-w-[85vw] h-full bg-surface-container-lowest shadow-2xl z-10 flex flex-col justify-between">
            <Sidebar
              onNavigate={() => setMobileMenuOpen(false)}
              isMobileDrawer={true}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Layout Container: Starts IMMEDIATELY after sidebar on desktop (lg:pl-[270px]) */}
      <div className="lg:pl-[270px] flex flex-col flex-1 min-w-0">
        <TopHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Scrollable Main Workspace */}
        <main className="flex-1 pt-16 bg-surface min-h-screen w-full">
          {!isAllowed ? (
            /* Role Boundary / Access Denied Screen */
            <div className="w-full max-w-3xl mx-auto py-16 px-4 sm:px-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-error-container text-error mx-auto flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[34px]">lock</span>
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/60 text-on-error-container text-xs font-bold uppercase tracking-wider">
                  Role Boundary Restricted
                </span>
                <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  Restricted to {requiredRoleDef.title}
                </h1>
                <p className="font-body-md text-sm text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                  This workspace (
                  <code className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-xs">
                    {location.pathname}
                  </code>
                  ) is designated for the <strong>{requiredRoleDef.title}</strong> persona.
                  You are currently viewing Navexa Health as the{" "}
                  <strong>{roleDef.title}</strong> persona.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container max-w-md mx-auto text-xs text-on-surface-variant text-left space-y-1.5">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    info
                  </span>
                  Clinical-Operational Role Boundary
                </div>
                <p>
                  Navexa enforces clinical and operational separation so patients never encounter
                  administrative triage systems, and coordinators do not modify hospital intake
                  without facility credentials.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to={roleDef.homePath}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs"
                >
                  Return to My Workspace ({roleDef.shortTitle})
                </Link>

                <button
                  onClick={() => {
                    setRole(requiredRoleDef.id);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>Switch to {requiredRoleDef.shortTitle} Persona</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              <p className="text-[11px] text-on-surface-variant/70">
                Demonstration Guard • Client-Side Simulation
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
