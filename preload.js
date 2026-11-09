const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("stellicRPC", {
  connect: () => ipcRenderer.invoke("connect-discord"),
  disconnect: () => ipcRenderer.invoke("disconnect-discord"),
  setMode: mode => ipcRenderer.invoke("set-mode", mode),
  setManual: values => ipcRenderer.invoke("set-manual", values),
  getStatus: () => ipcRenderer.invoke("get-status"),
  onStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("app-status", listener);
    return () => ipcRenderer.removeListener("app-status", listener);
  }
});
