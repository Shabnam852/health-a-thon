/**
 * The guided demo: one newborn's referral, followed across every role.
 * The copy describes the seed case, so it does not depend on what a viewer clicks.
 *
 * Each step can point at one thing on the page (`target`) and ask the presenter to do one thing
 * (`task`). `done` (from the shared data) or `doneOnPage` (from what's open on the page) says when
 * that task has happened, so the step ticks itself off.
 */

import { ReferralStatus } from "../domain/enums.js";
import { RoleId } from "./navigationConfig.js";

export const STORY_REFERRAL_ID = "NX-9042";
// The hospital the story's newborn is heading to. The intake step opens it, whichever hospital was used last.
export const STORY_FACILITY_ID = "FAC-SANJEEVANI";
// The relative who signs up with the case number in the seed data and waits for a coordinator.
export const STORY_LINK_REQUEST_ID = "LINK-SEED-LAKSHMI";
export const STORY_RELATIVE_NAME = "Lakshmi Naidu";
const STORY_PATIENT_NAME = "Baby of Shalini Naidu";

const ARRIVED_OR_LATER = new Set([
  ReferralStatus.ARRIVAL_CONFIRMED,
  ReferralStatus.CLINICAL_ASSESSMENT_RECORDED,
  ReferralStatus.COMPLETED,
]);

/** A selector for an element marked with data-tour="<name>". */
const tour = (name) => `[data-tour="${name}"]`;

/** The first element matching `selector` whose text includes `text`, for rows without a mark. */
export const byText = (selector, text) => () =>
  [...document.querySelectorAll(selector)].find((el) => el.textContent.includes(text)) ?? null;

export const demoStorySteps = [
  {
    role: RoleId.COORDINATOR,
    path: `/referral/${STORY_REFERRAL_ID}`,
    target: tour("journey"),
    title: "Accepted, not yet arrived",
    text: "The hospital accepted this newborn, but the baby hasn't arrived. The case stays open until the hospital confirms arrival.",
  },
  {
    role: RoleId.COORDINATOR,
    path: `/referral/${STORY_REFERRAL_ID}`,
    target: tour("slip"),
    title: "Give the family a slip",
    text: "A slip with the case number and a QR code to sign up. It has no clinical notes, so it's safe to carry.",
    task: "Press Referral slip",
    doneOnPage: (page) => Boolean(page.querySelector('dialog[open] .slip, [role="dialog"] .slip')),
  },
  {
    role: RoleId.COORDINATOR,
    path: "/coordinator",
    target: tour("link-requests"),
    title: "A relative asks to follow the case",
    text: `${STORY_RELATIVE_NAME}, the baby's grandmother, signed up with the case number. Her phone isn't on the referral, so a coordinator checks first.`,
    task: `Press Approve for ${STORY_RELATIVE_NAME}`,
    done: ({ data }) => data.linkRequests?.some((r) => r.id === STORY_LINK_REQUEST_ID && r.status === "APPROVED"),
  },
  {
    role: RoleId.COORDINATOR,
    path: "/patients?show=blocked",
    target: byText("main tr, main li", STORY_PATIENT_NAME),
    title: "Clear the transport barrier",
    text: "The family only has a two-wheeler, so the coordinator arranges a safe van.",
  },
  {
    role: RoleId.PATIENT,
    path: "/patient",
    target: tour("family-arrived"),
    title: "The family says they've arrived",
    text: "Shalini taps one button at the hospital. The coordinator sees it at once, but only the hospital can confirm it.",
    task: "Press We've arrived at the hospital",
    done: ({ referral }) => Boolean(referral?.arrivalReport) || ARRIVED_OR_LATER.has(referral?.status),
  },
  {
    role: RoleId.FACILITY,
    path: `/facility?tab=intransit&facility=${STORY_FACILITY_ID}`,
    target: `button[aria-label="Confirm arrival for ${STORY_PATIENT_NAME}"]`,
    title: "Hospital confirms arrival",
    text: "The hospital sees the family's report and confirms arrival. Only this moves the referral forward.",
    task: "Press Confirm arrival, then save",
    done: ({ referral }) => ARRIVED_OR_LATER.has(referral?.status),
  },
  {
    role: RoleId.COORDINATOR,
    path: `/referral/${STORY_REFERRAL_ID}`,
    target: tour("messages"),
    title: "Texts and records",
    text: "Each status change sends the family a plain text, listed here. Download FHIR gives the next hospital the record in a standard format.",
  },
  {
    role: RoleId.COORDINATOR,
    path: "/continuity",
    target: byText("main tr, main li", "Meera Devi"),
    title: "Follow-up after discharge",
    text: "Care continues after discharge. Meera Devi's follow-ups run to day 42.",
  },
];
