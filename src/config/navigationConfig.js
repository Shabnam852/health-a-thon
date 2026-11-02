/**
 * Navexa Health — Centralized Role-Based Navigation Architecture
 *
 * Strict role-specific navigation configurations and route boundary definitions
 * for the Care Coordinator, Hospital, and Patient & Family personas.
 */

export const RoleId = Object.freeze({
  COORDINATOR: "coordinator",
  FACILITY: "facility",
  PATIENT: "patient",
});

export const roleDefinitions = {
  [RoleId.COORDINATOR]: {
    id: RoleId.COORDINATOR,
    title: "Care Coordinator",
    shortTitle: "Coordinator",
    badge: "Command Center",
    icon: "grid_view",
    homePath: "/coordinator",
    description: "Operational monitoring, triage priority queues, and network-wide care coordination.",
    allowedPrefixes: [
      "/coordinator",
      "/referral",
      "/referrals",
      "/barriers",
      "/transport",
      "/facility",
      "/continuity",
      "/network",
      "/navigator",
    ],
  },
  [RoleId.FACILITY]: {
    id: RoleId.FACILITY,
    title: "Hospital",
    shortTitle: "Hospital",
    badge: "Intake & Clinical Handoff",
    icon: "domain",
    homePath: "/facility",
    description: "Triage review, bed assignment, physical arrival verification, and structured clinical outcomes.",
    allowedPrefixes: ["/facility", "/create", "/referral", "/referrals", "/network"],
  },
  [RoleId.PATIENT]: {
    id: RoleId.PATIENT,
    title: "Patient & Family",
    shortTitle: "Patient Journey",
    badge: "Family Lifeline",
    icon: "family_restroom",
    homePath: "/patient",
    description: "Reassuring, plain-language care progress, driver arrival status, and postpartum follow-up.",
    allowedPrefixes: ["/patient", "/continuity"],
  },
};

/**
 * Role-specific navigation items.
 * Each item has: title, icon, path, and optional matchPrefix / queryFilter.
 */
export const navigationConfig = {
  [RoleId.COORDINATOR]: [
    {
      title: "Dashboard",
      icon: "grid_view",
      path: "/coordinator",
      matchPrefix: "/coordinator",
      category: "COMMAND & TRIAGE",
    },
    {
      title: "Queue",
      icon: "assignment_late",
      path: "/coordinator?view=queue",
      matchPrefix: "/referrals",
      category: "COMMAND & TRIAGE",
    },
    {
      title: "Barriers",
      icon: "warning_amber",
      path: "/barriers",
      matchPrefix: "/barriers",
      category: "OPERATIONS",
    },
    {
      title: "Caseload",
      icon: "support_agent",
      path: "/navigator",
      matchPrefix: "/navigator",
      category: "OPERATIONS",
    },
    {
      title: "Transport",
      icon: "local_taxi",
      path: "/transport",
      matchPrefix: "/transport",
      category: "LOGISTICS",
    },
    {
      title: "Hospitals",
      icon: "hub",
      path: "/network",
      matchPrefix: "/network",
      category: "NETWORK",
    },
    {
      title: "42-day follow-up",
      tabLabel: "Follow-up",
      icon: "event_available",
      path: "/continuity",
      matchPrefix: "/continuity",
      category: "CONTINUITY",
    },
  ],

  [RoleId.FACILITY]: [
    {
      title: "Intake",
      icon: "domain",
      path: "/facility",
      matchPrefix: "/facility",
      category: "CLINICAL INTAKE",
    },
    {
      title: "Hospitals",
      icon: "hub",
      path: "/network",
      matchPrefix: "/network",
      category: "NETWORK",
    },
  ],

  [RoleId.PATIENT]: [
    {
      title: "My journey",
      tabLabel: "Journey",
      icon: "family_restroom",
      path: "/patient",
      matchPrefix: "/patient",
      category: "MY HEALTH JOURNEY",
    },
    {
      title: "My ride",
      tabLabel: "Ride",
      icon: "directions_car",
      path: "/patient?view=transit",
      category: "MY HEALTH JOURNEY",
    },
    {
      title: "What to bring",
      tabLabel: "Bring",
      icon: "checklist",
      path: "/patient?view=checklist",
      category: "PREPARATION",
    },
    {
      title: "42-day plan",
      tabLabel: "Plan",
      icon: "favorite",
      path: "/continuity",
      matchPrefix: "/continuity",
      category: "CONTINUING CARE",
    },
    {
      title: "Get help",
      tabLabel: "Help",
      icon: "help_outline",
      path: "/patient?view=support",
      category: "SUPPORT",
    },
  ],
};

/**
 * Returns navigation items for a given role. Falls back to coordinator.
 */
export const getNavigationForRole = (role) => {
  return navigationConfig[role] || navigationConfig[RoleId.COORDINATOR];
};

/**
 * Returns definition for a role ID.
 */
export const getRoleDefinition = (role) => {
  return roleDefinitions[role] || roleDefinitions[RoleId.COORDINATOR];
};

// Matches a whole path segment, so "/patient" covers "/patient/1" but not "/patient-admin".
const matchesPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Returns the one nav item for the current location, or null.
 * The item whose path and query fit best wins; matchPrefix is only for pages below an item.
 */
export const getActiveNavItem = (items, pathname, search = "") => {
  const current = new URLSearchParams(search);
  let best = null;
  let bestParams = -1;

  for (const item of items) {
    const [itemPath, itemQuery = ""] = item.path.split("?");
    if (itemPath !== pathname) continue;
    const params = [...new URLSearchParams(itemQuery)];
    if (params.length > bestParams && params.every(([key, value]) => current.get(key) === value)) {
      best = item;
      bestParams = params.length;
    }
  }
  if (best) return best;

  return items.find((item) => item.matchPrefix && matchesPrefix(pathname, item.matchPrefix)) || null;
};

/**
 * Checks whether a pathname is permitted for a specific role.
 */
export const isRouteAllowedForRole = (role, pathname) => {
  // Public root route is always allowed
  if (pathname === "/" || pathname === "") return true;

  const def = getRoleDefinition(role);
  if (!def?.allowedPrefixes) return true;

  return def.allowedPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
};

/**
 * True when a pathname belongs to a workspace of any role. Everything else is a 404.
 */
export const isKnownRoute = (pathname) => {
  if (pathname === "/" || pathname === "") return true;
  return Object.values(roleDefinitions).some((def) =>
    def.allowedPrefixes.some((prefix) => matchesPrefix(pathname, prefix)),
  );
};

/**
 * Finds the primary role that owns or has access to a given route.
 */
export const getPrimaryRoleForRoute = (pathname) => {
  if (pathname.startsWith("/patient")) return RoleId.PATIENT;
  if (pathname.startsWith("/facility")) return RoleId.FACILITY;
  if (pathname.startsWith("/coordinator")) return RoleId.COORDINATOR;
  if (pathname.startsWith("/barriers")) return RoleId.COORDINATOR;
  if (pathname.startsWith("/transport")) return RoleId.COORDINATOR;
  if (pathname.startsWith("/create")) return RoleId.FACILITY;
  return RoleId.COORDINATOR;
};
