/**
 * NAVEXA HEALTH — PHONE LINKS
 * Contact fields can hold a name as well as a number ("Tariq (Spouse) - +91 90000 29014").
 */

const PHONE_NUMBER = /\+?\d[\d\s-]{5,}\d/;

/** A tel: link for the number in a contact field, or null if it holds no number. */
export const telHref = (contact) => {
  const number = contact?.match(PHONE_NUMBER)?.[0];
  return number ? `tel:${number.replace(/[\s-]/g, "")}` : null;
};
