/**
 * NAVEXA HEALTH — CHECK-UPS IN A FAMILY'S WORDS
 * Staff see each follow-up visit by its clinical title and focus (PPH, EPDS, bilirubin).
 * A family sees what the visit is for in plain words, and can have it read aloud.
 * The wording needs review by a clinician and a community health worker before real use.
 */

import { EMERGENCY_LINE } from "./assistant.js";

// Keyed by the visit's title without its "Day N" prefix.
const PLAIN_VISITS = {
  "maternal & lactation check": {
    name: "Mother and breastfeeding check",
    checks: "How breastfeeding is going, how your stitches or wound are healing, and your blood pressure.",
  },
  "bp & surgical healing": {
    name: "Blood pressure and healing check",
    checks: "Your blood pressure, any heavy bleeding since the birth, and how your wound is healing.",
  },
  "emotional health & mental well-being": {
    name: "How you are feeling",
    checks:
      "How you are feeling in your mind. Feeling low, worried or unable to sleep is common after a birth, and help is there. Also how feeding is going.",
  },
  "comprehensive postpartum exam": {
    name: "Full check-up after the birth",
    checks: "A full body check, a talk about family planning, and moving your care to your local clinic.",
  },
  "neonatal bilirubin & hydration": {
    name: "Baby's skin colour and feeding check",
    checks: "Whether your baby's skin or eyes look yellow, and whether your baby is drinking enough.",
  },
  "well-baby weight check": {
    name: "Baby's weight check",
    checks: "Whether your baby is back to their birth weight, how the cord is healing, and how your baby feeds.",
  },
  "newborn metabolic & development": {
    name: "Baby's blood test and growth check",
    checks: "The result of your baby's heel blood test, and how your baby moves and responds.",
  },
  "neonatal transition": {
    name: "Baby's one-month check",
    checks: "Moving your baby's care to your local clinic, and planning your baby's vaccines.",
  },
};

const PLAIN_ROLES = {
  "community midwife / lactation consultant": "A midwife or a breastfeeding helper",
};

const FALLBACK_CHECKS = "Your care team checks how you and your baby are doing.";

const key = (text = "") =>
  String(text)
    .replace(/^Day \d+\s*/i, "")
    .trim()
    .toLowerCase();

/**
 * A visit as a family should see it: a plain name, what is checked, and who they will see.
 * Titles we have no plain words for keep their own name (without the day) and get a general line,
 * never the clinical focus.
 */
export const describeVisitForFamily = (task = {}) => {
  const plain = PLAIN_VISITS[key(task.title)];
  const ownName = String(task.title || "").replace(/^Day \d+\s*/i, "") || "Check-up";
  return {
    name: plain?.name || ownName,
    checks: plain?.checks || FALLBACK_CHECKS,
    who: task.targetRole ? PLAIN_ROLES[key(task.targetRole)] || task.targetRole : null,
  };
};

/** What the Listen button reads on the family's check-ups screen. */
export const getCheckUpsSummary = ({ next, nextLabel, nextDate, missed, navigatorName, total, done }) => {
  const parts = [];
  if (next) {
    const visit = describeVisitForFamily(next);
    parts.push(`${nextLabel} ${nextDate}: ${visit.name}. They will check: ${visit.checks}`);
    parts.push(
      missed
        ? `This visit was missed. ${navigatorName || "Your care navigator"} will call you to set a new time.`
        : "Your care team will come to you or tell you where to go.",
    );
  } else {
    parts.push("All check-ups are done.");
  }
  parts.push(`${done} of ${total} check-ups done.`);
  parts.push(EMERGENCY_LINE);
  return parts.join(" ");
};
