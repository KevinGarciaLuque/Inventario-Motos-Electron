import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsDownload,
  BsArrowClockwise,
  BsTrash,
} from "react-icons/bs";
import api from "../../api/axios";

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export default function BackupPage() {
  const [config, setConfig] = useState({
    enabled: false,
    frequency: "daily",
    weekday: 0,
    dayOfMonth: 1,
    hour: 2,
    minute: 0,
    retentionCount: 7,
    destinationPath: "",
  });
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const [modal, setModal] = useState({ show: false, type: "success", title: "", message: "" });
  const showModal = ({ type, title, message }) => setModal({ show: true, type, title, message });
  const closeModal = () => setModal((prev) => ({ ...prev, show: false }));

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [restoreText, setRestoreText] = useState("");

  const cargarConfig = async () => {
    try {
      const res = await api.get("/backup/config");
      setConfig((prev) => ({ ...prev, ...res.data }));
    } catch {
      showModal({ type: "error", title: "Error", message: "No se pudo cargar la configuración de backup." });
    }
  };

  const cargarBackups = async () => {
    try {
      const res = await api.get("/backup/list");
      setBackups(res.data);
    } catch {
      showModal({ type: "error", title: "Error", message: "No se pudo cargar el historial de backups." });
    }
  };

  useEffect(() => {
    cargarConfig();
    cargarBackups();

    // Refresca el historial periódicamente por si un backup programado
    // se ejecuta mientras la página está abierta.
    const interval = setInterval(cargarBackups, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put("/backup/config", config);
      showModal({ type: "success", title: "Configuración guardada", message: "El horario de backup automático fue actualizado." });
    } catch {
      showModal({ type: "error", title: "Error", message: "No se pudo guardar la configuración." });
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async () => {
    try {
      setRunning(true);
      const res = await api.post("/backup/run");
      await cargarBackups();
      showModal({
        type: "success",
        title: "Backup generado",
        message: res.data.warning || `Se generó correctamente: ${res.data.file}`,
      });
    } catch (err) {
      showModal({ type: "error", title: "Error", message: err.message || "No se pudo generar el backup." });
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = async (name) => {
    try {
      const res = await api.get(`/backup/download/${encodeURIComponent(name)}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showModal({ type: "error", title: "Error", message: "No se pudo descargar el backup." });
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await api.delete(`/backup/${encodeURIComponent(confirmDelete)}`);
      await cargarBackups();
      showModal({ type: "success", title: "Backup eliminado", message: "El archivo fue eliminado correctamente." });
    } catch {
      showModal({ type: "error", title: "Error", message: "No se pudo eliminar el backup." });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleRestoreConfirmed = async () => {
    if (restoreText !== "RESTAURAR") return;
    try {
      await api.post(`/backup/restore/${encodeURIComponent(confirmRestore)}`);
      showModal({
        type: "success",
        title: "Restauración completada",
        message: "La base de datos y las imágenes fueron restauradas desde el backup seleccionado.",
      });
    } catch (err) {
      showModal({ type: "error", title: "Error", message: err.message || "No se pudo restaurar el backup." });
    } finally {
      setConfirmRestore(null);
      setRestoreText("");
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3 text-center">Copias de Seguridad</h3>

      {/* CONFIGURACIÓN DE BACKUP AUTOMÁTICO */}
      <form onSubmit={handleSaveConfig} className="bg-white shadow-sm rounded p-3 mb-4">
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="backupEnabled"
            checked={config.enabled}
            onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
          />
          <label className="form-check-label" htmlFor="backupEnabled">
            Backup automático activado
          </label>
        </div>

        <div className="row g-2 mb-2">
          <div className="col-md-3 col-6">
            <label className="form-label">Frecuencia</label>
            <select
              className="form-select"
              value={config.frequency}
              onChange={(e) => setConfig((c) => ({ ...c, frequency: e.target.value }))}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          {config.frequency === "weekly" && (
            <div className="col-md-3 col-6">
              <label className="form-label">Día de la semana</label>
              <select
                className="form-select"
                value={config.weekday}
                onChange={(e) => setConfig((c) => ({ ...c, weekday: Number(e.target.value) }))}
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {config.frequency === "monthly" && (
            <div className="col-md-3 col-6">
              <label className="form-label">Día del mes</label>
              <input
                type="number"
                min={1}
                max={28}
                className="form-control"
                value={config.dayOfMonth}
                onChange={(e) => setConfig((c) => ({ ...c, dayOfMonth: Number(e.target.value) }))}
              />
            </div>
          )}

          <div className="col-md-3 col-6">
            <label className="form-label">Hora</label>
            <input
              type="number"
              min={0}
              max={23}
              className="form-control"
              value={config.hour}
              onChange={(e) => setConfig((c) => ({ ...c, hour: Number(e.target.value) }))}
            />
          </div>

          <div className="col-md-3 col-6">
            <label className="form-label">Minuto</label>
            <input
              type="number"
              min={0}
              max={59}
              className="form-control"
              value={config.minute}
              onChange={(e) => setConfig((c) => ({ ...c, minute: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-4 col-12">
            <label className="form-label">Backups a conservar</label>
            <input
              type="number"
              min={1}
              className="form-control"
              value={config.retentionCount}
              onChange={(e) => setConfig((c) => ({ ...c, retentionCount: Number(e.target.value) }))}
            />
          </div>
          <div className="col-md-8 col-12">
            <label className="form-label">Carpeta destino (opcional, ej. unidad USB o red)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. D:\Backups o \\servidor\backups"
              value={config.destinationPath}
              onChange={(e) => setConfig((c) => ({ ...c, destinationPath: e.target.value }))}
            />
            <div className="form-text">
              Si se deja vacío, o la ruta no existe al momento del backup programado, se usará la carpeta local por defecto.
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Guardando..." : "Guardar configuración"}
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleRunNow}
            disabled={running}
          >
            {running ? "Generando backup..." : "Generar backup ahora"}
          </button>
        </div>
      </form>

      {/* HISTORIAL DE BACKUPS */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Historial</h5>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargarBackups}>
          Refrescar
        </button>
      </div>
      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{ maxHeight: "400px", overflowY: "auto", overflowX: "auto", border: "1px solid #dee2e6" }}
      >
        <table className="table table-bordered align-middle sticky-header" style={{ minWidth: "600px" }}>
          <thead className="table-light sticky-top">
            <tr>
              <th>Archivo</th>
              <th>Fecha</th>
              <th>Tamaño</th>
              <th style={{ width: 160 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {backups.length > 0 ? (
              backups.map((b) => (
                <tr key={b.name}>
                  <td style={{ wordBreak: "break-word" }}>{b.name}</td>
                  <td>{new Date(b.date).toLocaleString()}</td>
                  <td>{formatBytes(b.size)}</td>
                  <td>
                    <button
                      className="btn btn-outline-primary btn-sm me-1"
                      title="Descargar"
                      onClick={() => handleDownload(b.name)}
                    >
                      <BsDownload />
                    </button>
                    <button
                      className="btn btn-outline-warning btn-sm me-1"
                      title="Restaurar"
                      onClick={() => setConfirmRestore(b.name)}
                    >
                      <BsArrowClockwise />
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      title="Eliminar"
                      onClick={() => setConfirmDelete(b.name)}
                    >
                      <BsTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center text-muted">
                  No hay backups todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .sticky-top { position: sticky; top: 0; z-index: 2; background: #f8f9fa; }
      `}</style>

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill size={54} color="#dc3545" className="mb-3" />
          <h5 className="mb-2 mt-2 fw-bold text-danger">¿Eliminar este backup?</h5>
          <div className="mb-3 text-muted">{confirmDelete}. Esta acción no se puede deshacer.</div>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirmed}>
              Eliminar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MODAL CONFIRMAR RESTAURACIÓN (doble confirmación) */}
      <Modal
        show={!!confirmRestore}
        onHide={() => {
          setConfirmRestore(null);
          setRestoreText("");
        }}
        centered
      >
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill size={54} color="#dc3545" className="mb-3" />
          <h5 className="mb-2 mt-2 fw-bold text-danger">¿Restaurar este backup?</h5>
          <div className="mb-3 text-muted">
            Esto <strong>reemplazará la base de datos y las imágenes actuales</strong> con el
            contenido de <strong>{confirmRestore}</strong>. Esta acción no se puede deshacer.
          </div>
          <div className="mb-3">
            <label className="form-label">
              Escribe <strong>RESTAURAR</strong> para confirmar
            </label>
            <input
              type="text"
              className="form-control text-center"
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
            />
          </div>
          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmRestore(null);
                setRestoreText("");
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" disabled={restoreText !== "RESTAURAR"} onClick={handleRestoreConfirmed}>
              Restaurar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MODAL DE FEEDBACK */}
      <Modal show={modal.show} onHide={closeModal} centered>
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill size={64} color="#dc3545" className="mb-3" />
          )}
          <h5 className={`mb-2 fw-bold ${modal.type === "success" ? "text-success" : "text-danger"}`}>
            {modal.title}
          </h5>
          <div className="mb-3 text-muted">{modal.message}</div>
          <Button variant={modal.type === "success" ? "success" : "danger"} onClick={closeModal}>
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
