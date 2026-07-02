const fs = require("fs");
const path = require("path");
const os = require("os");
const cron = require("node-cron");
const archiver = require("archiver");
const extractZip = require("extract-zip");
const mysqldump = require("mysqldump").default || require("mysqldump");
const mysql = require("mysql2/promise");

const CONFIG_PATH = path.join(process.cwd(), "backup-config.json");
const DEFAULT_BACKUPS_DIR = path.join(process.cwd(), "backups");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const DEFAULT_CONFIG = {
  enabled: false,
  frequency: "daily", // daily | weekly | monthly
  weekday: 0, // 0-6 (domingo-sábado), usado si frequency === "weekly"
  dayOfMonth: 1, // 1-28, usado si frequency === "monthly"
  hour: 2,
  minute: 0,
  retentionCount: 7,
  destinationPath: "",
};

let scheduledTask = null;
let lastRunInfo = null;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      return { ...DEFAULT_CONFIG, ...raw };
    }
  } catch (err) {
    console.error("⚠️ Error leyendo backup-config.json, usando valores por defecto:", err.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

function buildCronExpression(config) {
  const { frequency, hour, minute, weekday, dayOfMonth } = config;
  if (frequency === "weekly") {
    return `${minute} ${hour} * * ${weekday}`;
  }
  if (frequency === "monthly") {
    return `${minute} ${hour} ${dayOfMonth} * *`;
  }
  return `${minute} ${hour} * * *`; // daily
}

function resolveDestinationDir(config) {
  if (config.destinationPath && config.destinationPath.trim()) {
    const custom = config.destinationPath.trim();
    try {
      if (!fs.existsSync(custom)) {
        fs.mkdirSync(custom, { recursive: true });
      }
      return { dir: custom, warning: null };
    } catch (err) {
      return {
        dir: DEFAULT_BACKUPS_DIR,
        warning: `No se pudo usar la carpeta destino configurada ("${custom}"): ${err.message}. Se usó la carpeta local por defecto.`,
      };
    }
  }
  if (!fs.existsSync(DEFAULT_BACKUPS_DIR)) {
    fs.mkdirSync(DEFAULT_BACKUPS_DIR, { recursive: true });
  }
  return { dir: DEFAULT_BACKUPS_DIR, warning: null };
}

function timestampForFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

async function applyRetention(dir, retentionCount) {
  if (!retentionCount || retentionCount <= 0) return;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("backup_") && f.endsWith(".zip"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a, b) => b.mtime - a.mtime);

  const toDelete = files.slice(retentionCount);
  for (const f of toDelete) {
    try {
      fs.unlinkSync(path.join(dir, f.name));
    } catch (err) {
      console.error(`⚠️ No se pudo eliminar backup antiguo ${f.name}:`, err.message);
    }
  }
}

function addFolderToArchive(archive, folderPath, archiveFolderName) {
  if (fs.existsSync(folderPath)) {
    archive.directory(folderPath, archiveFolderName);
  }
}

async function runBackup() {
  const config = loadConfig();
  const { dir: destDir, warning } = resolveDestinationDir(config);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "inventario-backup-"));
  const sqlPath = path.join(tmpDir, "database.sql");

  try {
    await mysqldump({
      connection: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "inventario_react_vite",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      },
      dumpToFile: sqlPath,
    });

    const fileName = `backup_${timestampForFilename()}.zip`;
    const zipPath = path.join(destDir, fileName);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      output.on("error", reject);
      archive.on("error", reject);
      archive.pipe(output);

      archive.file(sqlPath, { name: "database.sql" });
      addFolderToArchive(archive, UPLOADS_DIR, "uploads");

      archive.finalize();
    });

    await applyRetention(destDir, config.retentionCount);

    const stats = fs.statSync(zipPath);
    lastRunInfo = {
      success: true,
      file: fileName,
      size: stats.size,
      date: new Date().toISOString(),
      warning,
    };
  } catch (err) {
    lastRunInfo = {
      success: false,
      error: err.message,
      date: new Date().toISOString(),
    };
    throw err;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return lastRunInfo;
}

function scheduleFromConfig() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const config = loadConfig();
  if (!config.enabled) {
    console.log("🕒 Backup automático deshabilitado.");
    return;
  }

  const expression = buildCronExpression(config);
  if (!cron.validate(expression)) {
    console.error("⚠️ Expresión cron inválida para la configuración de backup:", expression);
    return;
  }

  scheduledTask = cron.schedule(expression, () => {
    console.log("⏳ Ejecutando backup automático programado...");
    runBackup()
      .then((info) => console.log("✅ Backup automático completado:", info.file))
      .catch((err) => console.error("❌ Error en backup automático:", err.message));
  });

  console.log(`🕒 Backup automático programado (cron: "${expression}").`);
}

function listBackups() {
  const config = loadConfig();
  const { dir } = resolveDestinationDir(config);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("backup_") && f.endsWith(".zip"))
    .map((f) => {
      const stats = fs.statSync(path.join(dir, f));
      return { name: f, size: stats.size, date: stats.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getBackupFilePath(fileName) {
  const safeName = path.basename(fileName);
  const config = loadConfig();
  const { dir } = resolveDestinationDir(config);
  return path.join(dir, safeName);
}

function deleteBackup(fileName) {
  const filePath = getBackupFilePath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error("El archivo de backup no existe");
  }
  fs.unlinkSync(filePath);
}

async function restoreBackup(fileName) {
  const filePath = getBackupFilePath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error("El archivo de backup no existe");
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "inventario-restore-"));

  try {
    await extractZip(filePath, { dir: tmpDir });

    const sqlPath = path.join(tmpDir, "database.sql");
    if (!fs.existsSync(sqlPath)) {
      throw new Error("El backup no contiene database.sql");
    }
    const sql = fs.readFileSync(sqlPath, "utf-8");

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "inventario_react_vite",
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      multipleStatements: true,
    });

    try {
      await connection.query(sql);
    } finally {
      await connection.end();
    }

    const extractedUploads = path.join(tmpDir, "uploads");
    if (fs.existsSync(extractedUploads)) {
      if (fs.existsSync(UPLOADS_DIR)) {
        const backupOfCurrent = path.join(
          process.cwd(),
          `uploads_pre_restore_${timestampForFilename()}`
        );
        fs.renameSync(UPLOADS_DIR, backupOfCurrent);
      }
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      for (const item of fs.readdirSync(extractedUploads)) {
        fs.cpSync(path.join(extractedUploads, item), path.join(UPLOADS_DIR, item), {
          recursive: true,
        });
      }
    }

    return { success: true };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  scheduleFromConfig,
  runBackup,
  listBackups,
  getBackupFilePath,
  deleteBackup,
  restoreBackup,
};
