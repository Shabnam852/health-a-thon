/**
 * NAVEXA HEALTH — PHONE LINKS
 * Contact fields can hold a name as well as a number ("Tariq (Spouse) - +91 90000 29014").
 */

const PHONE_NUMBER = /\+?\d[\d\s-]{5,}\d/;

/** The phone number in a contact field, as written, or null if it holds none. */
export const phoneNumberIn = (contact) => contact?.match(PHONE_NUMBER)?.[0] || null;

/** A tel: link for the number in a contact field, or null if it holds no number. */
export const telHref = (contact) => {
  const number = phoneNumberIn(contact);
  return number ? `tel:${number.replace(/[\s-]/g, "")}` : null;
};
