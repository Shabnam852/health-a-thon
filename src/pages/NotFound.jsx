import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getRoleDefinition } from "../config/navigationConfig.js";

const NotFound = () => {
  const { role } = useReferrals();
  const location = useLocation();
  const roleDef = getRoleDefinition(role);

  return (
    <div className="w-full max-w-2xl mx-auto py-20 px-4 sm:px-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center shadow-xs">
        <span className="material-symbols-outlined text-[36px]">travel_explore</span>
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider">
          404 Not Found
        </span>
        <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight">
          Page Does Not Exist
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
          The requested path (<code className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-xs">{location.pathname}</code>) could not be located in the Navexa Health care navigation platform.
        </p>
      </div>

      <div className="pt-2">
        <Link
          to={roleDef.homePath}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Return to {roleDef.title} Workspace</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

