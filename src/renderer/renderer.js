(function initializeRemiellePet() {
  "use strict";

  const { TodoStore } = window.RemielleTodo;
  const { AnimationStateMachine } = window.RemielleAnimation;
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

  const elements = {
    clearCompleted: document.querySelector("#clear-completed"),
    creationButton: document.querySelector("#creation-button"),
    creationButtonLabel: document.querySelector("#creation-button .button-label"),
    emptyState: document.querySelector("#empty-state"),
    fallbackImage: document.querySelector("#fallback-image"),
    form: document.querySelector("#todo-form"),
    hideButton: document.querySelector("#hide-button"),
    input: document.querySelector("#todo-input"),
    lightButton: document.querySelector("#light-button"),
    message: document.querySelector("#pet-message"),
    petStage: document.querySelector("#pet-stage"),
    pinButton: document.querySelector("#pin-button"),
    player: document.querySelector("#spine-player"),
    todoCount: document.querySelector("#todo-count"),
    todoList: document.querySelector("#todo-list"),
    toast: document.querySelector("#toast")
  };

  const todoStore = new TodoStore(window.localStorage);
  let animationMachine = null;
  let spinePlayer = null;
  let creating = false;
  let lightOn = false;
  let toastTimer = null;
  let passthrough = null;

  function setMessage(message) {
    elements.message.textContent = message;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 1900);
  }

  function createTodoElement(item) {
    const listItem = document.createElement("li");
    listItem.className = `todo-item${item.completed ? " completed" : ""}`;
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
    deleteButton.setAttribute("aria-label", `删除待办：${item.text}`);
    deleteButton.textContent = "×";

    listItem.append(checkButton, text, deleteButton);
    return listItem;
  }

  function renderTodos() {
    const items = todoStore.list();
    elements.todoList.replaceChildren(...items.map(createTodoElement));
    elements.emptyState.hidden = items.length > 0;

    const remaining = todoStore.remainingCount();
    if (items.length === 0) {
      elements.todoCount.textContent = "还没有待办";
    } else if (remaining === 0) {
      elements.todoCount.textContent = "今天的清单完成啦";
    } else {
      elements.todoCount.textContent = `还有 ${remaining} 件待办`;
    }

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

  function createSpineDriver(player) {
    return {
      play(name, options = {}) {
        const { loop = false, track = 0, onComplete } = options;
        const entry = player.animationState.setAnimation(track, name, loop);

        if (track === 0 && animationMessages[name]) {
          setMessage(animationMessages[name]);
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

        if (track > 0 && !loop) {
          player.animationState.addEmptyAnimation(track, 0.2, 0);
        }

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

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const item = todoStore.add(elements.input.value);
      elements.input.value = "";
      renderTodos();
      animationMachine?.celebrate();
      showToast(`记下了：${item.text}`);
    } catch (error) {
      showToast(error.message);
      elements.input.focus();
    }
  });

  elements.todoList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    const itemElement = actionButton?.closest(".todo-item");
    if (!actionButton || !itemElement) return;

    if (actionButton.dataset.action === "toggle") {
      const item = todoStore.toggle(itemElement.dataset.id);
      if (item?.completed) {
        animationMachine?.celebrate();
        showToast("完成一件，真棒！");
      }
    } else if (actionButton.dataset.action === "delete") {
      todoStore.remove(itemElement.dataset.id);
    }
    renderTodos();
  });

  elements.clearCompleted.addEventListener("click", () => {
    const removedCount = todoStore.clearCompleted();
    renderTodos();
    if (removedCount > 0) showToast(`收起了 ${removedCount} 件已完成事项`);
  });

  elements.creationButton.addEventListener("click", () => setCreating(!creating));
  elements.lightButton.addEventListener("click", () => setLight(!lightOn));
  elements.hideButton.addEventListener("click", () => desktop?.hide());
  elements.pinButton.addEventListener("click", () => desktop?.toggleAlwaysOnTop());

  elements.petStage.addEventListener("mouseenter", () => animationMachine?.pointerEnter());
  elements.petStage.addEventListener("mouseleave", () => animationMachine?.pointerLeave());

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

  window.addEventListener("beforeunload", () => animationMachine?.destroy());

  renderTodos();
  bindMousePassthrough();
  initializeSpine();
})();
