/**
 * NAVEXA HEALTH — STORAGE PERSISTENCE ADAPTER
 * Encapsulates browser storage with versioning, fallback, validation, and safe migrations.
 */

const STORAGE_KEY = "navexa_domain_v3";
const ROLE_KEY = "navexa_role";

export const StorageAdapter = {
  loadData(seedData) {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed && Array.isArray(parsed.referrals) && parsed.referrals.length > 0) {
          return parsed;
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
      return true;
    } catch (e) {
      console.error("StorageAdapter: Failed to clear storage.", e);
      return false;
    }
  },

  getRole() {
    try {
      return localStorage.getItem(ROLE_KEY) || "coordinator";
    } catch {
      return "coordinator";
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

