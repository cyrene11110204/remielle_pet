const { app, BrowserWindow, ipcMain, Menu, net, protocol, screen, Tray } = require("electron");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "remielle";
const WINDOW_SIZE = { width: 430, height: 740 };

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

let mainWindow = null;
let tray = null;
let isQuitting = false;
let savePositionTimer = null;
let settings = {};

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

function getSettingsPath() {
  return path.join(app.getPath("userData"), "window-settings.json");
}

function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (!existsSync(settingsPath)) return {};
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSettings() {
  try {
    writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
  } catch (error) {
    console.warn("Unable to save window settings:", error.message);
  }
}

function getDefaultPosition() {
  const workArea = screen.getPrimaryDisplay().workArea;
  return {
    x: workArea.x + workArea.width - WINDOW_SIZE.width - 24,
    y: workArea.y + workArea.height - WINDOW_SIZE.height - 20
  };
}

function getInitialPosition() {
  if (!Number.isInteger(settings.x) || !Number.isInteger(settings.y)) {
    return getDefaultPosition();
  }

  const candidate = {
    x: settings.x,
    y: settings.y,
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height
  };
  const visible = screen
    .getAllDisplays()
    .some(({ workArea }) => {
      const horizontalOverlap = Math.min(candidate.x + candidate.width, workArea.x + workArea.width)
        - Math.max(candidate.x, workArea.x);
      const verticalOverlap = Math.min(candidate.y + candidate.height, workArea.y + workArea.height)
        - Math.max(candidate.y, workArea.y);
      return horizontalOverlap >= 80 && verticalOverlap >= 80;
    });

  return visible ? { x: candidate.x, y: candidate.y } : getDefaultPosition();
}

function registerLocalProtocol() {
  const applicationRoot = path.resolve(app.getAppPath());

  protocol.handle(APP_SCHEME, async (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.host !== "app") {
      return new Response("Not found", { status: 404 });
    }

    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    const relativePath = pathname.replace(/^[/\\]+/, "");
    const requestedPath = path.resolve(applicationRoot, relativePath);
    const isInsideApplication = requestedPath === applicationRoot
      || requestedPath.startsWith(`${applicationRoot}${path.sep}`);

    if (!isInsideApplication) {
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(pathToFileURL(requestedPath).toString());
  });
}

function isTrustedSender(event) {
  return mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents;
}

function broadcastWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("window:state-changed", {
    alwaysOnTop: mainWindow.isAlwaysOnTop(),
    visible: mainWindow.isVisible()
  });
}

function rebuildTrayMenu() {
  if (!tray || !mainWindow) return;

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: mainWindow.isVisible() ? "隐藏蕾米" : "显示蕾米",
      click: () => toggleWindowVisibility()
    },
    {
      label: "保持置顶",
      type: "checkbox",
      checked: mainWindow.isAlwaysOnTop(),
      click: ({ checked }) => setAlwaysOnTop(checked)
    },
    { label: "回到右下角", click: resetWindowPosition },
    { type: "separator" },
    { label: "退出", click: quitApplication }
  ]));
}

function setAlwaysOnTop(enabled) {
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(Boolean(enabled), "floating");
  settings.alwaysOnTop = Boolean(enabled);
  saveSettings();
  rebuildTrayMenu();
  broadcastWindowState();
}

function resetWindowPosition() {
  if (!mainWindow) return;
  const position = getDefaultPosition();
  mainWindow.setPosition(position.x, position.y, true);
  mainWindow.showInactive();
}

function toggleWindowVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.showInactive();
  }
  rebuildTrayMenu();
  broadcastWindowState();
}

function quitApplication() {
  isQuitting = true;
  app.quit();
}

function createWindow() {
  const position = getInitialPosition();
  mainWindow = new BrowserWindow({
    ...WINDOW_SIZE,
    ...position,
    title: "蕾米桌宠",
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: settings.alwaysOnTop !== false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  mainWindow.setAlwaysOnTop(settings.alwaysOnTop !== false, "floating");
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.loadURL(`${APP_SCHEME}://app/src/renderer/index.html`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.showInactive();
    rebuildTrayMenu();

    const captureTarget = process.env.REMIELLE_CAPTURE_PATH;
    if (captureTarget && !app.isPackaged) {
      setTimeout(async () => {
        try {
          const image = await mainWindow.webContents.capturePage();
          writeFileSync(path.resolve(captureTarget), image.toPNG());
          console.log(`Smoke capture saved to ${path.resolve(captureTarget)}`);
        } catch (error) {
          console.error("Smoke capture failed:", error);
          process.exitCode = 1;
        } finally {
          quitApplication();
        }
      }, 2500);
    }
  });

  mainWindow.on("move", () => {
    clearTimeout(savePositionTimer);
    savePositionTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const [x, y] = mainWindow.getPosition();
      settings.x = x;
      settings.y = y;
      saveSettings();
    }, 250);
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
    rebuildTrayMenu();
  });

  mainWindow.on("show", rebuildTrayMenu);
  mainWindow.on("hide", rebuildTrayMenu);

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://app/`)) event.preventDefault();
  });
}

function createTray() {
  const iconPath = path.join(app.getAppPath(), "spine", "read.png");
  tray = new Tray(iconPath);
  tray.setToolTip("蕾米桌宠");
  tray.on("click", toggleWindowVisibility);
  rebuildTrayMenu();
}

function registerIpc() {
  ipcMain.handle("window:get-state", (event) => {
    if (!isTrustedSender(event)) return null;
    return {
      alwaysOnTop: mainWindow.isAlwaysOnTop(),
      visible: mainWindow.isVisible(),
      version: app.getVersion()
    };
  });

  ipcMain.on("window:set-ignore-mouse-events", (event, ignore) => {
    if (!isTrustedSender(event)) return;
    mainWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: Boolean(ignore) });
  });

  ipcMain.on("window:hide", (event) => {
    if (isTrustedSender(event)) mainWindow.hide();
  });

  ipcMain.on("window:quit", (event) => {
    if (isTrustedSender(event)) quitApplication();
  });

  ipcMain.on("window:toggle-always-on-top", (event) => {
    if (isTrustedSender(event)) setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
  });

  ipcMain.on("window:reset-position", (event) => {
    if (isTrustedSender(event)) resetWindowPosition();
  });

  ipcMain.on("window:show-context-menu", (event) => {
    if (!isTrustedSender(event)) return;
    rebuildTrayMenu();
    tray?.popUpContextMenu();
  });
}

app.whenReady().then(() => {
  settings = loadSettings();
  registerLocalProtocol();
  registerIpc();
  createWindow();
  createTray();
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  mainWindow.showInactive();
  mainWindow.moveTop();
});

app.on("activate", () => {
  if (mainWindow) mainWindow.showInactive();
});

app.on("before-quit", () => {
  isQuitting = true;
  clearTimeout(savePositionTimer);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    settings.x = x;
    settings.y = y;
    saveSettings();
  }
});

app.on("window-all-closed", () => {
  // 桌宠隐藏后仍驻留系统托盘，只有“退出”才真正结束进程。
});
