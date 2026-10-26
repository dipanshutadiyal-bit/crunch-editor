const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crunchDesktop", {
  saveFile: (name, content) => ipcRenderer.invoke("save-file", { name, content })
});
