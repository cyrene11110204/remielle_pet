const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AnimationStateMachine,
  ANIMATIONS
} = require("../src/shared/animation-state-machine-v2.js");

function createHarness() {
  const calls = [];
  const driver = {
    play(name, options = {}) {
      calls.push({ name, ...options });
      return {};
    },
    clearTrack(track) {
      calls.push({ clearTrack: track });
    }
  };
  return { calls, machine: new AnimationStateMachine(driver) };
}

test("new todos alternate creation and thinking responses", () => {
  const harness = createHarness();

  assert.equal(harness.machine.acknowledgeTodo(), "creation");
  harness.calls.at(-1).onComplete();
  harness.calls.at(-1).onComplete();

  assert.equal(harness.machine.acknowledgeTodo(), "thinking");
  harness.calls.at(-1).onComplete();

  assert.deepEqual(
    harness.calls.map(({ name }) => name),
    [
      ANIMATIONS.READY_TO_CREATE,
      ANIMATIONS.CREATING,
      ANIMATIONS.THINKING,
      ANIMATIONS.LOOK_UP_THINKING,
      ANIMATIONS.THINKING
    ]
  );
});

test("todo completion plays win, happy, then returns to base", () => {
  const harness = createHarness();
  harness.machine.celebrate();
  harness.calls.at(-1).onComplete();
  harness.calls.at(-1).onComplete();

  assert.deepEqual(
    harness.calls.map(({ name }) => name),
    [
      ANIMATIONS.CREATION_COMPLETE,
      ANIMATIONS.HAPPY_WITH_NOTEBOOK,
      ANIMATIONS.THINKING
    ]
  );
});

test("typing uses thinking pose without affecting persistent mode", () => {
  const harness = createHarness();
  harness.machine.inputFocus();
  harness.machine.inputBlur();

  assert.deepEqual(
    harness.calls.map(({ name }) => name),
    [ANIMATIONS.LOOK_UP_THINKING, ANIMATIONS.THINKING]
  );
});
