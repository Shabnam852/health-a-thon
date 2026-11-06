/**
 * Made-up accounts for the demo. Nobody here is real.
 *
 * When Navexa signs in through Mythic, these become Mythic users: staff through its OAuth login,
 * patients and family through its patient-portal phone login. Until then they live here, so the
 * screens can be built against the same shapes.
 */

import { RoleId } from "../../config/navigationConfig.js";
import { referralIdsForPhone } from "../../domain/phoneAccounts.js";

/** Every staff account uses this password in the demo. Shown on the sign-in screen. */
export const DEMO_PASSWORD = "demo1234";

export const staffAccounts = [
  {
    id: "STAFF-PRIYA",
    email: "priya@navexa.demo",
    name: "Priya Raman",
    jobTitle: "Care coordinator",
    role: RoleId.COORDINATOR,
  },
  {
    id: "STAFF-KAVYA",
    email: "kavya@sanjeevani.demo",
    name: "Dr Kavya Menon",
    jobTitle: "Neonatologist",
    role: RoleId.FACILITY,
    facilityId: "FAC-SANJEEVANI",
    // Healthcare Professionals Registry ID. Made up; ABDM puts it on every request for records.
    hprId: "71-4410-2290-5583",
  },
  {
    id: "STAFF-LATA",
    email: "lata@ashakiran.demo",
    name: "Lata Shetty",
    jobTitle: "Staff nurse",
    role: RoleId.FACILITY,
    facilityId: "FAC-ASHA-KIRAN",
    hprId: "71-8823-0047-1196",
  },
];

/**
 * People who sign in with a phone code. A family member sees the same screens as the patient,
 * for the patient they are linked to.
 */
export const phoneAccounts = [
  {
    id: "PT-SHALINI",
    phone: "9845011223",
    name: "Shalini Naidu",
    relation: "self",
    referralId: "NX-9042",
  },
  {
    id: "FAM-RAVI",
    phone: "9845011224",
    name: "Ravi Naidu",
    relation: "Husband",
    referralId: "NX-9042",
  },
  {
    id: "PT-ANANYA",
    phone: "9731100456",
    name: "Ananya Reddy",
    relation: "self",
    referralId: "REF-2024-8821",
  },
];

/** The account the guided demo and the "sign in as" menu use for each role. */
export const DEFAULT_ACCOUNT_FOR_ROLE = {
  [RoleId.COORDINATOR]: "STAFF-PRIYA",
  [RoleId.FACILITY]: "STAFF-KAVYA",
  [RoleId.PATIENT]: "PT-SHALINI",
};

/** Keeps only the digits of an Indian mobile number, without the +91 or a leading 0. */
export const normalisePhone = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const findStaffByEmail = (email) =>
  staffAccounts.find(
    (a) =>
      a.email ===
      String(email ?? "")
        .trim()
        .toLowerCase(),
  ) ?? null;

// Numbers linked to referrals made in the app (src/domain/phoneAccounts.js). They live with the
// referrals, so every device shares them; ReferralProvider hands the current list in here.
let linkedPhoneAccounts = [];

export const setLinkedPhoneAccounts = (accounts) => {
  linkedPhoneAccounts = Array.isArray(accounts) ? accounts : [];
};

/** Linked numbers first: a number on a newer referral signs in to that one. */
export const allPhoneAccounts = () => {
  const linkedPhones = new Set(linkedPhoneAccounts.map((a) => a.phone));
  return [...linkedPhoneAccounts, ...phoneAccounts.filter((a) => !linkedPhones.has(a.phone))];
};

export const findPhoneAccount = (phone) => allPhoneAccounts().find((a) => a.phone === normalisePhone(phone)) ?? null;

// By id over every account, including a seeded one whose number now also follows a newer referral.
export const findAccountById = (id) =>
  staffAccounts.find((a) => a.id === id) ??
  linkedPhoneAccounts.find((a) => a.id === id) ??
  phoneAccounts.find((a) => a.id === id) ??
  null;

/** Every referral a number follows (FR-80: a mother's and her newborn's), newest first. */
export const referralsForPhone = (phone) =>
  referralIdsForPhone([...linkedPhoneAccounts, ...phoneAccounts], normalisePhone(phone));
