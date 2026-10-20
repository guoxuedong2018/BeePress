const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("beepress", {
  recent: () => ipcRenderer.invoke("beepress:recent"),
  chooseExisting: () => ipcRenderer.invoke("beepress:choose-existing"),
  inspect: (root) => ipcRenderer.invoke("beepress:inspect", root),
  createFeature: (payload) => ipcRenderer.invoke("beepress:create-feature", payload),
  checkFrs: (root) => ipcRenderer.invoke("beepress:check-frs", root),
  installDependencies: (root) => ipcRenderer.invoke("beepress:install-deps", root),
  startPrototype: (root) => ipcRenderer.invoke("beepress:start-prototype", root),
  openReview: (root) => ipcRenderer.invoke("beepress:open-review", root),
  reviewStatus: (root) => ipcRenderer.invoke("beepress:review-status", root),
  contentStatus: (root) => ipcRenderer.invoke("beepress:content-status", root),
  captureMedia: (root) => ipcRenderer.invoke("beepress:capture-media", root),
  publishPlan: (root) => ipcRenderer.invoke("beepress:publish-plan", root),
  savePublishGateway: (payload) => ipcRenderer.invoke("beepress:save-publish-gateway", payload),
  openPath: (target) => ipcRenderer.invoke("beepress:open-path", target),
  chooseParent: () => ipcRenderer.invoke("beepress:choose-parent"),
  createProject: (payload) => ipcRenderer.invoke("beepress:create-project", payload),
  start: (root) => ipcRenderer.invoke("beepress:start", root),
  quit: () => ipcRenderer.send("beepress:quit"),
});
