(function attachTodoStore(globalObject, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) module.exports = exported;
  if (globalObject) globalObject.RemielleTodo = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTodoStoreModule() {
  "use strict";

  const STORAGE_KEY = "remielle.todo-items.v1";
  const MAX_TEXT_LENGTH = 80;

  function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeItem(item) {
    if (!item || typeof item !== "object") return null;
    const text = String(item.text ?? "").trim().slice(0, MAX_TEXT_LENGTH);
    if (!text) return null;

    return {
      id: typeof item.id === "string" && item.id ? item.id : createId(),
      text,
      completed: Boolean(item.completed),
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
    };
  }

  class TodoStore {
    constructor(storage, key = STORAGE_KEY) {
      this.storage = storage;
      this.key = key;
      this.items = this.read();
    }

    read() {
      try {
        const value = this.storage?.getItem(this.key);
        if (!value) return [];
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeItem).filter(Boolean).slice(0, 100);
      } catch {
        return [];
      }
    }

    persist() {
      this.storage?.setItem(this.key, JSON.stringify(this.items));
    }

    list() {
      return this.items.map((item) => ({ ...item }));
    }

    add(text) {
      const normalizedText = String(text ?? "").trim().slice(0, MAX_TEXT_LENGTH);
      if (!normalizedText) throw new Error("待办内容不能为空");

      const item = {
        id: createId(),
        text: normalizedText,
        completed: false,
        createdAt: Date.now()
      };
      this.items.unshift(item);
      this.persist();
      return { ...item };
    }

    toggle(id) {
      const item = this.items.find((candidate) => candidate.id === id);
      if (!item) return null;
      item.completed = !item.completed;
      this.persist();
      return { ...item };
    }

    remove(id) {
      const previousLength = this.items.length;
      this.items = this.items.filter((item) => item.id !== id);
      if (this.items.length === previousLength) return false;
      this.persist();
      return true;
    }

    clearCompleted() {
      const previousLength = this.items.length;
      this.items = this.items.filter((item) => !item.completed);
      const removedCount = previousLength - this.items.length;
      if (removedCount > 0) this.persist();
      return removedCount;
    }

    remainingCount() {
      return this.items.filter((item) => !item.completed).length;
    }
  }

  return { TodoStore, STORAGE_KEY, MAX_TEXT_LENGTH };
});
