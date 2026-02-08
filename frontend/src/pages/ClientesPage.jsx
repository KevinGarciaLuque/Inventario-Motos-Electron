import React, { useEffect, useState } from "react";
import {
  Table,
  Form,
  Button,
  Modal,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import { FaEdit, FaTrash, FaSyncAlt } from "react-icons/fa";
import { CheckCircleFill, XCircleFill } from "react-bootstrap-icons";
import api from "../../api/axios";
import ConfirmDeleteModal from "..//components/ConfirmDeleteModal";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(false);

  const [formulario, setFormulario] = useState({
    id: null,
    nombre: "",
    rtn: "",
    direccion: "",
    telefono: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    clienteId: null,
    nombre: "",
  });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });

  const obtenerClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(res.data);
    } catch (err) {
      setToast({
        show: true,
        message: "Error al obtener clientes.",
        variant: "danger",
      });
      console.error("Error al obtener clientes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  const handleGuardar = async () => {
    try {
      const payload = {
        ...formulario,
        // opcional: limpiar espacios
        nombre: (formulario.nombre || "").trim(),
        rtn: (formulario.rtn || "").trim(),
        direccion: (formulario.direccion || "").trim(),
        telefono: (formulario.telefono || "").trim(),
      };

      if (!payload.nombre) {
        setToast({
          show: true,
          message: "El nombre es obligatorio.",
          variant: "danger",
        });
        return;
      }

      if (editando) {
        await api.put(`/clientes/${payload.id}`, payload);
      } else {
        await api.post("/clientes", payload);
      }

      setModal(false);
      setFormulario({
        id: null,
        nombre: "",
        rtn: "",
        direccion: "",
        telefono: "",
      });
      setEditando(false);
      obtenerClientes();

      setToast({
        show: true,
        message: "Cliente guardado correctamente.",
        variant: "success",
      });
    } catch (err) {
      setToast({
        show: true,
        message: "Error guardando cliente.",
        variant: "danger",
      });
      console.error("Error guardando cliente", err);
    }
  };

  const handleEditar = (cliente) => {
    setFormulario({
      id: cliente.id ?? null,
      nombre: cliente.nombre ?? "",
      rtn: cliente.rtn ?? "",
      direccion: cliente.direccion ?? "",
      telefono: cliente.telefono ?? "",
    });
    setEditando(true);
    setModal(true);
  };

  const askDelete = (clienteId, nombre) =>
    setDeleteConfirm({ show: true, clienteId, nombre });

  const handleDelete = async () => {
    const id = deleteConfirm.clienteId;
    setDeleteConfirm({ show: false, clienteId: null, nombre: "" });
    if (!id) return;

    try {
      await api.delete(`/clientes/${id}`);
      setToast({
        show: true,
        message: "Cliente eliminado correctamente.",
        variant: "success",
      });
      obtenerClientes();
    } catch (err) {
      setToast({
        show: true,
        message:
          err?.response?.data?.message ||
          "No se pudo eliminar. Puede tener relaciones activas.",
        variant: "danger",
      });
      console.error("Error al eliminar cliente:", err);
    }
  };

  const toggleActivo = async (id) => {
    try {
      await api.patch(`/clientes/toggle/${id}`);
      obtenerClientes();
    } catch (err) {
      setToast({
        show: true,
        message: "No se pudo cambiar el estado.",
        variant: "danger",
      });
    }
  };

  const handleCerrarModal = () => {
    setModal(false);
    setFormulario({
      id: null,
      nombre: "",
      rtn: "",
      direccion: "",
      telefono: "",
    });
    setEditando(false);
  };

  const clientesFiltrados = clientes.filter((c) =>
    `${c.nombre || ""} ${c.rtn || ""} ${c.telefono || ""}`
      .toLowerCase()
      .includes(filtro.toLowerCase()),
  );

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(
        () => setToast((t) => ({ ...t, show: false })),
        3000,
      );
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  return (
    <div>
      <h3>Gestión de Clientes</h3>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar por nombre, RTN o teléfono"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <Button variant="success" onClick={() => setModal(true)}>
          Agregar Cliente
        </Button>
        <Button variant="outline-secondary" onClick={obtenerClientes}>
          <FaSyncAlt />
        </Button>
      </InputGroup>

      {/* Toast de feedback */}
      <Modal
        show={toast.show}
        onHide={() => setToast((t) => ({ ...t, show: false }))}
        centered
      >
        <Modal.Body className="text-center py-4">
          {toast.variant === "success" ? (
            <CheckCircleFill size={50} color="#198754" className="mb-3" />
          ) : (
            <XCircleFill size={50} color="#dc3545" className="mb-3" />
          )}
          <h5
            className={`fw-bold ${
              toast.variant === "success" ? "text-success" : "text-danger"
            }`}
          >
            {toast.message}
          </h5>
          <Button
            variant={toast.variant === "success" ? "success" : "danger"}
            className="mt-2 px-4"
            onClick={() => setToast((t) => ({ ...t, show: false }))}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* Modal confirmación eliminar */}
      <ConfirmDeleteModal
        show={deleteConfirm.show}
        onHide={() =>
          setDeleteConfirm({ show: false, clienteId: null, nombre: "" })
        }
        onConfirm={handleDelete}
        mensaje={
          <>
            ¿Seguro que deseas eliminar al cliente{" "}
            <span className="fw-bold">{deleteConfirm.nombre}</span>?
          </>
        }
        subtitulo="Esta acción no se puede deshacer."
      />

      {loading ? (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: 150 }}
        >
          <Spinner animation="border" />
        </div>
      ) : (
        <div
          className="bg-white shadow-sm rounded mb-4"
          style={{
            maxHeight: "400px",
            height: "400px",
            overflowY: "auto",
            overflowX: "auto",
            border: "1px solid #dee2e6",
          }}
        >
          <Table
            striped
            bordered
            hover
            responsive
            className="sticky-header mb-0"
            style={{ minWidth: 860 }}
          >
            <thead className="table-light sticky-top">
              <tr>
                <th>Nombre</th>
                <th>RTN</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.rtn}</td>
                  <td>{cliente.direccion}</td>
                  <td>{cliente.telefono || "-"}</td>
                  <td>
                    <Form.Check
                      type="switch"
                      checked={!!cliente.activo}
                      onChange={() => toggleActivo(cliente.id)}
                      label={cliente.activo ? "Activo" : "Inactivo"}
                    />
                  </td>
                  <td>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => handleEditar(cliente)}
                      className="me-2"
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => askDelete(cliente.id, cliente.nombre)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal show={modal} onHide={handleCerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editando ? "Editar Cliente" : "Nuevo Cliente"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              value={formulario.nombre}
              onChange={(e) =>
                setFormulario({ ...formulario, nombre: e.target.value })
              }
              placeholder="Nombre del cliente"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>RTN</Form.Label>
            <Form.Control
              value={formulario.rtn}
              onChange={(e) =>
                setFormulario({ ...formulario, rtn: e.target.value })
              }
              placeholder="RTN"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={formulario.direccion}
              onChange={(e) =>
                setFormulario({ ...formulario, direccion: e.target.value })
              }
              placeholder="Dirección"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              type="tel"
              value={formulario.telefono}
              onChange={(e) =>
                setFormulario({ ...formulario, telefono: e.target.value })
              }
              placeholder="Ej: 9999-9999"
            />
            <Form.Text className="text-muted">
              Opcional, pero recomendado para comprobantes de entrega.
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCerrarModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
