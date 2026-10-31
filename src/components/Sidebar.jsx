import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import {
  getNavigationForRole,
  getRoleDefinition,
  roleDefinitions,
} from "../config/navigationConfig.js";

const Sidebar = ({ onNavigate, isMobileDrawer = false, onClose }) => {
  const { role, setRole } = useReferrals();
  const location = useLocation();
  const navigate = useNavigate();

  const currentRole = role || "coordinator";
  const roleDef = getRoleDefinition(currentRole);
  const navItems = getNavigationForRole(currentRole);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    const targetDef = roleDefinitions[newRole];
    if (targetDef?.homePath) {
      navigate(targetDef.homePath);
      if (onNavigate) onNavigate();
    }
  };

  const handleItemClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className="w-full h-full bg-surface-container-lowest flex flex-col justify-between select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="px-5 py-4 bg-surface-container-lowest border-b border-surface-container/60">
          <div className="flex items-center justify-between">
            <Link
              to={roleDef.homePath}
              onClick={handleItemClick}
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
                N
              </div>
              <div className="flex flex-col">
                <span className="font-headline-lg text-base text-primary tracking-tight font-bold">
                  Navexa Health
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant truncate max-w-[150px]">
                  Maternal & Neonatal System
                </span>
              </div>
            </Link>

            {isMobileDrawer && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Close navigation drawer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>

          {/* Current Workspace Pill */}
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              {roleDef.shortTitle}
            </span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Demo Mode
            </span>
          </div>
        </div>

        {/* Role-Specific Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-label-sm font-bold uppercase tracking-wider text-on-surface-variant/70">
            {roleDef.title} Navigation
          </div>

          {navItems.map((item) => {
            const currentFull = location.pathname + location.search;
            const isExact = currentFull === item.path;
            const isPrefix = item.matchPrefix && location.pathname.startsWith(item.matchPrefix);
            const isActive = isExact || isPrefix;

            return (
              <Link
                key={item.title}
                to={item.path}
                onClick={handleItemClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-medium ${
                  isActive
                    ? "bg-primary text-white font-semibold shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[19px] shrink-0"
                  style={{
                    color: isActive ? "#ffffff" : "inherit",
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span className="truncate flex-1">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role Profile & Switcher Footer */}
      <div className="p-3 m-3 rounded-xl bg-surface-container-low border border-surface-container/60 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl ${roleDef.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs uppercase`}
          >
            {roleDef.avatarText}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-title-sm text-xs text-primary font-bold truncate">
                {roleDef.title}
              </p>
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
            </div>
            <p className="font-label-sm text-[10px] text-on-surface-variant truncate">
              {roleDef.badge}
            </p>
          </div>
        </div>

        {/* Quick Persona Switcher Select */}
        <div className="mt-2.5 pt-2 border-t border-surface-container/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Switch Persona:
            </span>
            <Link
              to="/"
              onClick={handleItemClick}
              className="text-[10px] text-secondary hover:underline font-bold"
            >
              All Roles
            </Link>
          </div>
          <select
            value={currentRole}
            onChange={handleRoleChange}
            aria-label="Switch demonstration persona"
            className="w-full text-xs font-semibold p-1.5 rounded-lg bg-surface-container-lowest text-primary border border-surface-container focus:outline-none focus:ring-1 focus:ring-secondary/40"
          >
            {Object.values(roleDefinitions).map((def) => (
              <option key={def.id} value={def.id}>
                {def.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
