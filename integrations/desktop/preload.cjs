const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("beepress", {
  recent: () => ipcRenderer.invoke("beepress:recent"),
  chooseExisting: () => ipcRenderer.invoke("beepress:choose-existing"),
  inspect: (root) => ipcRenderer.invoke("beepress:inspect", root),
  chooseParent: () => ipcRenderer.invoke("beepress:choose-parent"),
  createProject: (payload) => ipcRenderer.invoke("beepress:create-project", payload),
  start: (root) => ipcRenderer.invoke("beepress:start", root),
  quit: () => ipcRenderer.send("beepress:quit"),
});
