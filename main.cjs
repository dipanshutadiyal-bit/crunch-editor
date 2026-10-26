const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const { writeFile } = require("node:fs/promises");
const path = require("node:path");

const port = 38517;
let serverProcess;

ipcMain.handle("save-file", async (_event, { name, content }) => {
  const result = await dialog.showSaveDialog({
    title: `Save ${name}`,
    defaultPath: name,
    filters: [{ name: "Python files", extensions: ["py"] }, { name: "All files", extensions: ["*"] }]
  });
  if (result.canceled || !result.filePath) return { saved: false };
  await writeFile(result.filePath, content, "utf8");
  return { saved: true, path: result.filePath };
});

function startLocalServer() {
  const serverPath = path.join(__dirname, "server.js");
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: String(port) },
    stdio: "ignore",
    windowsHide: true
  });
}

async function waitForServer() {
  const url = `http://127.0.0.1:${port}/`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The child server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Crunch local server did not start.");
}

async function createWindow() {
  startLocalServer();
  await waitForServer();
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: "#f4f7fb",
    title: "Crunch Editor",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    return { action: "deny" };
  });
  await window.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
