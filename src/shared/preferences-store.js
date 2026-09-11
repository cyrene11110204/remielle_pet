(function attachPreferencesStore(globalObject, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) module.exports = exported;
  if (globalObject) globalObject.RemiellePreferences = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPreferencesModule() {
  "use strict";

  const DEFAULT_PREFERENCES = Object.freeze({
    petScale: 100,
    bubbleScale: 100,
    gazeTracking: true,
    showCreation: true,
    showLight: true,
    showHide: true
  });

  function normalizeScale(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_PREFERENCES.petScale;
    return Math.min(130, Math.max(70, Math.round(numeric / 5) * 5));
  }

  function normalizePreferences(value) {
    const candidate = value && typeof value === "object" ? value : {};
    return {
      petScale: normalizeScale(candidate.petScale),
      bubbleScale: normalizeScale(candidate.bubbleScale),
      gazeTracking: candidate.gazeTracking !== false,
      showCreation: candidate.showCreation !== false,
      showLight: candidate.showLight !== false,
      showHide: candidate.showHide !== false
    };
  }

  class PreferencesStore {
    constructor(storage, key = "remielle.preferences.v2") {
      if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
        throw new TypeError("PreferencesStore requires a storage-like object");
      }
      this.storage = storage;
      this.key = key;
      this.preferences = this.load();
    }

    load() {
      try {
        return normalizePreferences(JSON.parse(this.storage.getItem(this.key) || "null"));
      } catch {
        return { ...DEFAULT_PREFERENCES };
      }
    }

    get() {
      return { ...this.preferences };
    }

    set(patch) {
      this.preferences = normalizePreferences({ ...this.preferences, ...patch });
      this.storage.setItem(this.key, JSON.stringify(this.preferences));
      return this.get();
    }
  }

  return { PreferencesStore, DEFAULT_PREFERENCES, normalizePreferences };
});
