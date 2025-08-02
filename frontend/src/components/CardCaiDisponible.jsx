import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Card, Spinner } from "react-bootstrap";
import { FaFileInvoiceDollar } from "react-icons/fa";

export default function CardCaiDisponible() {
  const [disponible, setDisponible] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchCai = async () => {
    try {
      const res = await api.get("/cai/activo");
      const { rango_fin, correlativo_actual } = res.data;
      setDisponible(rango_fin - correlativo_actual);
    } catch (error) {
      console.warn("⚠️ No hay CAI activo (CardCaiDisponible).", error.message);
      setDisponible(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCai(); // primera vez

    // luego actualiza cada 10 segundos
    intervalRef.current = setInterval(() => {
      fetchCai();
    }, 10000);

    return () => clearInterval(intervalRef.current); // limpieza
  }, []); // ✅ vacía: no provoca re-renders infinitos

  if (loading) {
    return (
      <Card
        className="text-center shadow-sm border-warning"
        style={{ width: "18rem" }}
      >
        <Card.Body>
          <Spinner animation="border" variant="warning" />
          <div className="mt-2 text-muted">Cargando stock CAI...</div>
        </Card.Body>
      </Card>
    );
  }

  if (disponible === null) {
    return (
      <Card
        className="text-center shadow-sm border-danger"
        style={{ width: "18rem" }}
      >
        <Card.Body>
          <FaFileInvoiceDollar size={36} className="text-danger mb-2" />
          <h5 className="text-danger">No hay CAI activo</h5>
          <div>Por favor registre un nuevo CAI.</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card
      className={`text-center shadow-sm border-${
        disponible <= 20 ? "warning" : "success"
      }`}
      style={{ width: "15rem" }}
    >
      <Card.Body>
        <FaFileInvoiceDollar size={36} className="text-primary mb-2" />
        <h5 className="mb-1">Stock disponible de facturas</h5>
        <h3
          className={`fw-bold ${
            disponible <= 10
              ? "text-danger"
              : disponible <= 30
              ? "text-warning"
              : "text-success"
          }`}
        >
          {disponible}
        </h3>
        <div className="text-muted">en el CAI activo</div>
      </Card.Body>
    </Card>
  );
}
