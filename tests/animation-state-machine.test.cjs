const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AnimationStateMachine,
  ANIMATIONS
} = require("../src/shared/animation-state-machine.js");

function createHarness() {
  const calls = [];
  const timers = new Map();
  let timerId = 0;

  const driver = {
    play(name, options = {}) {
      calls.push({ name, ...options });
      return {};
    },
    clearTrack(track) {
      calls.push({ clearTrack: track });
    }
  };

  const machine = new AnimationStateMachine(driver, {
    longHoverDelay: 10,
    setTimer(callback) {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimer(id) {
      timers.delete(id);
    }
  });

  return {
    calls,
    machine,
    runTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    }
  };
}

test("idle hover changes from thinking to looking up and then cute", () => {
  const harness = createHarness();
  harness.machine.start();
  harness.machine.pointerEnter();
  harness.runTimers();
  harness.machine.pointerLeave();

  assert.deepEqual(
    harness.calls.map(({ name }) => name),
    [
      ANIMATIONS.THINKING,
      ANIMATIONS.LOOK_UP_THINKING,
      ANIMATIONS.CUTE_LOOK_UP,
      ANIMATIONS.THINKING
    ]
  );
});

test("creation plays preparation, creation loop, completion, and celebration", () => {
  const harness = createHarness();
  harness.machine.startCreating();
  harness.calls.at(-1).onComplete();
  harness.machine.finishCreating();
  harness.calls.at(-1).onComplete();
  harness.calls.at(-1).onComplete();

  assert.deepEqual(
    harness.calls.map(({ name }) => name),
    [
      ANIMATIONS.READY_TO_CREATE,
      ANIMATIONS.CREATING,
      ANIMATIONS.CREATION_COMPLETE,
      ANIMATIONS.HAPPY_WITH_NOTEBOOK,
      ANIMATIONS.THINKING
    ]
  );
});

test("completing a todo celebrates then returns to the hovered base pose", () => {
  const harness = createHarness();
  harness.machine.pointerEnter();
  harness.machine.celebrate();
  harness.calls.at(-1).onComplete();

  assert.deepEqual(
    harness.calls.map(({ name }) => name),
    [
      ANIMATIONS.LOOK_UP_THINKING,
      ANIMATIONS.HAPPY_WITH_NOTEBOOK,
      ANIMATIONS.LOOK_UP_THINKING
    ]
  );
});

test("light uses overlay track and clears it when switched off", () => {
  const harness = createHarness();
  harness.machine.setLight(true);
  harness.machine.setLight(false);

  assert.equal(harness.calls[0].name, ANIMATIONS.LIGHT_ON);
  assert.equal(harness.calls[0].track, 1);
  assert.deepEqual(harness.calls[1], { clearTrack: 1 });
});
