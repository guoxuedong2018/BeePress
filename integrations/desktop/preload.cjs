const { contextBridge, ipcRenderer, webUtils } = require("electron");

const api = {
  recent: () => ipcRenderer.invoke("builderharness:recent"),
  chooseExisting: () => ipcRenderer.invoke("builderharness:choose-existing"),
  pathForFile: (file) => webUtils.getPathForFile(file),
  chooseScanRoot: () => ipcRenderer.invoke("builderharness:choose-scan-root"),
  scanProjects: (root) => ipcRenderer.invoke("builderharness:scan-projects", root),
  chooseParent: () => ipcRenderer.invoke("builderharness:choose-parent"),
  createProject: (payload) => ipcRenderer.invoke("builderharness:create-project", payload),
  start: (root) => ipcRenderer.invoke("builderharness:start", root),
  quit: () => ipcRenderer.send("builderharness:quit"),
  onMenu: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on("builderharness:menu", handler);
    return () => ipcRenderer.removeListener("builderharness:menu", handler);
  },
};

contextBridge.exposeInMainWorld("builderHarness", api);
