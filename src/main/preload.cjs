const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("remielleDesktop", {
  getWindowState: () => ipcRenderer.invoke("window:get-state"),
  setMousePassthrough: (ignore) => {
    ipcRenderer.send("window:set-ignore-mouse-events", Boolean(ignore));
  },
  hide: () => ipcRenderer.send("window:hide"),
  quit: () => ipcRenderer.send("window:quit"),
  toggleAlwaysOnTop: () => ipcRenderer.send("window:toggle-always-on-top"),
  resetPosition: () => ipcRenderer.send("window:reset-position"),
  showContextMenu: () => ipcRenderer.send("window:show-context-menu"),
  onWindowStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  }
});
