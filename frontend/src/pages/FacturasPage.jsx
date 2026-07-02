import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Form,
  InputGroup,
  Button,
  Modal,
  Spinner,
} from "react-bootstrap";
import { FaBroom, FaPrint, FaEye, FaTruck } from "react-icons/fa";
import api from "../../api/axios";

import generarReciboPDF from "../utils/generarReciboPDF";
import generarComprobanteEntregaPDF from "../utils/generarComprobanteEntregaPDF"; // ✅ util Carta

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  // Vista previa
  const [showVista, setShowVista] = useState(false);
  const [facturaVista, setFacturaVista] = useState(null);

  // Modal informativo (para errores o cuando no aplica entrega)
  const [modalInfo, setModalInfo] = useState({
    show: false,
    title: "Atención",
    message: "",
  });

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    setLoading(true);
    try {
      const res = await api.get("/facturas");
      setFacturas(res.data || []);
    } catch (err) {
      console.error(err);
      setFacturas([]);
      setModalInfo({
        show: true,
        title: "Error",
        message: "No se pudieron cargar las facturas.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtradas = useMemo(() => {
    const b = (busqueda || "").toLowerCase().trim();
    if (!b) return facturas;

    return facturas.filter((f) => {
      const num = String(f.numero_factura || "").toLowerCase();
      const cai = String(f.cai_codigo || "").toLowerCase();
      return num.includes(b) || cai.includes(b);
    });
  }, [facturas, busqueda]);

  const construirPayloadPDF = (datosFactura, esCopia = true) => ({
    numeroFactura: datosFactura.numero_factura,
    carrito: datosFactura.carrito || [],
    subtotal: Number(datosFactura.subtotal) || 0,
    impuesto: Number(datosFactura.impuesto) || 0,
    total: Number(datosFactura.total) || 0,
    user: datosFactura.user,
    cai: datosFactura.cai,
    cliente_nombre: datosFactura.cliente_nombre || "Consumidor Final",
    cliente_rtn: datosFactura.cliente_rtn || "",
    cliente_direccion: datosFactura.cliente_direccion || "",
    cliente_telefono: datosFactura.cliente_telefono || "", // ✅ si ya lo guardas
    metodoPago: datosFactura.metodo_pago || "efectivo",
    efectivo: Number(datosFactura.efectivo) || 0,
    cambio: Number(datosFactura.cambio) || 0,
    montoTarjeta: Number(datosFactura.monto_tarjeta) || 0,
    esCopia,
  });

  // ✅ Imprimir recibo (copia)
  const imprimirReciboCopia = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      const datosFactura = res.data;

      generarReciboPDF(construirPayloadPDF(datosFactura, true));
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      setModalInfo({
        show: true,
        title: "Error",
        message: "No se pudo generar el recibo en PDF.",
      });
    }
  };

  // ✅ Imprimir comprobante de entrega (copia) – Carta
  const imprimirEntregaCopia = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      const datosFactura = res.data;

      const direccion = String(datosFactura.cliente_direccion || "").trim();
      const flagEntrega = Number(datosFactura.es_entrega || 0) === 1;

      const aplicaEntrega = direccion.length > 0 || flagEntrega;

      if (!aplicaEntrega) {
        setModalInfo({
          show: true,
          title: "No aplica comprobante de entrega",
          message:
            "Esta factura no tiene dirección registrada y no está marcada como entrega/envío.",
        });
        return;
      }

      const payload = construirPayloadPDF(datosFactura, true);

      generarComprobanteEntregaPDF({
        ...payload,
        observaciones: "Recibí conforme la mercadería descrita.",
        esCopia: true,
      });
    } catch (error) {
      console.error("Error al generar el comprobante:", error);
      setModalInfo({
        show: true,
        title: "Error",
        message: "No se pudo generar el comprobante de entrega.",
      });
    }
  };

  // Vista previa
  const verFactura = async (factura) => {
    try {
      const res = await api.get(`/facturas/${factura.id}`);
      setFacturaVista(res.data);
      setShowVista(true);
    } catch (err) {
      console.error(err);
      setFacturaVista(null);
      setShowVista(false);
      setModalInfo({
        show: true,
        title: "Error",
        message: "Error al cargar la factura para vista previa.",
      });
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">Facturas Emitidas</h2>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar por número de factura o CAI..."
          value={busqueda}
          onChange={(e) => setBusqedaSafe(setBusqueda, e.target.value)}
        />
        <Button
          variant="warning"
          className="fw-bold d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "#FFC107", borderColor: "#FFC107" }}
          onClick={() => setBusqueda("")}
        >
          <FaBroom className="me-2" /> Limpiar
        </Button>

        <Button variant="outline-secondary" onClick={cargarFacturas}>
          Recargar
        </Button>
      </InputGroup>

      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "400px",
          height: "320px",
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid #dee2e6",
        }}
      >
        <Table
          striped
          bordered
          hover
          className="mb-0 sticky-header"
          style={{ minWidth: "980px" }}
        >
          <thead className="table-primary sticky-top">
            <tr>
              <th>#</th>
              <th>Número Factura</th>
              <th>CAI</th>
              <th>Fecha</th>
              <th>Total</th>
              <th style={{ width: 330 }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  <Spinner animation="border" />
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted">
                  No hay facturas para mostrar.
                </td>
              </tr>
            ) : (
              filtradas.map((f, index) => (
                <tr key={f.id}>
                  <td>{index + 1}</td>
                  <td>{f.numero_factura}</td>
                  <td>{f.cai_codigo}</td>
                  <td>
                    {f.fecha_emision
                      ? new Date(f.fecha_emision).toLocaleString("es-HN")
                      : "-"}
                  </td>
                  <td>{Number(f.total_factura || 0).toFixed(2)} Lps</td>
                  <td>
                    <Button
                      variant="info"
                      size="sm"
                      className="me-2"
                      title="Vista previa"
                      onClick={() => verFactura(f)}
                    >
                      <FaEye />
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      title="Imprimir Recibo (Copia)"
                      onClick={() => imprimirReciboCopia(f)}
                    >
                      <FaPrint className="me-1" /> Recibo
                    </Button>

                    <Button
                      variant="outline-primary"
                      size="sm"
                      title="Imprimir Entrega (Copia)"
                      onClick={() => imprimirEntregaCopia(f)}
                    >
                      <FaTruck className="me-1" /> Entrega
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Modal de Vista Previa */}
      <Modal
        show={showVista}
        onHide={() => setShowVista(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Vista previa de factura</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {facturaVista ? (
            <div>
              <h5 className="mb-2">
                Factura #{facturaVista.numero_factura} |{" "}
                {facturaVista.cliente_nombre}
              </h5>

              <div className="mb-2">
                <b>Fecha:</b>{" "}
                {facturaVista.fecha_emision
                  ? new Date(facturaVista.fecha_emision).toLocaleString("es-HN")
                  : "-"}
              </div>

              <div className="mb-2">
                <b>RTN:</b> {facturaVista.cliente_rtn || "N/A"} <br />
                <b>Teléfono:</b> {facturaVista.cliente_telefono || "N/A"} <br />
                <b>Dirección:</b> {facturaVista.cliente_direccion || "N/A"}
              </div>

              <hr />

              <div>
                <b>Detalle:</b>
                <ul className="mb-0">
                  {(facturaVista.carrito || []).map((item, idx) => (
                    <li key={idx}>
                      {item.nombre} x {item.cantidad} — Lps{" "}
                      {Number(item.precio || 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <b>Subtotal:</b> Lps{" "}
                {Number(facturaVista.subtotal || 0).toFixed(2)} <br />
                <b>Impuesto:</b> Lps{" "}
                {Number(facturaVista.impuesto || 0).toFixed(2)} <br />
                <b>Total:</b>{" "}
                <span className="fw-bold">
                  Lps {Number(facturaVista.total || 0).toFixed(2)}
                </span>
              </div>

              <hr />

              {facturaVista.metodo_pago === "efectivo" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Efectivo <br />
                  <b>Efectivo recibido:</b> Lps{" "}
                  {Number(facturaVista.efectivo || 0).toFixed(2)} <br />
                  <b>Cambio entregado:</b> Lps{" "}
                  {Number(facturaVista.cambio || 0).toFixed(2)}
                </div>
              )}

              {facturaVista.metodo_pago === "tarjeta" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Tarjeta
                </div>
              )}

              {facturaVista.metodo_pago === "mixto" && (
                <div className="mt-2">
                  <b>Método de pago:</b> Mixto <br />
                  <b>Pago con tarjeta:</b> Lps{" "}
                  {Number(facturaVista.monto_tarjeta || 0).toFixed(2)} <br />
                  <b>Efectivo recibido:</b> Lps{" "}
                  {Number(facturaVista.efectivo || 0).toFixed(2)} <br />
                  <b>Cambio entregado:</b> Lps{" "}
                  {Number(facturaVista.cambio || 0).toFixed(2)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted">No se pudo cargar la factura.</div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVista(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal informativo */}
      <Modal
        show={modalInfo.show}
        onHide={() => setModalInfo((m) => ({ ...m, show: false }))}
        centered
      >
        <Modal.Body className="text-center py-4">
          <h5 className="fw-bold mb-3">{modalInfo.title}</h5>
          <p className="text-muted mb-3">{modalInfo.message}</p>
          <Button
            variant="secondary"
            onClick={() => setModalInfo((m) => ({ ...m, show: false }))}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}

// Helper pequeño para evitar warnings si vienen valores raros
function setBusqedaSafe(setter, value) {
  setter(typeof value === "string" ? value : String(value ?? ""));
}
