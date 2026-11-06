/**
 * Phone sign-in for patients and families on referrals made in the app. When a hospital sends a
 * referral, the patient's mobile and the emergency contact's mobile can sign in with a code and
 * see that referral. Kept with the referrals, so every device in the demo knows them.
 */

import { PatientType } from "./enums.js";

/** Keeps only the digits of an Indian mobile number, without the +91 or a leading 0. */
export const normaliseMobile = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const isIndianMobile = (digits) => /^[6-9]\d{9}$/.test(digits);

/** The accounts a new referral brings: its patient's mobile and its emergency contact's mobile. */
export const accountsForReferral = (referral) => {
  const accounts = [];
  const patientPhone = normaliseMobile(referral.patientPhone);
  const familyPhone = normaliseMobile(referral.caregiverContact);
  const isChild = referral.referralType === PatientType.CHILD;
  if (isIndianMobile(patientPhone)) {
    accounts.push({
      id: `PH-${referral.id}-P`,
      phone: patientPhone,
      // A newborn has no phone: the number on a child's referral is a parent's.
      name: isChild ? referral.caregiverName || "Parent" : referral.patientName,
      relation: isChild ? "Parent" : "self",
      referralId: referral.id,
    });
  }
  if (isIndianMobile(familyPhone) && familyPhone !== patientPhone) {
    accounts.push({
      id: `PH-${referral.id}-F`,
      phone: familyPhone,
      name: referral.caregiverName || "Family member",
      relation: "Family",
      referralId: referral.id,
    });
  }
  return accounts;
};

/** Adds new accounts. A number already linked moves to the newest referral. */
export const linkAccounts = (existing, added) => {
  const phones = new Set(added.map((a) => a.phone));
  return [...added, ...(existing ?? []).filter((a) => !phones.has(a.phone))];
};
