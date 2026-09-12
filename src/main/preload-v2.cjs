const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("remielleDesktop", {
  getWindowState: () => ipcRenderer.invoke("window:get-state"),

  hide: () => ipcRenderer.send("window:hide"),
  quit: () => ipcRenderer.send("window:quit"),
  toggleAlwaysOnTop: () => ipcRenderer.send("window:toggle-always-on-top"),
  resetPosition: () => ipcRenderer.send("window:reset-position"),
  showContextMenu: () => ipcRenderer.send("window:show-context-menu"),
  onCursorPosition: (callback) => {
    const listener = (_event, cursor) => callback(cursor);
    ipcRenderer.on("cursor:position", listener);
    return () => ipcRenderer.removeListener("cursor:position", listener);
  },
  onWindowStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  }
});
