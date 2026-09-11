const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PreferencesStore,
  DEFAULT_PREFERENCES,
  normalizePreferences
} = require("../src/shared/preferences-store.js");

class MemoryStorage {
  constructor(value = null) {
    this.value = value;
  }

  getItem() {
    return this.value;
  }

  setItem(_key, value) {
    this.value = String(value);
  }
}

test("preferences use release2 defaults and persist user choices", () => {
  const storage = new MemoryStorage();
  const store = new PreferencesStore(storage, "test-preferences");

  assert.deepEqual(store.get(), DEFAULT_PREFERENCES);
  store.set({
    petScale: 125,
    bubbleScale: 85,
    gazeTracking: false,
    showCreation: false
  });

  const restored = new PreferencesStore(storage, "test-preferences");
  assert.deepEqual(restored.get(), {
    petScale: 125,
    bubbleScale: 85,
    gazeTracking: false,
    showCreation: false,
    showLight: true,
    showHide: true
  });
});

test("preferences clamp size and recover malformed values", () => {
  assert.equal(normalizePreferences({ petScale: 12 }).petScale, 70);
  assert.equal(normalizePreferences({ petScale: 500 }).petScale, 130);
  assert.equal(normalizePreferences({ petScale: 103 }).petScale, 105);
  assert.equal(normalizePreferences({ bubbleScale: 64 }).bubbleScale, 70);
  assert.equal(normalizePreferences({ bubbleScale: 118 }).bubbleScale, 120);

  const broken = new PreferencesStore(new MemoryStorage("not-json"), "broken");
  assert.deepEqual(broken.get(), DEFAULT_PREFERENCES);
});
