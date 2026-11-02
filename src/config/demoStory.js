/**
 * The guided demo: one newborn's referral, followed across every role.
 * The copy describes the seed case, so it does not depend on what a viewer clicks.
 */

import { RoleId } from "./navigationConfig.js";

export const STORY_REFERRAL_ID = "NX-9042";

export const demoStorySteps = [
  {
    role: RoleId.COORDINATOR,
    path: `/referral/${STORY_REFERRAL_ID}`,
    text: "The hospital accepted this newborn, but the baby hasn't arrived. The case stays open.",
  },
  {
    role: RoleId.COORDINATOR,
    path: "/barriers",
    text: "The family only has a two-wheeler, so the coordinator arranges a safe van.",
  },
  {
    role: RoleId.FACILITY,
    path: "/facility?tab=intransit",
    text: "The hospital confirms arrival. Only this moves the referral forward.",
  },
  {
    role: RoleId.PATIENT,
    path: "/patient",
    text: "The family sees where things stand and what happens next, in plain words.",
  },
  {
    role: RoleId.COORDINATOR,
    path: "/continuity",
    text: "Care continues after discharge. Meera Devi's follow-ups run to day 42.",
  },
];
