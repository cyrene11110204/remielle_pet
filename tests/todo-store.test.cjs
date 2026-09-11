const test = require("node:test");
const assert = require("node:assert/strict");
const { TodoStore } = require("../src/shared/todo-store.js");

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test("TodoStore adds, toggles, removes, and persists items", () => {
  const storage = new MemoryStorage();
  const store = new TodoStore(storage, "test-todos");
  const first = store.add("  写 README  ");
  const second = store.add("测试桌宠");

  assert.equal(store.remainingCount(), 2);
  assert.equal(store.list()[0].id, second.id);
  assert.equal(store.list()[1].text, "写 README");

  assert.equal(store.toggle(first.id).completed, true);
  assert.equal(store.remainingCount(), 1);

  const restored = new TodoStore(storage, "test-todos");
  assert.equal(restored.list().length, 2);
  assert.equal(restored.list().find((item) => item.id === first.id).completed, true);

  assert.equal(restored.remove(second.id), true);
  assert.equal(restored.clearCompleted(), 1);
  assert.deepEqual(restored.list(), []);
});

test("TodoStore rejects blank items and recovers from corrupt storage", () => {
  const storage = new MemoryStorage({ broken: "not-json" });
  const store = new TodoStore(storage, "broken");

  assert.deepEqual(store.list(), []);
  assert.throws(() => store.add("   "), /不能为空/);
});

test("TodoStore limits content to 80 characters", () => {
  const store = new TodoStore(new MemoryStorage(), "test-todos");
  const item = store.add("蕾".repeat(120));
  assert.equal(item.text.length, 80);
});
