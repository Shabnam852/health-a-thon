import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  RoleId,
  roleDefinitions,
  navigationConfig,
  getNavigationForRole,
  getRoleDefinition,
  isRouteAllowedForRole,
  getPrimaryRoleForRoute,
} from "./navigationConfig.js";

describe("Role-Based Navigation Configuration", () => {
  test("defines all 4 expected primary operational roles", () => {
    assert.equal(roleDefinitions[RoleId.COORDINATOR].title, "Care Coordinator");
    assert.equal(roleDefinitions[RoleId.FACILITY].title, "Receiving Healthcare Facility");
    assert.equal(roleDefinitions[RoleId.PATIENT].title, "Patient & Family");
    assert.equal(roleDefinitions[RoleId.NAVIGATOR].title, "Care Navigator");
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
    assert.ok(paths.some((p) => p.startsWith("/facility?tab=")));
    assert.ok(paths.includes("/network"));

    // Must NOT contain coordinator command center, create referral, or patient journey
    assert.ok(!paths.includes("/coordinator"));
    assert.ok(!paths.includes("/create"));
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

  test("Navigator navigation contains community outreach and barrier items", () => {
    const items = getNavigationForRole(RoleId.NAVIGATOR);
    const paths = items.map((i) => i.path);

    assert.ok(paths.includes("/navigator"));
    assert.ok(paths.includes("/barriers"));
    assert.ok(paths.includes("/transport"));
    assert.ok(paths.includes("/continuity"));

    // Must NOT contain facility intake or coordinator command center
    assert.ok(!paths.includes("/coordinator"));
    assert.ok(!paths.includes("/facility"));
    assert.ok(!paths.includes("/create"));
    assert.ok(!paths.includes("/patient"));
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

  test("getPrimaryRoleForRoute identifies correct role owner", () => {
    assert.equal(getPrimaryRoleForRoute("/patient"), RoleId.PATIENT);
    assert.equal(getPrimaryRoleForRoute("/facility"), RoleId.FACILITY);
    assert.equal(getPrimaryRoleForRoute("/navigator"), RoleId.NAVIGATOR);
    assert.equal(getPrimaryRoleForRoute("/coordinator"), RoleId.COORDINATOR);
  });
});

