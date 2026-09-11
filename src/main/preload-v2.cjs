const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("remielleDesktop", {
  getWindowState: () => ipcRenderer.invoke("window:get-state"),
  setMousePassthrough: (ignore) => {
    ipcRenderer.send("window:set-ignore-mouse-events", Boolean(ignore));
  },
  beginDrag: () => ipcRenderer.send("window:drag-start"),
  moveDrag: () => ipcRenderer.send("window:drag-move"),
  endDrag: () => ipcRenderer.send("window:drag-end"),
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