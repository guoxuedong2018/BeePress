const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("beepress", {
  recent: () => ipcRenderer.invoke("beepress:recent"),
  chooseExisting: () => ipcRenderer.invoke("beepress:choose-existing"),
  pathForFile: (file) => webUtils.getPathForFile(file),
  chooseScanRoot: () => ipcRenderer.invoke("beepress:choose-scan-root"),
  scanProjects: (root) => ipcRenderer.invoke("beepress:scan-projects", root),
  chooseParent: () => ipcRenderer.invoke("beepress:choose-parent"),
  createProject: (payload) => ipcRenderer.invoke("beepress:create-project", payload),
  start: (root) => ipcRenderer.invoke("beepress:start", root),
  quit: () => ipcRenderer.send("beepress:quit"),
  onMenu: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on("beepress:menu", handler);
    return () => ipcRenderer.removeListener("beepress:menu", handler);
  },
});
