/**
 * NAVEXA HEALTH — STORAGE PERSISTENCE ADAPTER
 * Encapsulates browser storage with versioning, fallback, validation, and safe migrations.
 */

import { ReferralStatus, Role } from "../domain/enums.js";

const STORAGE_KEY = "navexa_domain_v6";
const OLD_STORAGE_KEYS = ["navexa_domain_v3", "navexa_domain_v4", "navexa_domain_v5"];
const ROLE_KEY = "navexa_role";
const CHECKLIST_KEY = "navexa_checklists";
const STORY_STEP_KEY = "navexa_story_step";
const ACTIVE_REFERRAL_KEY = "navexa_active_referral";
const ACTIVE_FACILITY_KEY = "navexa_active_facility";
const DEFAULT_ROLE = Role.COORDINATOR;

const isUsableReferral = (r) => Boolean(r?.id) && Object.values(ReferralStatus).includes(r.status);

// Keeps saved values only where they have the expected shape, and seeds the rest.
const mergeWithSeed = (parsed, seedData) => {
  const merged = { ...seedData };
  Object.keys(seedData).forEach((key) => {
    if (Array.isArray(parsed[key])) merged[key] = parsed[key];
  });
  return merged;
};

export const StorageAdapter = {
  loadData(seedData) {
    try {
      for (const key of OLD_STORAGE_KEYS) localStorage.removeItem(key);
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // One bad record must not cost the others.
        const usable = Array.isArray(parsed?.referrals) ? parsed.referrals.filter(isUsableReferral) : [];
        if (usable.length > 0) {
          return mergeWithSeed({ ...parsed, referrals: usable }, seedData);
        }
      }
    } catch (e) {
      console.warn("StorageAdapter: Failed to load cached data. Reverting to initial seed.", e);
    }
    // Return clean seed data if nothing valid in cache
    return seedData;
  },

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("StorageAdapter: Failed to write to localStorage.", e);
      return false;
    }
  },

  clearData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CHECKLIST_KEY);
      localStorage.removeItem(ACTIVE_REFERRAL_KEY);
      localStorage.removeItem(ACTIVE_FACILITY_KEY);
      return true;
    } catch (e) {
      console.error("StorageAdapter: Failed to clear storage.", e);
      return false;
    }
  },

  getChecklists() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHECKLIST_KEY));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  },

  saveChecklists(checklists) {
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklists));
    } catch (e) {
      console.warn("StorageAdapter: Failed to save checklist.", e);
    }
  },

  // Per tab and per visit, so a demo left open does not reappear next time.
  getStoryStep() {
    try {
      const stored = sessionStorage.getItem(STORY_STEP_KEY);
      const step = stored === null ? NaN : Number(stored);
      return Number.isInteger(step) && step >= 0 ? step : null;
    } catch {
      return null;
    }
  },

  setStoryStep(step) {
    try {
      if (step === null) sessionStorage.removeItem(STORY_STEP_KEY);
      else sessionStorage.setItem(STORY_STEP_KEY, String(step));
    } catch (e) {
      console.warn("StorageAdapter: Failed to save demo step.", e);
    }
  },

  getActiveReferralId() {
    try {
      return localStorage.getItem(ACTIVE_REFERRAL_KEY);
    } catch {
      return null;
    }
  },

  setActiveReferralId(id) {
    try {
      localStorage.setItem(ACTIVE_REFERRAL_KEY, id);
    } catch (e) {
      console.warn("StorageAdapter: Failed to save active referral.", e);
    }
  },

  getActiveFacilityId() {
    try {
      return localStorage.getItem(ACTIVE_FACILITY_KEY);
    } catch {
      return null;
    }
  },

  setActiveFacilityId(id) {
    try {
      localStorage.setItem(ACTIVE_FACILITY_KEY, id);
    } catch (e) {
      console.warn("StorageAdapter: Failed to save active hospital.", e);
    }
  },

  getRole() {
    try {
      const stored = localStorage.getItem(ROLE_KEY);
      return Object.values(Role).includes(stored) ? stored : DEFAULT_ROLE;
    } catch {
      return DEFAULT_ROLE;
    }
  },

  setRole(role) {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch (e) {
      console.warn("StorageAdapter: Failed to set role.", e);
    }
  },
};
