import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getActiveNavItem,
  getNavigationForRole,
  getPrimaryRoleForRoute,
  isKnownRoute,
  isRouteAllowedForRole,
  navigationConfig,
  RoleId,
  roleDefinitions,
} from "./navigationConfig.js";

describe("Role-Based Navigation Configuration", () => {
  test("defines the 3 roles", () => {
    assert.equal(Object.keys(roleDefinitions).length, 3);
    assert.equal(roleDefinitions[RoleId.COORDINATOR].title, "Care Coordinator");
    assert.equal(roleDefinitions[RoleId.FACILITY].title, "Hospital");
    assert.equal(roleDefinitions[RoleId.PATIENT].title, "Patient & Family");
  });

  test("Coordinator navigation contains only coordinator-appropriate items", () => {
    const items = getNavigationForRole(RoleId.COORDINATOR);
    assert.ok(items.length >= 6);

    const paths = items.map((i) => i.path);
    assert.ok(paths.includes("/coordinator"));
    assert.ok(paths.includes("/barriers"));
    assert.ok(paths.includes("/transport"));
    assert.ok(paths.includes("/network"));
    assert.ok(paths.includes("/continuity"));

    // Must NOT contain patient-specific journey routes
    assert.ok(!paths.includes("/patient"));
  });

  test("Facility navigation contains only facility-appropriate intake items", () => {
    const items = getNavigationForRole(RoleId.FACILITY);
    const paths = items.map((i) => i.path);

    assert.ok(paths.includes("/facility"));
    assert.ok(paths.includes("/network"));

    // Must NOT contain coordinator command center or patient journey
    assert.ok(!paths.includes("/coordinator"));
    assert.ok(!paths.includes("/patient"));
    assert.ok(!paths.includes("/barriers"));
  });

  test("Patient navigation contains only patient-facing journey items", () => {
    const items = getNavigationForRole(RoleId.PATIENT);
    const paths = items.map((i) => i.path);

    assert.ok(paths.includes("/patient"));
    assert.ok(paths.some((p) => p.startsWith("/patient?view=")));
    assert.ok(paths.includes("/continuity"));

    // Must NEVER expose coordinator command center, barriers, facility intake, or clinical create
    assert.ok(!paths.includes("/coordinator"));
    assert.ok(!paths.includes("/facility"));
    assert.ok(!paths.includes("/barriers"));
    assert.ok(!paths.includes("/transport"));
    assert.ok(!paths.includes("/create"));
    assert.ok(!paths.includes("/network"));
  });

  test("Coordinator keeps the caseload screen", () => {
    const paths = getNavigationForRole(RoleId.COORDINATOR).map((i) => i.path);
    assert.ok(paths.includes("/navigator"));
    assert.equal(getPrimaryRoleForRoute("/navigator"), RoleId.COORDINATOR);
  });

  test("Only a hospital makes referrals", () => {
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/create"), true);
    assert.equal(isRouteAllowedForRole(RoleId.COORDINATOR, "/create"), false);
    assert.equal(getPrimaryRoleForRoute("/create"), RoleId.FACILITY);
  });

  test("Route access boundaries enforce role isolation", () => {
    // Coordinator can access coordination desk
    assert.equal(isRouteAllowedForRole(RoleId.COORDINATOR, "/coordinator"), true);
    assert.equal(isRouteAllowedForRole(RoleId.COORDINATOR, "/barriers"), true);
    assert.equal(isRouteAllowedForRole(RoleId.COORDINATOR, "/transport"), true);

    // Patient CANNOT access coordinator or facility
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/coordinator"), false);
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/facility"), false);
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/barriers"), false);
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/transport"), false);
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/create"), false);

    // Patient CAN access patient journey and continuity
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/patient"), true);
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/continuity"), true);

    // Facility CANNOT access coordinator command center or barrier desk
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/coordinator"), false);
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/barriers"), false);
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/patient"), false);

    // Facility CAN access facility operations and regional network
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/facility"), true);
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/network"), true);

    // Public root is always allowed for all roles
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/"), true);
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/"), true);
    assert.equal(isRouteAllowedForRole(RoleId.COORDINATOR, "/"), true);
  });

  test("Each role can reach exactly its own workspaces", () => {
    const ROUTES = [
      "/coordinator",
      "/navigator",
      "/referral",
      "/referrals",
      "/barriers",
      "/transport",
      "/facility",
      "/create",
      "/patient",
      "/continuity",
      "/network",
    ];
    const EXPECTED = {
      [RoleId.COORDINATOR]: [
        "/coordinator",
        "/navigator",
        "/referral",
        "/referrals",
        "/barriers",
        "/transport",
        "/facility",
        "/continuity",
        "/network",
      ],
      [RoleId.FACILITY]: ["/referral", "/referrals", "/facility", "/create", "/network"],
      [RoleId.PATIENT]: ["/patient", "/continuity"],
    };

    for (const [role, allowed] of Object.entries(EXPECTED)) {
      assert.deepEqual(
        ROUTES.filter((route) => isRouteAllowedForRole(role, route)),
        allowed,
        role,
      );
    }
  });

  test("Route matching uses whole path segments", () => {
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/patient/123"), true);
    assert.equal(isRouteAllowedForRole(RoleId.PATIENT, "/patient-admin"), false);
    assert.equal(isRouteAllowedForRole(RoleId.FACILITY, "/referral/REF-1"), true);
  });

  test("Only real workspaces count as known routes", () => {
    assert.equal(isKnownRoute("/"), true);
    assert.equal(isKnownRoute("/referral/REF-1"), true);
    assert.equal(isKnownRoute("/coordinator"), true);
    assert.equal(isKnownRoute("/nope"), false);
    assert.equal(isKnownRoute("/coordinator-old"), false);
  });

  test("Every nav item points somewhere its role may go", () => {
    for (const [role, items] of Object.entries(navigationConfig)) {
      for (const { path } of items) {
        assert.equal(isRouteAllowedForRole(role, path.split("?")[0]), true, `${role}: ${path}`);
      }
    }
  });

  test("Every nav item is the only active one on its own link", () => {
    for (const [role, items] of Object.entries(navigationConfig)) {
      for (const item of items) {
        const [pathname, query = ""] = item.path.split("?");
        const search = query && `?${query}`;
        assert.equal(getActiveNavItem(items, pathname, search), item, `${role}: ${item.path}`);
      }
    }
  });

  test("The active nav item ignores other query params and follows sub-pages", () => {
    const items = getNavigationForRole(RoleId.PATIENT);
    const hub = items.find((i) => i.path === "/patient");
    const ride = items.find((i) => i.path === "/patient?view=transit");

    assert.equal(getActiveNavItem(items, "/patient", "?x=1&view=transit"), ride);
    assert.equal(getActiveNavItem(items, "/patient", "?view=unknown"), hub);
    assert.equal(getActiveNavItem(items, "/patient/sub", ""), hub);
    assert.equal(getActiveNavItem(items, "/patient-old", ""), null);
    assert.equal(getActiveNavItem(items, "/", ""), null);

    const coordinator = getNavigationForRole(RoleId.COORDINATOR);
    assert.equal(getActiveNavItem(coordinator, "/referrals", "").title, "Queue");
  });

  test("getPrimaryRoleForRoute identifies correct role owner", () => {
    assert.equal(getPrimaryRoleForRoute("/patient"), RoleId.PATIENT);
    assert.equal(getPrimaryRoleForRoute("/facility"), RoleId.FACILITY);
    assert.equal(getPrimaryRoleForRoute("/coordinator"), RoleId.COORDINATOR);
    assert.equal(getPrimaryRoleForRoute("/barriers"), RoleId.COORDINATOR);
  });
});
