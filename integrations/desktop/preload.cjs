const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("beepress", {
  recent: () => ipcRenderer.invoke("beepress:recent"),
  chooseExisting: () => ipcRenderer.invoke("beepress:choose-existing"),
  inspect: (root) => ipcRenderer.invoke("beepress:inspect", root),
  pathForFile: (file) => webUtils.getPathForFile(file),
  chooseScanRoot: () => ipcRenderer.invoke("beepress:choose-scan-root"),
  scanProjects: (root) => ipcRenderer.invoke("beepress:scan-projects", root),
  analyzeUrl: (url) => ipcRenderer.invoke("beepress:analyze-url", url),
  saveSetup: (payload) => ipcRenderer.invoke("beepress:save-setup", payload),
  recordRun: (payload) => ipcRenderer.invoke("beepress:record-run", payload),
  createFeature: (payload) => ipcRenderer.invoke("beepress:create-feature", payload),
  checkFrs: (root) => ipcRenderer.invoke("beepress:check-frs", root),
  installDependencies: (root) => ipcRenderer.invoke("beepress:install-deps", root),
  startPrototype: (root) => ipcRenderer.invoke("beepress:start-prototype", root),
  openReview: (root) => ipcRenderer.invoke("beepress:open-review", root),
  reviewStatus: (root) => ipcRenderer.invoke("beepress:review-status", root),
  contentStatus: (root) => ipcRenderer.invoke("beepress:content-status", root),
  captureMedia: (root) => ipcRenderer.invoke("beepress:capture-media", root),
  recordClips: (root) => ipcRenderer.invoke("beepress:record-clips", root),
  publishPlan: (root) => ipcRenderer.invoke("beepress:publish-plan", root),
  savePublishGateway: (payload) => ipcRenderer.invoke("beepress:save-publish-gateway", payload),
  openPath: (target) => ipcRenderer.invoke("beepress:open-path", target),
  openExternal: (target) => ipcRenderer.invoke("beepress:open-external", target),
  listDirectory: (payload) => ipcRenderer.invoke("beepress:list-directory", payload),
  readFile: (payload) => ipcRenderer.invoke("beepress:read-file", payload),
  createTerminal: (payload) => ipcRenderer.invoke("beepress:terminal-create", payload),
  writeTerminal: (id, data) => ipcRenderer.invoke("beepress:terminal-write", { id, data }),
  resizeTerminal: (id, cols, rows) => ipcRenderer.invoke("beepress:terminal-resize", { id, cols, rows }),
  disposeTerminal: (id) => ipcRenderer.invoke("beepress:terminal-dispose", id),
  onTerminalData: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("beepress:terminal-data", handler);
    return () => ipcRenderer.removeListener("beepress:terminal-data", handler);
  },
  onTerminalExit: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("beepress:terminal-exit", handler);
    return () => ipcRenderer.removeListener("beepress:terminal-exit", handler);
  },
  onMenu: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on("beepress:menu", handler);
    return () => ipcRenderer.removeListener("beepress:menu", handler);
  },
  chooseParent: () => ipcRenderer.invoke("beepress:choose-parent"),
  createProject: (payload) => ipcRenderer.invoke("beepress:create-project", payload),
  start: (root) => ipcRenderer.invoke("beepress:start", root),
  quit: () => ipcRenderer.send("beepress:quit"),
});
