const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, "frontend", "dist", "index.html"));
}

app.whenReady().then(() => {
  // ✅ Ruta fija: fuera del instalador
  const backendExePath = "C:\\Inventario\\backend\\inventario-backend.exe";

  console.log("⏳ Iniciando backend:", backendExePath);

  try {
    backendProcess = spawn(backendExePath, [], {
      detached: true,
      stdio: "ignore",
    });

    backendProcess.unref();
  } catch (err) {
    console.error("❌ Error al iniciar el backend:", err);
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  if (backendProcess) backendProcess.kill();
});
