import { useState, useEffect } from "react";
import { Form } from "react-bootstrap";

export default function MetodosPagos({
  total,
  onCambioCalculado,
  resetTrigger,
}) {
  const [metodo, setMetodo] = useState("efectivo");
  const [efectivo, setEfectivo] = useState("");
  const [cambio, setCambio] = useState(0);
  const [montoTarjeta, setMontoTarjeta] = useState("");

  // 🔁 Recalcula el cambio cada vez que cambian estos valores
  useEffect(() => {
    if (metodo === "mixto") {
      const tarjeta = parseFloat(montoTarjeta) || 0;
      const efectivoRequerido = Math.max(
        parseFloat((total - tarjeta).toFixed(2)),
        0
      );
      const pago = parseFloat(efectivo) || 0;
      const cambioCalculado =
        pago > efectivoRequerido
          ? parseFloat((pago - efectivoRequerido).toFixed(2))
          : 0;
      setCambio(cambioCalculado);

      onCambioCalculado({
        metodo,
        efectivo: pago,
        cambio: cambioCalculado,
        montoTarjeta: tarjeta,
      });
      return;
    }

    const pago = parseFloat(efectivo) || 0;
    const cambioCalculado =
      pago > total ? parseFloat((pago - total).toFixed(2)) : 0;
    setCambio(cambioCalculado);

    onCambioCalculado({
      metodo,
      efectivo: pago,
      cambio: cambioCalculado,
      montoTarjeta: metodo === "tarjeta" ? total : 0,
    });
  }, [efectivo, metodo, total, montoTarjeta]);

  // 🔄 Reset cuando cambie la prop resetTrigger
  useEffect(() => {
    setMetodo("efectivo");
    setEfectivo("");
    setCambio(0);
    setMontoTarjeta("");
  }, [resetTrigger]);

  const tarjetaNum = parseFloat(montoTarjeta) || 0;
  const efectivoRequerido = Math.max(
    parseFloat((total - tarjetaNum).toFixed(2)),
    0
  );

  return (
    <div
      className="border p-3 rounded with-shadow"
      style={{ width: "60%", backgroundColor: "#d4d6d5ff" }}
    >
      <h6>Método de Pago</h6>
      <Form.Group>
        <Form.Select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="mixto">Mixto (Efectivo + Tarjeta)</option>
        </Form.Select>
      </Form.Group>

      {metodo === "efectivo" && (
        <>
          <Form.Group className="mt-2">
            <Form.Label>Pago en efectivo</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Cambio entregado</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={`L ${cambio.toFixed(2)}`}
            />
          </Form.Group>
        </>
      )}

      {metodo === "mixto" && (
        <>
          <Form.Group className="mt-2">
            <Form.Label>Monto con tarjeta</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={montoTarjeta}
              onChange={(e) => setMontoTarjeta(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Efectivo requerido</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={`L ${efectivoRequerido.toFixed(2)}`}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Efectivo recibido</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-2">
            <Form.Label>Cambio entregado</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={`L ${cambio.toFixed(2)}`}
            />
          </Form.Group>
        </>
      )}
    </div>
  );
}
