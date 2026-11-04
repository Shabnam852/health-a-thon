/**
 * Pictograms from Healthicons (healthicons.org, CC0, pinned to healthicons@2.0.0): icons drawn for
 * public health programmes, so they read clearly to families with low literacy.
 *
 * Each SVG is used as a CSS mask over `currentColor`, so the tone class colours it in both themes
 * and no SVG markup is injected into the page. Decorative: the text beside it carries the meaning.
 * To add one, import its outline SVG below and give it a plain name. Browse at healthicons.org.
 */

import heartOrgan from "healthicons/public/icons/svg/outline/body/heart_organ.svg";
import bloodPressure from "healthicons/public/icons/svg/outline/devices/blood_pressure.svg";
import testTubes from "healthicons/public/icons/svg/outline/devices/test_tubes.svg";
import thermometer from "healthicons/public/icons/svg/outline/devices/thermometer.svg";
import ultrasound from "healthicons/public/icons/svg/outline/devices/ultrasound_scanner.svg";
import urineSample from "healthicons/public/icons/svg/outline/devices/urine_sample.svg";
import weight from "healthicons/public/icons/svg/outline/devices/weight.svg";
import calm from "healthicons/public/icons/svg/outline/emotions/calm.svg";
import medicines from "healthicons/public/icons/svg/outline/medications/medicines.svg";
import calendar from "healthicons/public/icons/svg/outline/objects/calendar.svg";
import healthWorkerForm from "healthicons/public/icons/svg/outline/objects/health_worker_form.svg";
import insuranceCard from "healthicons/public/icons/svg/outline/objects/insurance_card.svg";
import phone from "healthicons/public/icons/svg/outline/objects/phone.svg";
import baby from "healthicons/public/icons/svg/outline/people/baby_0306m.svg";
import callCentre from "healthicons/public/icons/svg/outline/people/call_centre.svg";
import communityHealthworker from "healthicons/public/icons/svg/outline/people/community_healthworker.svg";
import doctor from "healthicons/public/icons/svg/outline/people/doctor.svg";
import nurse from "healthicons/public/icons/svg/outline/people/nurse.svg";
import people from "healthicons/public/icons/svg/outline/people/people.svg";
import pregnant from "healthicons/public/icons/svg/outline/people/pregnant.svg";
import rmnh from "healthicons/public/icons/svg/outline/people/rmnh.svg";
import travel from "healthicons/public/icons/svg/outline/people/travel.svg";
import home from "healthicons/public/icons/svg/outline/places/home.svg";
import hospital from "healthicons/public/icons/svg/outline/places/hospital.svg";
import contactSupport from "healthicons/public/icons/svg/outline/symbols/contact_support.svg";
import geoLocation from "healthicons/public/icons/svg/outline/symbols/geo_location.svg";
import idDocuments from "healthicons/public/icons/svg/outline/symbols/i_documents_accepted.svg";
import question from "healthicons/public/icons/svg/outline/symbols/question.svg";
import referral from "healthicons/public/icons/svg/outline/symbols/referral.svg";
import yes from "healthicons/public/icons/svg/outline/symbols/yes.svg";
import ambulance from "healthicons/public/icons/svg/outline/vehicles/ambulance.svg";

// Names describe what the picture means in this app, not the Healthicons file name.
const ICONS = {
  hospital,
  van: ambulance,
  baby,
  pregnant,
  // Reproductive, maternal and newborn health: a mother with her baby.
  "mother-baby": rmnh,
  calendar,
  phone,
  // A traveller with a bag: what to pack for the hospital.
  bag: travel,
  route: geoLocation,
  chat: contactSupport,
  helpline: callCentre,
  family: people,
  clipboard: healthWorkerForm,
  coordinator: communityHealthworker,
  doctor,
  nurse,
  home,
  referral,
  check: yes,
  // Things to bring: an identity document, a health insurance card, medicines.
  id: idDocuments,
  "health-card": insuranceCard,
  medicines,
  question,
  // A calm face: emotional health and well-being visits.
  wellbeing: calm,
  // Vital signs on a case.
  "blood-pressure": bloodPressure,
  heart: heartOrgan,
  urine: urineSample,
  scan: ultrasound,
  "blood-test": testTubes,
  weight,
  temperature: thermometer,
};

export const PICTOGRAMS = Object.keys(ICONS);

// The tile is a soft tint of the same tone, so the icon sits on a calm square, as in Nordic health apps.
const TONES = {
  accent: "text-accent bg-accent-soft",
  danger: "text-danger bg-danger-soft",
  warning: "text-warning bg-warning-soft",
  neutral: "text-ink-muted bg-subtle",
  // On the dark brand panels.
  "on-fill": "text-highlight bg-on-fill/10",
};

const SIZES = {
  sm: { tile: "w-10 h-10 rounded-control", icon: "w-7 h-7" },
  md: { tile: "w-14 h-14 rounded-[0.875rem]", icon: "w-10 h-10" },
  lg: { tile: "w-20 h-20 rounded-card", icon: "w-14 h-14" },
};

// Bare pictograms (no tile) are for lists and rows, where a tile on every row turns into clutter.
// Tiles are for one moment per screen: a role card, the ride panel, an empty state.
const BARE_TONES = { accent: "text-accent", neutral: "text-ink-muted", ink: "text-ink", danger: "text-danger" };

const Pictogram = ({ name, tone = "accent", size = "md", bare = false, className = "" }) => {
  const src = ICONS[name];
  if (!src) return null;
  const mask = `url("${src}") center / contain no-repeat`;
  if (bare) {
    return (
      <span
        aria-hidden="true"
        className={`block shrink-0 bg-current ${SIZES[size].icon} ${BARE_TONES[tone] || BARE_TONES.neutral} ${className}`}
        style={{ mask, WebkitMask: mask }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${SIZES[size].tile} ${TONES[tone]} ${className}`}
    >
      <span className={`block bg-current ${SIZES[size].icon}`} style={{ mask, WebkitMask: mask }} />
    </span>
  );
};

export default Pictogram;
