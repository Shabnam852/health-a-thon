// Small helpers that make the new-referral form quicker to fill.

// "128 82", "128-82", "128,82" or "128.82" becomes "128/82". Anything else is left as typed.
// The dot is what a phone's number pad offers: an iPhone's has no slash, space or dash.
export const formatBp = (value) => {
  const match = value.trim().match(/^(\d{2,3})\s*[\s,.\-/\\]\s*(\d{2,3})$/);
  return match ? `${match[1]}/${match[2]}` : value;
};

// Adds a common reason to the note once, as its own sentence.
export const addReason = (note, reason) => {
  const trimmed = note.trim();
  if (trimmed.toLowerCase().includes(reason.toLowerCase())) return note;
  if (!trimmed) return reason;
  return `${trimmed.replace(/[.\s]*$/, "")}. ${reason}`;
};

// A draft from the AI, flattened to the form's keys: form fields, patientType, the two yes/no
// checkboxes and each vital sign as "vital:bp". Empty values are left out.
export const flattenDraft = (draft) => {
  const flat = {};
  for (const [key, value] of Object.entries(draft)) {
    if (["vitals", "unclear", "evidence", "unsourced"].includes(key)) continue;
    if (typeof value === "string" && value) flat[key] = value;
  }
  for (const [key, value] of Object.entries(draft.vitals || {})) if (value) flat[`vital:${key}`] = value;
  return flat;
};

/**
 * Folds a new AI draft into a form the clinician may already have typed into, so a fill never
 * overwrites their work:
 * - a field they typed or changed keeps their value; if the AI read something else, it becomes
 *   a suggestion they can take or leave
 * - any other field takes the AI's value
 * - a field the AI filled before keeps that value if this draft has nothing for it
 * - a sample value the AI has nothing for is cleared, so no made-up patient is left behind
 *
 * Every fill sends all the sources there are, so an earlier AI value that this draft has nothing
 * for may have come from a source since removed. It is kept, and listed in `stale` for a check.
 *
 * Returns { values: the keys to change, original: what the AI wrote in each field it now
 * owns, suggestions: AI values for fields the clinician owns, stale: kept AI values that no
 * source gave this time }.
 */
export const mergeDraft = ({ current, draft, userKeys, aiOriginal = {}, sampleKeys = [] }) => {
  const incoming = flattenDraft(draft);
  const values = {};
  const original = { ...aiOriginal };
  const suggestions = {};
  const stale = [];
  const keys = new Set([...Object.keys(incoming), ...sampleKeys, ...Object.keys(aiOriginal)]);
  for (const key of keys) {
    const next = incoming[key];
    if (userKeys.has(key)) {
      if (next && next !== (current[key] ?? "")) suggestions[key] = next;
    } else if (next) {
      values[key] = next;
      original[key] = next;
    } else if (key in aiOriginal) {
      stale.push(key);
    } else if (sampleKeys.includes(key)) {
      values[key] = "";
    }
  }
  return { values, original, suggestions, stale };
};
