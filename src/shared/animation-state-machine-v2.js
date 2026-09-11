(function attachAnimationStateMachine(globalObject, factory) {
  const exported = factory();
  if (typeof module === "object" && module.exports) module.exports = exported;
  if (globalObject) globalObject.RemielleAnimationV2 = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAnimationModule() {
  "use strict";

  const ANIMATIONS = Object.freeze({
    THINKING: "a",
    READY_TO_CREATE: "a_win",
    LOOK_UP_THINKING: "b",
    HAPPY_WITH_NOTEBOOK: "c",
    CREATING: "d",
    CREATION_COMPLETE: "d_win",
    CUTE_LOOK_UP: "e",
    LIGHT_ON: "light"
  });

  class AnimationStateMachine {
    constructor(driver, options = {}) {
      if (!driver || typeof driver.play !== "function") {
        throw new TypeError("AnimationStateMachine requires a play driver");
      }

      this.driver = driver;
      this.longHoverDelay = options.longHoverDelay ?? 3600;
      this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
      this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
      this.mode = "idle";
      this.feedbackActive = false;
      this.hovered = false;
      this.lightOn = false;
      this.hoverTimer = null;
      this.todoResponseIndex = 0;
      this.transitionToken = 0;
    }

    start() {
      this.playBaseLoop();
    }

    pointerEnter() {
      this.hovered = true;
      this.cancelHoverTimer();
      if (this.mode !== "idle" || this.feedbackActive) return;

      this.invalidateTransitions();
      this.driver.play(ANIMATIONS.LOOK_UP_THINKING, { loop: true });
      this.hoverTimer = this.setTimer(() => {
        this.hoverTimer = null;
        if (this.hovered && this.mode === "idle" && !this.feedbackActive) {
          this.driver.play(ANIMATIONS.CUTE_LOOK_UP, { loop: true });
        }
      }, this.longHoverDelay);
    }

    pointerLeave() {
      this.hovered = false;
      this.cancelHoverTimer();
      if (this.mode !== "idle" || this.feedbackActive) return;
      this.invalidateTransitions();
      this.driver.play(ANIMATIONS.THINKING, { loop: true });
    }

    inputFocus() {
      this.inputFocused = true;
      this.cancelHoverTimer();
      if (this.mode !== "idle" || this.feedbackActive) return;
      this.invalidateTransitions();
      this.driver.play(ANIMATIONS.LOOK_UP_THINKING, { loop: true });
    }

    inputBlur() {
      this.inputFocused = false;
      if (this.mode !== "idle" || this.feedbackActive) return;
      this.invalidateTransitions();
      this.playBaseLoop();
    }

    acknowledgeTodo() {
      const useCreationResponse = this.todoResponseIndex % 2 === 0;
      this.todoResponseIndex += 1;
      this.feedbackActive = true;
      this.cancelHoverTimer();
      const token = this.invalidateTransitions();

      const finish = () => {
        if (token !== this.transitionToken) return;
        this.feedbackActive = false;
        this.playBaseLoop();
      };

      if (useCreationResponse) {
        this.driver.play(ANIMATIONS.READY_TO_CREATE, {
          loop: false,
          onComplete: () => {
            if (token !== this.transitionToken) return;
            this.driver.play(ANIMATIONS.CREATING, {
              loop: false,
              onComplete: finish
            });
          }
        });
        return "creation";
      }

      this.driver.play(ANIMATIONS.LOOK_UP_THINKING, {
        loop: false,
        onComplete: finish
      });
      return "thinking";
    }

    celebrate() {
      this.feedbackActive = true;
      this.cancelHoverTimer();
      const token = this.invalidateTransitions();
      this.driver.play(ANIMATIONS.CREATION_COMPLETE, {
        loop: false,
        onComplete: () => {
          if (token !== this.transitionToken) return;
          this.driver.play(ANIMATIONS.HAPPY_WITH_NOTEBOOK, {
            loop: false,
            onComplete: () => {
              if (token !== this.transitionToken) return;
              this.feedbackActive = false;
              this.playBaseLoop();
            }
          });
        }
      });
    }

    startCreating() {
      if (this.mode === "creating") return;
      this.mode = "creating";
      this.feedbackActive = false;
      this.cancelHoverTimer();
      const token = this.invalidateTransitions();
      this.driver.play(ANIMATIONS.READY_TO_CREATE, {
        loop: false,
        onComplete: () => {
          if (token !== this.transitionToken || this.mode !== "creating") return;
          this.driver.play(ANIMATIONS.CREATING, { loop: true });
        }
      });
    }

    finishCreating() {
      if (this.mode !== "creating") return;
      this.mode = "idle";
      this.feedbackActive = true;
      const token = this.invalidateTransitions();
      this.driver.play(ANIMATIONS.CREATION_COMPLETE, {
        loop: false,
        onComplete: () => {
          if (token !== this.transitionToken) return;
          this.driver.play(ANIMATIONS.HAPPY_WITH_NOTEBOOK, {
            loop: false,
            onComplete: () => {
              if (token !== this.transitionToken) return;
              this.feedbackActive = false;
              this.playBaseLoop();
            }
          });
        }
      });
    }

    setLight(enabled) {
      this.lightOn = Boolean(enabled);
      if (this.lightOn) {
        this.driver.play(ANIMATIONS.LIGHT_ON, { loop: false, track: 1 });
      } else if (typeof this.driver.clearTrack === "function") {
        this.driver.clearTrack(1);
      }
    }

    playBaseLoop() {
      if (this.mode === "creating") {
        this.driver.play(ANIMATIONS.CREATING, { loop: true });
      } else {
        this.driver.play(
          (this.hovered || this.inputFocused) ? ANIMATIONS.LOOK_UP_THINKING : ANIMATIONS.THINKING,
          { loop: true }
        );
      }
    }

    invalidateTransitions() {
      this.transitionToken += 1;
      return this.transitionToken;
    }

    cancelHoverTimer() {
      if (this.hoverTimer !== null) {
        this.clearTimer(this.hoverTimer);
        this.hoverTimer = null;
      }
    }

    destroy() {
      this.feedbackActive = false;
      this.cancelHoverTimer();
      this.invalidateTransitions();
    }
  }

  return { AnimationStateMachine, ANIMATIONS };
});
