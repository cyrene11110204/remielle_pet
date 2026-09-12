(function initializeRemiellePetRelease2() {
  "use strict";

  const { TodoStore } = window.RemielleTodo;
  const { PreferencesStore, DEFAULT_PREFERENCES } = window.RemiellePreferences;
  const { AnimationStateMachine } = window.RemielleAnimationV2;
  const desktop = window.remielleDesktop;

  const animationMessages = {
    a: "正在思考",
    a_win: "拿好笔，准备开始",
    b: "抬头想一想",
    c: "看着本子很开心",
    d: "正在专心创作",
    d_win: "创作完成啦",
    e: "想要一点鼓励"
  };

  const gazeStrength = {
    a: 0.72,
    a_win: 0.35,
    b: 0.52,
    c: 0.08,
    d: 0,
    d_win: 0.04,
    e: 0.54
  };
  const GAZE_OFFSET_X = 9;
  const GAZE_OFFSET_Y = 6;

  const elements = {
    bubble: document.querySelector(".todo-bubble"),
    bubbleSize: document.querySelector("#bubble-size"),
    bubbleSizeOutput: document.querySelector("#bubble-size-output"),
    bubbleHeader: document.querySelector(".bubble-header"),
    clearCompleted: document.querySelector("#clear-completed"),
    confettiLayer: document.querySelector("#confetti-layer"),
    creationButton: document.querySelector("#creation-button"),
    creationButtonLabel: document.querySelector("#creation-button .button-label"),
    emptyState: document.querySelector("#empty-state"),
    fallbackImage: document.querySelector("#fallback-image"),
    footer: document.querySelector(".bubble-footer"),
    form: document.querySelector("#todo-form"),
    gazeTracking: document.querySelector("#gaze-tracking"),
    hideButton: document.querySelector("#hide-button"),
    input: document.querySelector("#todo-input"),
    inputEffects: document.querySelector("#input-effects"),
    lightButton: document.querySelector("#light-button"),
    message: document.querySelector("#pet-message"),
    petSize: document.querySelector("#pet-size"),
    petSizeOutput: document.querySelector("#pet-size-output"),
    petStage: document.querySelector("#pet-stage"),
    petToolbar: document.querySelector("#pet-toolbar"),
    pinButton: document.querySelector("#pin-button"),
    player: document.querySelector("#spine-player"),
    resetSettings: document.querySelector("#reset-settings"),
    settingsButton: document.querySelector("#settings-button"),
    settingsClose: document.querySelector("#settings-close"),
    settingsPanel: document.querySelector("#settings-panel"),
    showCreation: document.querySelector("#show-creation"),
    showHide: document.querySelector("#show-hide"),
    showLight: document.querySelector("#show-light"),
    todoContent: document.querySelector(".todo-content"),
    todoCount: document.querySelector("#todo-count"),
    todoList: document.querySelector("#todo-list"),
    toast: document.querySelector("#toast")
  };

  const todoStore = new TodoStore(window.localStorage);
  const preferencesStore = new PreferencesStore(window.localStorage);
  let preferences = preferencesStore.get();
  let animationMachine = null;
  let spinePlayer = null;
  let creating = false;
  let lightOn = false;
  let toastTimer = null;
  let lastCharmAt = 0;
  let passthrough = null;
  let petPointerInside = false;
  let removeCursorListener = null;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function createGazeController(stage) {
    const state = {
      enabled: true,
      animation: "a",
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      bones: null
    };

    function resolveBones(player) {
      if (state.bones || !player.skeleton) return;
      const right = player.skeleton.findBone("眼_瞳孔_微动");
      const left = player.skeleton.findBone("眼_瞳孔L_微动");
      state.bones = right && left ? [right, left] : [];
    }

    return {
      setEnabled(enabled) {
        state.enabled = Boolean(enabled);
        if (!state.enabled) {
          state.targetX = 0;
          state.targetY = 0;
        }
      },
      setAnimation(name) {
        state.animation = name;
      },
      setCursor(cursor) {
        if (!state.enabled || !cursor || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) {
          return;
        }
        const rect = stage.getBoundingClientRect();
        const faceCenterX = rect.left + rect.width * 0.5;
        const faceCenterY = rect.top + rect.height * 0.39;
        state.targetX = clamp((cursor.x - faceCenterX) / (rect.width * 0.72), -1, 1);
        state.targetY = clamp((cursor.y - faceCenterY) / (rect.height * 0.58), -1, 1);
      },
      apply(player, delta) {
        if (!player.skeleton) return;
        resolveBones(player);

        const safeDelta = clamp(Number(delta) || 0.016, 0.001, 0.1);
        const response = 1 - Math.exp(-safeDelta * 10);
        const strength = gazeStrength[state.animation] ?? 0.45;
        const wantedX = state.enabled ? state.targetX * strength : 0;
        const wantedY = state.enabled ? state.targetY * strength : 0;
        state.currentX += (wantedX - state.currentX) * response;
        state.currentY += (wantedY - state.currentY) * response;

        for (const bone of state.bones || []) {
          bone.x = bone.data.x + state.currentX * GAZE_OFFSET_X;
          bone.y = bone.data.y - state.currentY * GAZE_OFFSET_Y;
        }

        const physicsUpdate = window.spine.Physics?.update ?? 2;
        player.skeleton.updateWorldTransform(physicsUpdate);
      }
    };
  }

  const gazeController = createGazeController(elements.petStage);

  function setMessage(message) {
    elements.message.textContent = message;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 1900);
  }

  function spawnTypingCharm() {
    const now = performance.now();
    if (!elements.input.value || now - lastCharmAt < 115) return;
    lastCharmAt = now;

    while (elements.inputEffects.childElementCount >= 8) {
      elements.inputEffects.firstElementChild?.remove();
    }

    const symbols = ["？", "？", "✦", "♡", "💭", "✎"];
    const colors = ["#e65f9d", "#a486df", "#d86ca6", "#8b74cc", "#ef80b3"];
    const charm = document.createElement("span");
    charm.className = "typing-charm";
    charm.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    charm.style.setProperty("--charm-x", String(34 + Math.random() * 300) + "px");
    charm.style.setProperty("--charm-drift", String(-18 + Math.random() * 36) + "px");
    charm.style.setProperty("--charm-size", String(12 + Math.random() * 8) + "px");
    charm.style.setProperty("--charm-color", colors[Math.floor(Math.random() * colors.length)]);
    charm.addEventListener("animationend", () => charm.remove(), { once: true });
    elements.inputEffects.append(charm);
  }

  function launchConfetti() {
    const colors = ["#ff77ad", "#ffc1dc", "#ae8ce9", "#d8c4ff", "#ffe27c", "#ffffff"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 42; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--confetti-x", String(8 + Math.random() * 84) + "%");
      piece.style.setProperty("--confetti-width", String(5 + Math.random() * 5) + "px");
      piece.style.setProperty("--confetti-height", String(7 + Math.random() * 8) + "px");
      piece.style.setProperty("--confetti-color", colors[index % colors.length]);
      piece.style.setProperty("--confetti-drift", String(-80 + Math.random() * 160) + "px");
      piece.style.setProperty("--confetti-spin", String(240 + Math.random() * 620) + "deg");
      piece.style.setProperty("--confetti-duration", String(1050 + Math.random() * 650) + "ms");
      piece.style.setProperty("--confetti-delay", String(Math.random() * 180) + "ms");
      piece.addEventListener("animationend", () => piece.remove(), { once: true });
      fragment.append(piece);
    }

    elements.confettiLayer.append(fragment);
    setTimeout(() => {
      while (elements.confettiLayer.childElementCount > 60) {
        elements.confettiLayer.firstElementChild?.remove();
      }
    }, 1900);
  }

  function createTodoElement(item) {
    const listItem = document.createElement("li");
    listItem.className = "todo-item" + (item.completed ? " completed" : "");
    listItem.dataset.id = item.id;

    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = "todo-check";
    checkButton.dataset.action = "toggle";
    checkButton.setAttribute("aria-label", item.completed ? "标记为未完成" : "标记为已完成");
    checkButton.setAttribute("aria-pressed", String(item.completed));
    checkButton.textContent = "✓";

    const text = document.createElement("span");
    text.className = "todo-text";
    text.title = item.text;
    text.textContent = item.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "todo-delete";
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", "删除待办：" + item.text);
    deleteButton.textContent = "×";

    listItem.append(checkButton, text, deleteButton);
    return listItem;
  }

  function renderTodos() {
    const items = todoStore.list();
    elements.todoList.replaceChildren(...items.map(createTodoElement));
    elements.emptyState.hidden = items.length > 0;

    const remaining = todoStore.remainingCount();
    if (items.length === 0) elements.todoCount.textContent = "还没有待办";
    else if (remaining === 0) elements.todoCount.textContent = "今天的清单完成啦";
    else elements.todoCount.textContent = "还有 " + String(remaining) + " 件待办";

    elements.clearCompleted.disabled = !items.some((item) => item.completed);
  }

  function setCreating(nextCreating) {
    creating = nextCreating;
    elements.creationButton.setAttribute("aria-pressed", String(creating));
    elements.creationButtonLabel.textContent = creating ? "完成创作" : "开始创作";
    if (creating) {
      animationMachine?.startCreating();
      showToast("蕾米拿好笔，开始创作啦");
    } else {
      animationMachine?.finishCreating();
      launchConfetti();
      showToast("完成！辛苦啦 ♡");
    }
  }

  function setLight(nextLightOn) {
    lightOn = nextLightOn;
    elements.lightButton.setAttribute("aria-pressed", String(lightOn));
    elements.lightButton.title = lightOn ? "关灯" : "开灯";
    elements.petStage.classList.toggle("is-lit", lightOn);
    animationMachine?.setLight(lightOn);
    showToast(lightOn ? "灯打开啦，眼睛要舒服一点" : "关灯休息一下");
  }

  function applyPreferences(nextPreferences) {
    preferences = nextPreferences;
    document.documentElement.style.setProperty(
      "--pet-scale",
      String(preferences.petScale / 100)
    );
    elements.petSize.value = String(preferences.petScale);
    elements.petSizeOutput.value = String(preferences.petScale) + "%";
    document.documentElement.style.setProperty(
      "--bubble-scale",
      String(preferences.bubbleScale / 100)
    );
    elements.bubbleSize.value = String(preferences.bubbleScale);
    elements.bubbleSizeOutput.value = String(preferences.bubbleScale) + "%";
    const bubbleOffset = clamp(
      60
        + (100 - preferences.petScale) * 3.25
        - (preferences.bubbleScale - 100) * 2.38,
      0,
      220
    );
    document.documentElement.style.setProperty(
      "--bubble-offset-y",
      String(Math.round(bubbleOffset)) + "px"
    );
    elements.gazeTracking.checked = preferences.gazeTracking;
    elements.showCreation.checked = preferences.showCreation;
    elements.showLight.checked = preferences.showLight;
    elements.showHide.checked = preferences.showHide;

    if (!preferences.showCreation && creating) setCreating(false);
    if (!preferences.showLight && lightOn) setLight(false);

    elements.creationButton.hidden = !preferences.showCreation;
    elements.lightButton.hidden = !preferences.showLight;
    elements.hideButton.hidden = !preferences.showHide;
    elements.petToolbar.hidden = !(
      preferences.showCreation || preferences.showLight || preferences.showHide
    );
    gazeController.setEnabled(preferences.gazeTracking);
  }

  function updatePreference(patch) {
    applyPreferences(preferencesStore.set(patch));
  }

  function setSettingsOpen(open) {
    const isOpen = Boolean(open);
    elements.settingsPanel.hidden = !isOpen;
    elements.settingsButton.setAttribute("aria-expanded", String(isOpen));
    elements.bubble.classList.toggle("settings-open", isOpen);
    elements.form.inert = isOpen;
    elements.todoContent.inert = isOpen;
    elements.footer.inert = isOpen;
    if (isOpen) requestAnimationFrame(() => elements.settingsClose.focus());
    else elements.settingsButton.focus();
  }

  function createSpineDriver(player) {
    return {
      play(name, options = {}) {
        const { loop = false, track = 0, onComplete } = options;
        const entry = player.animationState.setAnimation(track, name, loop);

        if (track === 0) {
          gazeController.setAnimation(name);
          if (animationMessages[name]) setMessage(animationMessages[name]);
        }

        if (!loop && typeof onComplete === "function") {
          let completed = false;
          entry.listener = {
            complete() {
              if (completed) return;
              completed = true;
              onComplete();
            }
          };
        }

        if (track > 0 && !loop) player.animationState.addEmptyAnimation(track, 0.2, 0);
        return entry;
      },
      clearTrack(track) {
        player.animationState.setEmptyAnimation(track, 0.18);
      }
    };
  }

  function initializeSpine() {
    if (!window.spine?.SpinePlayer) {
      showSpineFallback("Spine 运行库未加载");
      return;
    }

    spinePlayer = new window.spine.SpinePlayer("spine-player", {
      skeleton: "../../spine/Q蕾米.json",
      atlas: "../../spine/leimi.atlas",
      animation: "a",
      scale: 0.2,
      alpha: true,
      backgroundColor: "#00000000",
      showControls: false,
      interactive: false,
      premultipliedAlpha: true,
      defaultMix: 0.22,
      updateWorldTransform(player, delta) {
        gazeController.apply(player, delta);
      },
      success(player) {
        animationMachine = new AnimationStateMachine(createSpineDriver(player));
        animationMachine.start();
        elements.creationButton.disabled = false;
        elements.lightButton.disabled = false;
        elements.player.setAttribute("data-ready", "true");
      },
      error(_player, reason) {
        showSpineFallback(reason || "动画加载失败");
      }
    });
  }

  function showSpineFallback(reason) {
    console.error("Spine player error:", reason);
    elements.player.hidden = true;
    elements.fallbackImage.hidden = false;
    elements.creationButton.disabled = true;
    elements.lightButton.disabled = true;
    setMessage("动画暂时没有加载成功");
    showToast("已切换到备用图片，请查看运行日志");
  }

  function isInteractivePoint(clientX, clientY) {
    return document
      .elementsFromPoint(clientX, clientY)
      .some((element) => element.closest?.(".interactive-zone"));
  }

  function updateMousePassthrough(ignore) {
    if (passthrough === ignore) return;
    passthrough = ignore;
    desktop?.setMousePassthrough(ignore);
  }

  function bindMousePassthrough() {
    document.addEventListener("mousemove", (event) => {
      updateMousePassthrough(!isInteractivePoint(event.clientX, event.clientY));
    }, { passive: true });
    document.addEventListener("mouseleave", () => updateMousePassthrough(true));
  }

  function updatePetPointerState(cursor) {
    if (!cursor) return;
    const rect = elements.petStage.getBoundingClientRect();
    const inside = (
      cursor.x >= rect.left &&
      cursor.x <= rect.right &&
      cursor.y >= rect.top &&
      cursor.y <= rect.bottom
    );
    if (inside === petPointerInside) return;
    petPointerInside = inside;
    elements.petStage.classList.toggle("is-pointer-over", inside);
    if (inside) animationMachine?.pointerEnter();
    else animationMachine?.pointerLeave();
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const item = todoStore.add(elements.input.value);
      elements.input.value = "";
      renderTodos();
      const response = animationMachine?.acknowledgeTodo();
      showToast(
        response === "thinking"
          ? "记下了，蕾米正在想办法：" + item.text
          : "记下了，蕾米准备动笔：" + item.text
      );
    } catch (error) {
      showToast(error.message);
      elements.input.focus();
    }
  });

  elements.input.addEventListener("focus", () => animationMachine?.inputFocus?.());
  elements.input.addEventListener("blur", () => animationMachine?.inputBlur?.());
  elements.input.addEventListener("input", spawnTypingCharm);

  elements.todoList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    const itemElement = actionButton?.closest(".todo-item");
    if (!actionButton || !itemElement) return;

    if (actionButton.dataset.action === "toggle") {
      const item = todoStore.toggle(itemElement.dataset.id);
      if (item?.completed) {
        animationMachine?.celebrate();
        launchConfetti();
        showToast("完成一件，彩纸送给你！");
      }
    } else if (actionButton.dataset.action === "delete") {
      todoStore.remove(itemElement.dataset.id);
    }
    renderTodos();
  });

  elements.clearCompleted.addEventListener("click", () => {
    const removedCount = todoStore.clearCompleted();
    renderTodos();
    if (removedCount > 0) showToast("收起了 " + String(removedCount) + " 件已完成事项");
  });

  elements.creationButton.addEventListener("click", () => setCreating(!creating));
  elements.lightButton.addEventListener("click", () => setLight(!lightOn));
  elements.hideButton.addEventListener("click", () => desktop?.hide());
  elements.pinButton.addEventListener("click", () => desktop?.toggleAlwaysOnTop());

  elements.settingsButton.addEventListener("click", () => {
    setSettingsOpen(elements.settingsPanel.hidden);
  });
  elements.settingsClose.addEventListener("click", () => setSettingsOpen(false));
  elements.resetSettings.addEventListener("click", () => {
    applyPreferences(preferencesStore.set(DEFAULT_PREFERENCES));
    showToast("已恢复默认设置");
  });
  elements.petSize.addEventListener("input", () => {
    updatePreference({ petScale: Number(elements.petSize.value) });
  });
  elements.bubbleSize.addEventListener("input", () => {
    updatePreference({ bubbleScale: Number(elements.bubbleSize.value) });
  });
  elements.gazeTracking.addEventListener("change", () => {
    updatePreference({ gazeTracking: elements.gazeTracking.checked });
  });
  elements.showCreation.addEventListener("change", () => {
    updatePreference({ showCreation: elements.showCreation.checked });
  });
  elements.showLight.addEventListener("change", () => {
    updatePreference({ showLight: elements.showLight.checked });
  });
  elements.showHide.addEventListener("change", () => {
    updatePreference({ showHide: elements.showHide.checked });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.settingsPanel.hidden) setSettingsOpen(false);
  });

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    desktop?.showContextMenu();
  });

  desktop?.getWindowState().then((state) => {
    if (!state) return;
    elements.pinButton.setAttribute("aria-pressed", String(state.alwaysOnTop));
  });
  desktop?.onWindowStateChanged((state) => {
    elements.pinButton.setAttribute("aria-pressed", String(state.alwaysOnTop));
  });
  removeCursorListener = desktop?.onCursorPosition((cursor) => {
    gazeController.setCursor(cursor);
    updatePetPointerState(cursor);
  });

  window.addEventListener("beforeunload", () => {
    animationMachine?.destroy();
    removeCursorListener?.();
  });

  applyPreferences(preferences);
  renderTodos();
  bindMousePassthrough();
  initializeSpine();
})();
