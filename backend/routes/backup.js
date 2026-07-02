const express = require("express");
const router = express.Router();
const { verificarAdmin } = require("../middleware/auth");
const backup = require("../backup");

router.use(verificarAdmin);

router.get("/config", (req, res) => {
  res.json(backup.loadConfig());
});

router.put("/config", (req, res) => {
  try {
    const saved = backup.saveConfig(req.body);
    backup.scheduleFromConfig();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error al guardar la configuración", error: error.message });
  }
});

router.post("/run", async (req, res) => {
  try {
    const result = await backup.runBackup();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error al generar el backup", error: error.message });
  }
});

router.get("/list", (req, res) => {
  try {
    res.json(backup.listBackups());
  } catch (error) {
    res.status(500).json({ message: "Error al listar backups", error: error.message });
  }
});

router.get("/download/:filename", (req, res) => {
  try {
    const filePath = backup.getBackupFilePath(req.params.filename);
    res.download(filePath);
  } catch (error) {
    res.status(404).json({ message: "Archivo no encontrado", error: error.message });
  }
});

router.delete("/:filename", (req, res) => {
  try {
    backup.deleteBackup(req.params.filename);
    res.json({ message: "Backup eliminado correctamente" });
  } catch (error) {
    res.status(404).json({ message: "Error al eliminar el backup", error: error.message });
  }
});

router.post("/restore/:filename", async (req, res) => {
  try {
    const result = await backup.restoreBackup(req.params.filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error al restaurar el backup", error: error.message });
  }
});

module.exports = router;
