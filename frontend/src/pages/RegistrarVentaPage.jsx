import { useEffect, useRef, useState } from "react";
import {
  Button,
  FormControl,
  FormCheck,
  Image,
  InputGroup,
  Modal,
  Table,
  Spinner,
  Form,
} from "react-bootstrap";

import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";
import {
  FaBoxOpen,
  FaBroom,
  FaCashRegister,
  FaSearch,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa";

import api from "../../api/axios";
import { useUser } from "../context/UserContext";

import generarReciboPDF from "../utils/generarReciboPDF";
import generarComprobanteEntregaPDF from "../utils/generarComprobanteEntregaPDF"; // ✅ crea este util
import MetodosPagos from "../components/MetodosPagos";
import CardCaiDisponible from "../components/CardCaiDisponible";

// ✅ Ideal: usa tu VITE_API_URL si lo tienes
const API_URL = "http://localhost:3000";

const getImgSrc = (imagen) => {
  if (!imagen) return "/default.jpg";
  if (imagen.startsWith("http")) return imagen;
  if (imagen.startsWith("/uploads")) return API_URL + imagen;
  if (imagen.startsWith("uploads")) return `${API_URL}/${imagen}`;
  return `${API_URL}/uploads/${imagen}`;
};

const limpiarCodigo = (codigo) => codigo.trim().toUpperCase();

export default function RegistrarVentaPage() {
  const { user } = useUser();

  // Productos / carrito
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [buscar, setBuscar] = useState("");

  // CAI
  const [cai, setCai] = useState(null);
  const [modalSinCai, setModalSinCai] = useState(false);
  const caiErrorMostradoRef = useRef(false);
  const [refreshCaiTrigger, setRefreshCaiTrigger] = useState(0);

  // Toast simple
  const [toast, setToast] = useState({ show: false, message: "" });

  // Pagos
  const [resetPagoTrigger, setResetPagoTrigger] = useState(0);

  // Switch RTN / clientes
  const [usarRTN, setUsarRTN] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");

  // Switch entrega / envío (opcional pero recomendado)
  const [esEntrega, setEsEntrega] = useState(false);

  // Modal de éxito (venta registrada) con opción de entrega
  const [modal, setModal] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
    dataRecibo: null,
    mostrarEntrega: false,
    imprimirEntrega: false,
  });

  // Modal de feedback (errores/advertencias)
  const [feedbackModal, setFeedbackModal] = useState({
    show: false,
    success: true,
    message: "",
  });

  // Modal agregar cliente rápido
  const [modalCliente, setModalCliente] = useState(false);
  const [formularioCliente, setFormularioCliente] = useState({
    nombre: "",
    rtn: "",
    direccion: "",
    telefono: "",
  });

  // Datos de la venta
  const [venta, setVenta] = useState({
    metodo_pago: "efectivo",
    efectivo: 0,
    cambio: 0,
    monto_tarjeta: 0,
    cliente_nombre: "",
    cliente_rtn: "",
    cliente_direccion: "",
    cliente_telefono: "",
  });

  // ==========================
  // SCANNER (buffer teclado)
  // ==========================
  const bufferRef = useRef("");
  const scannerTimeout = useRef(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      const target = e.target.tagName;
      const esInputEditable = target === "INPUT" || target === "TEXTAREA";
      if (esInputEditable) return;

      const char = e.key;
      if (char.length === 1) bufferRef.current += char;

      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);

      scannerTimeout.current = setTimeout(() => {
        const codigo = limpiarCodigo(bufferRef.current);
        if (codigo.length > 0) handleBuscarCodigo(codigo);
        bufferRef.current = "";
      }, 300);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
    };
  }, []);

  // ==========================
  // Carga inicial
  // ==========================
  const cargarProductos = async () => {
    try {
      const res = await api.get("/productos");
      setProductos(res.data || []);
    } catch {
      setProductos([]);
    }
  };

  const consultarCai = async () => {
    try {
      const res = await api.get("/cai/activo");
      setCai(res.data);
    } catch (error) {
      console.error("❌ Error al consultar CAI:", error?.message);
      setCai(null);

      if (!caiErrorMostradoRef.current) {
        setModalSinCai(true);
        caiErrorMostradoRef.current = true;
      }
    }
  };

  useEffect(() => {
    consultarCai();
    cargarProductos();
  }, []);

  // ==========================
  // Clientes
  // ==========================
  const cargarClientes = async () => {
    setClientesLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(res.data || []);
    } catch {
      setClientes([]);
    } finally {
      setClientesLoading(false);
    }
  };

  useEffect(() => {
    if (usarRTN) cargarClientes();
  }, [usarRTN]);

  const clientesFiltrados = clientes.filter((c) =>
    `${c.nombre || ""} ${c.rtn || ""} ${c.telefono || ""}`
      .toLowerCase()
      .includes((filtroCliente || "").toLowerCase()),
  );

  // ==========================
  // Helpers UI
  // ==========================
  const mostrarToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2000);
  };

  const handleCambio = ({ metodo, efectivo, cambio, montoTarjeta }) => {
    setVenta((prev) => {
      if (
        prev.metodo_pago === metodo &&
        Number(prev.efectivo) === Number(efectivo) &&
        Number(prev.cambio) === Number(cambio) &&
        Number(prev.monto_tarjeta) === Number(montoTarjeta)
      ) {
        return prev;
      }
      return {
        ...prev,
        metodo_pago: metodo,
        efectivo,
        cambio,
        monto_tarjeta: montoTarjeta ?? 0,
      };
    });
  };

  // ==========================
  // Buscar / agregar productos
  // ==========================
  const handleBuscarCodigo = async (codigo) => {
    try {
      const res = await api.get(`/productos/buscar?codigo=${codigo.trim()}`);
      if (res.data?.length > 0) {
        agregarProductoAlCarrito(res.data[0]);
        setBuscar("");
      } else {
        mostrarToast("Producto no encontrado");
      }
    } catch {
      mostrarToast("Error buscando producto");
    }
  };

  const handleBuscarNombre = () => {
    const nombre = buscar.trim().toLowerCase();
    if (!nombre) return;

    const prod = productos.find(
      (p) => (p.nombre || "").toLowerCase() === nombre,
    );
    if (prod) {
      agregarProductoAlCarrito(prod);
      setBuscar("");
    } else {
      mostrarToast("Producto no encontrado");
    }
  };

  const agregarProductoAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === producto.id);

      if (existe) {
        if (existe.cantidad + 1 > producto.stock) {
          mostrarToast(`Stock insuficiente. Stock actual: ${producto.stock}`);
          return prev;
        }
        return prev.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p,
        );
      }

      if (producto.stock === 0) {
        mostrarToast("No hay stock disponible.");
        return prev;
      }

      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const quitarProducto = (id) =>
    setCarrito((prev) => prev.filter((p) => p.id !== id));

  const modificarCantidad = (id, cantidad) => {
    setCarrito((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              cantidad: Math.max(1, Math.min(Number(cantidad) || 1, p.stock)),
            }
          : p,
      ),
    );
  };

  // ==========================
  // Totales (ISV incluido en precio)
  // ==========================
  const total = carrito.reduce(
    (acc, item) =>
      acc + (Number(item.cantidad) || 0) * Number(item.precio || 0),
    0,
  );

  const impuesto = (total / 1.15) * 0.15;
  const subtotal = total - impuesto;

  // ==========================
  // Modal cliente rápido
  // ==========================
  const handleGuardarCliente = async () => {
    if (!formularioCliente.nombre.trim()) {
      mostrarToast("El nombre es obligatorio");
      return;
    }
    try {
      await api.post("/clientes", formularioCliente);
      setModalCliente(false);
      setFormularioCliente({
        nombre: "",
        rtn: "",
        direccion: "",
        telefono: "",
      });
      cargarClientes();
      mostrarToast("Cliente agregado");
    } catch {
      mostrarToast("Error al agregar cliente");
    }
  };

  const handleCerrarModalCliente = () => {
    setModalCliente(false);
    setFormularioCliente({ nombre: "", rtn: "", direccion: "", telefono: "" });
  };

  // ==========================
  // Registrar venta
  // ==========================
  const registrarVenta = async () => {
    try {
      // ✅ Si no hay CAI, no permitimos vender
      if (!cai) {
        setModalSinCai(true);
        return;
      }

      if (carrito.length === 0) {
        setFeedbackModal({
          show: true,
          success: false,
          message: "⚠️ No hay productos para registrar la venta.",
        });
        return;
      }

      if (venta.metodo_pago === "efectivo" && Number(venta.efectivo) < total) {
        setFeedbackModal({
          show: true,
          success: false,
          message: "⚠️ El efectivo recibido no puede ser menor al total.",
        });
        return;
      }

      if (venta.metodo_pago === "mixto") {
        const montoTarjeta = Number(venta.monto_tarjeta) || 0;
        const efectivoRequerido = Math.max(
          Number((total - montoTarjeta).toFixed(2)),
          0
        );
        if (montoTarjeta > total) {
          setFeedbackModal({
            show: true,
            success: false,
            message: "⚠️ El monto con tarjeta no puede ser mayor al total.",
          });
          return;
        }
        if (Number(venta.efectivo) < efectivoRequerido) {
          setFeedbackModal({
            show: true,
            success: false,
            message: "⚠️ El efectivo recibido no cubre el monto restante en efectivo.",
          });
          return;
        }
      }

      const productosPayload = carrito.map((item) => ({
        producto_id: item.id,
        cantidad: item.cantidad,
      }));

      const { data } = await api.post("/ventas", {
        usuario_id: user.id,
        productos: productosPayload,

        cliente_nombre: venta.cliente_nombre,
        cliente_rtn: venta.cliente_rtn,
        cliente_direccion: venta.cliente_direccion,
        cliente_telefono: venta.cliente_telefono,

        metodo_pago: venta.metodo_pago,
        efectivo: venta.efectivo,
        cambio: venta.cambio,
        monto_tarjeta: venta.monto_tarjeta,

        es_entrega: esEntrega ? 1 : 0, // opcional si tu backend lo ignora, no pasa nada
      });

      const dataRecibo = {
        numeroFactura: data.numeroFactura,
        carrito,
        subtotal,
        impuesto,
        total,
        user,
        cai: cai || {},

        cliente_nombre: venta.cliente_nombre,
        cliente_rtn: venta.cliente_rtn,
        cliente_direccion: venta.cliente_direccion,
        cliente_telefono: venta.cliente_telefono,

        metodoPago: venta.metodo_pago,
        efectivo: venta.efectivo,
        cambio: venta.cambio,
        montoTarjeta: venta.monto_tarjeta,
      };

      // ✅ Aplica comprobante si hay dirección o si es entrega
      const aplicaEntrega =
        !!(
          venta.cliente_direccion && venta.cliente_direccion.trim().length > 0
        ) || esEntrega;

      setModal({
        show: true,
        type: "success",
        title: "Venta registrada",
        message: "La venta fue registrada exitosamente.",
        dataRecibo,
        mostrarEntrega: aplicaEntrega,
        imprimirEntrega: aplicaEntrega, // por defecto marcado si aplica
      });

      // 🔁 Refrescar visual CAI
      setRefreshCaiTrigger((prev) => prev + 1);

      // ✅ Limpiar estados
      setCarrito([]);
      setBuscar("");
      setEsEntrega(false);

      setVenta({
        metodo_pago: "efectivo",
        efectivo: 0,
        cambio: 0,
        monto_tarjeta: 0,
        cliente_nombre: "",
        cliente_rtn: "",
        cliente_direccion: "",
        cliente_telefono: "",
      });

      setResetPagoTrigger((prev) => prev + 1);
      setFormularioCliente({
        nombre: "",
        rtn: "",
        direccion: "",
        telefono: "",
      });
    } catch (error) {
      console.error("❌ Error al registrar venta:", error);
      setFeedbackModal({
        show: true,
        success: false,
        message: "❌ Error al registrar la venta.",
      });
    }
  };

  // ==========================
  // Imprimir desde el modal
  // ==========================
  const imprimirSegunSeleccion = () => {
    if (!modal.dataRecibo) return;

    // 1) Siempre imprime el recibo fiscal
    generarReciboPDF(modal.dataRecibo);

    // 2) Opcional: comprobante de entrega (carta)
    if (modal.mostrarEntrega && modal.imprimirEntrega) {
      generarComprobanteEntregaPDF({
        ...modal.dataRecibo,
        esCopia: false,
        observaciones: "Recibí conforme la mercadería descrita.",
      });
    }

    setModal((m) => ({ ...m, show: false }));
  };

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">
        <FaBoxOpen className="text-primary me-2" /> Módulo de Ventas
      </h2>

      {/* Switch RTN + Card CAI */}
      <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
        <FormCheck
          type="switch"
          id="switch-rtn"
          label={
            <span style={{ fontSize: "1rem", fontWeight: "400" }}>
              Usar cliente con RTN
            </span>
          }
          checked={usarRTN}
          onChange={() => setUsarRTN((v) => !v)}
          style={{
            padding: "0.5rem",
            marginBottom: "1rem",
            marginLeft: "1rem",
          }}
        />

        <div style={{ flexShrink: 0 }}>
          <CardCaiDisponible refreshTrigger={refreshCaiTrigger} />
        </div>
      </div>

      {/* Switch entrega */}
      <div className="mb-3">
        <FormCheck
          type="switch"
          id="switch-entrega"
          label="Entrega / Envío"
          checked={esEntrega}
          onChange={() => setEsEntrega((v) => !v)}
        />
        <small className="text-muted">
          Si está activo o si el cliente tiene dirección, se habilita el
          comprobante de entrega.
        </small>
      </div>

      {/* CLIENTES */}
      {usarRTN && (
        <>
          <h5>Clientes</h5>

          <InputGroup className="mb-2">
            <FormControl
              placeholder="Buscar por nombre, RTN o teléfono"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            />
            <Button
              variant="success"
              onClick={() => setModalCliente(true)}
              title="Agregar Cliente"
            >
              <FaUserPlus className="mb-1" /> Agregar Cliente
            </Button>
          </InputGroup>

          <div
            className="scroll-container"
            style={{ maxHeight: "180px", overflowY: "auto" }}
          >
            {clientesLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <Table
                bordered
                hover
                size="sm"
                responsive
                className="sticky-header w-100"
              >
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Nombre</th>
                    <th>RTN</th>
                    <th>Dirección</th>
                    <th>Teléfono</th>
                    <th>Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr
                      key={cliente.id}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setVenta((v) => ({
                          ...v,
                          cliente_nombre: cliente.nombre || "",
                          cliente_rtn: cliente.rtn || "",
                          cliente_direccion: cliente.direccion || "",
                          cliente_telefono: cliente.telefono || "",
                        }))
                      }
                      className={
                        venta.cliente_rtn === cliente.rtn ? "table-primary" : ""
                      }
                    >
                      <td>{cliente.nombre}</td>
                      <td>{cliente.rtn}</td>
                      <td>{cliente.direccion}</td>
                      <td>{cliente.telefono || "-"}</td>
                      <td>
                        <FormCheck
                          type="switch"
                          checked={!!cliente.activo}
                          disabled
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          {/* Inputs cliente */}
          <div className="row mt-3">
            <div className="col-md-3 mb-2">
              <FormControl
                placeholder="Nombre del Cliente"
                value={venta.cliente_nombre}
                onChange={(e) =>
                  setVenta((v) => ({ ...v, cliente_nombre: e.target.value }))
                }
              />
            </div>
            <div className="col-md-3 mb-2">
              <FormControl
                placeholder="RTN del Cliente"
                value={venta.cliente_rtn}
                onChange={(e) =>
                  setVenta((v) => ({ ...v, cliente_rtn: e.target.value }))
                }
              />
            </div>
            <div className="col-md-3 mb-2">
              <FormControl
                placeholder="Teléfono del Cliente"
                value={venta.cliente_telefono}
                onChange={(e) =>
                  setVenta((v) => ({ ...v, cliente_telefono: e.target.value }))
                }
              />
            </div>
            <div className="col-md-3 mb-2">
              <FormControl
                placeholder="Dirección del Cliente"
                value={venta.cliente_direccion}
                onChange={(e) =>
                  setVenta((v) => ({ ...v, cliente_direccion: e.target.value }))
                }
              />
            </div>
          </div>
        </>
      )}

      {/* BUSCAR PRODUCTO */}
      <h5 className="mt-4">Buscar Producto</h5>

      <InputGroup className="mb-3">
        <InputGroup.Text>
          <FaSearch />
        </InputGroup.Text>

        <FormControl
          placeholder="Buscar por nombre o escanear código"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          list="sugerencias"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const valor = limpiarCodigo(buscar);
              const esCodigo = /^[a-zA-Z0-9\-]+$/.test(valor);
              if (esCodigo) handleBuscarCodigo(valor);
              else handleBuscarNombre();
            }
          }}
        />

        <datalist id="sugerencias">
          {productos.map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>

        <Button variant="primary" onClick={handleBuscarNombre}>
          Agregar
        </Button>
        <Button variant="warning" onClick={() => setBuscar("")}>
          <FaBroom />
        </Button>
      </InputGroup>

      {/* CARRITO */}
      <h4 className="mt-4">Carrito de Venta</h4>

      <div
        className="mb-4"
        style={{
          maxHeight: "300px",
          height: "300px",
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid #dee2e6",
        }}
      >
        <Table
          striped
          bordered
          hover
          className="sticky-header"
          style={{ minWidth: "800px" }}
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>Imagen</th>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Ubicación</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {carrito.map((item) => (
              <tr key={item.id}>
                <td>
                  <Image
                    src={getImgSrc(item.imagen)}
                    width={50}
                    height={50}
                    rounded
                  />
                </td>
                <td>{item.codigo || "-"}</td>
                <td>{item.nombre}</td>
                <td>{item.categoria || "-"}</td>
                <td>{item.ubicacion || "-"}</td>
                <td>{item.descripcion || "-"}</td>
                <td>{Number(item.precio || 0).toFixed(2)} Lps</td>
                <td style={{ width: 110 }}>
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    className="form-control form-control-sm"
                    onChange={(e) =>
                      modificarCantidad(item.id, parseInt(e.target.value, 10))
                    }
                  />
                </td>
                <td>
                  {(
                    Number(item.cantidad || 0) * Number(item.precio || 0)
                  ).toFixed(2)}{" "}
                  Lps
                </td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => quitarProducto(item.id)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* PAGOS + TOTALES */}
      <div className="row mt-3">
        <div className="col-md-6 mb-3">
          <MetodosPagos
            total={total}
            onCambioCalculado={handleCambio}
            resetTrigger={resetPagoTrigger}
          />
        </div>

        <div className="col-md-6 d-flex flex-column justify-content-between">
          <div className="bg-light p-3 rounded shadow-sm h-100">
            <div className="mb-2">
              <strong>Subtotal:</strong> L {subtotal.toFixed(2)}
            </div>
            <div className="mb-2">
              <strong>ISV 15%:</strong> L {impuesto.toFixed(2)}
            </div>
            <div className="mb-3">
              <h5 className="m-0">
                <strong>Total:</strong> L {total.toFixed(2)}
              </h5>
            </div>

            <Button
              variant="success"
              size="lg"
              onClick={registrarVenta}
              className="w-100"
            >
              <FaCashRegister className="me-2" /> Registrar Venta
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL VENTA REGISTRADA (imprime recibo + entrega opcional) */}
      <Modal
        show={modal.show}
        onHide={() => setModal((m) => ({ ...m, show: false }))}
        centered
      >
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill
              size={64}
              color="#dc3545"
              className="mb-3"
            />
          )}

          <h5
            className={`mb-2 fw-bold ${modal.type === "success" ? "text-success" : "text-danger"}`}
          >
            {modal.title}
          </h5>

          <div className="mb-3 text-muted">{modal.message}</div>

          {/* ✅ Opción entrega (solo si aplica) */}
          {modal.type === "success" && modal.mostrarEntrega && (
            <div className="text-start mx-auto" style={{ maxWidth: 360 }}>
              <FormCheck
                type="switch"
                id="switch-print-entrega"
                label="Imprimir comprobante de entrega (Carta)"
                checked={modal.imprimirEntrega}
                onChange={(e) =>
                  setModal((m) => ({ ...m, imprimirEntrega: e.target.checked }))
                }
              />
              <small className="text-muted">
                Aparece si hay dirección o seleccionaste Entrega / Envío.
              </small>
            </div>
          )}

          <div className="d-flex justify-content-center align-items-center flex-wrap gap-3 mt-3">
            {modal.type === "success" && (
              <Button variant="primary" onClick={imprimirSegunSeleccion}>
                {modal.mostrarEntrega && modal.imprimirEntrega
                  ? "Imprimir Recibo + Entrega"
                  : "Imprimir Recibo"}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => setModal((m) => ({ ...m, show: false }))}
            >
              Cerrar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MODAL FEEDBACK (errores) */}
      <Modal
        show={feedbackModal.show}
        onHide={() => setFeedbackModal((f) => ({ ...f, show: false }))}
        centered
      >
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill
            size={64}
            color="#dc3545"
            className="mb-3"
          />
          <h5 className="text-danger fw-bold mb-3">Atención</h5>
          <p className="text-muted mb-3">{feedbackModal.message}</p>
          <Button
            variant="secondary"
            onClick={() => setFeedbackModal((f) => ({ ...f, show: false }))}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* MODAL CLIENTE RÁPIDO */}
      <Modal show={modalCliente} onHide={handleCerrarModalCliente} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Cliente</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              value={formularioCliente.nombre}
              onChange={(e) =>
                setFormularioCliente((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Nombre del cliente"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>RTN</Form.Label>
            <Form.Control
              value={formularioCliente.rtn}
              onChange={(e) =>
                setFormularioCliente((f) => ({ ...f, rtn: e.target.value }))
              }
              placeholder="RTN"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              value={formularioCliente.telefono}
              onChange={(e) =>
                setFormularioCliente((f) => ({
                  ...f,
                  telefono: e.target.value,
                }))
              }
              placeholder="Ej: 9999-9999"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={formularioCliente.direccion}
              onChange={(e) =>
                setFormularioCliente((f) => ({
                  ...f,
                  direccion: e.target.value,
                }))
              }
              placeholder="Dirección"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCerrarModalCliente}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardarCliente}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL SIN CAI */}
      <Modal show={modalSinCai} onHide={() => setModalSinCai(false)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill
            size={64}
            color="#dc3545"
            className="mb-3"
          />
          <h5 className="text-danger fw-bold mb-3">No hay CAI activo</h5>
          <p className="text-muted">
            No se puede registrar la venta porque no hay un CAI activo en el
            sistema.
          </p>
          <Button variant="secondary" onClick={() => setModalSinCai(false)}>
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* TOAST */}
      {toast.show && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div className="toast show text-white bg-success">
            <div className="toast-body">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
