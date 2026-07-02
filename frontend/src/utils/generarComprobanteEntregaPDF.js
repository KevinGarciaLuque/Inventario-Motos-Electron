import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";

const generarComprobanteEntregaPDF = ({
  numeroFactura,
  carrito = [],
  subtotal = 0,
  impuesto = 0,
  total = 0,
  user,
  cliente_nombre,
  cliente_rtn,
  cliente_direccion,
  cliente_telefono,
  esCopia = false,
  observaciones = "",
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageW = doc.internal.pageSize.getWidth(); // ~216mm
  const pageH = doc.internal.pageSize.getHeight(); // ~279mm
  const M = 12;
  const xL = M;
  const xR = pageW - M;
  const xC = pageW / 2;

  let y = 14;

  const formatoL = (v) =>
    `L ${Number(v || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const img = new Image();
  img.src = logoImage;

  const render = () => {
    // Encabezado
    if (img.complete && img.naturalWidth) {
      doc.addImage(img, "PNG", xL, y - 6, 16, 16);
    }

    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("MOTOREPUESTOS Y TALLER JOSE", xC, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("COMPROBANTE DE ENTREGA DE MERCADERÍA", xC, y, {
      align: "center",
    });
    y += 5;

    doc.setFontSize(8);
    doc.text("", xC, y, { align: "center" });
    y += 6;

    if (esCopia) {
      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.setTextColor(255, 0, 0);
      doc.text("COPIA", xR, 18, { align: "right" });
      doc.setTextColor(0, 0, 0);
    }

    doc.line(xL, y, xR, y);
    y += 6;

    // Referencia
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(`Referencia: Factura/Recibo No. ${numeroFactura || "-"}`, xL, y);
    y += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`Fecha: ${new Date().toLocaleString("es-HN")}`, xL, y);
    doc.text(`Cajero: ${user?.nombre || "Sistema"}`, xR, y, { align: "right" });
    y += 6;

    // Datos cliente (bloque)
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Datos del cliente", xL, y);
    y += 5;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`Cliente: ${cliente_nombre || "Consumidor Final"}`, xL, y);
    y += 5;

    if (cliente_rtn) {
      doc.text(`RTN: ${cliente_rtn}`, xL, y);
      y += 5;
    }

    if (cliente_telefono) {
      doc.text(`Teléfono: ${cliente_telefono}`, xL, y);
      y += 5;
    }

    if (cliente_direccion) {
      const lineasDir = doc.splitTextToSize(
        `Dirección: ${cliente_direccion}`,
        pageW - M * 2,
      );
      lineasDir.forEach((ln) => {
        doc.text(ln, xL, y);
        y += 5;
      });
    } else {
      doc.text("Dirección: -", xL, y);
      y += 5;
    }

    y += 2;
    doc.line(xL, y, xR, y);
    y += 6;

    // Tabla productos
    autoTable(doc, {
      startY: y,
      head: [["Cant", "Código", "Descripción", "P/U", "Importe"]],
      body: carrito.map((it) => [
        it.cantidad ?? 0,
        it.codigo || "-",
        it.nombre || "",
        Number(it.precio || 0).toFixed(2),
        ((it.cantidad || 0) * Number(it.precio || 0)).toFixed(2),
      ]),
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 30 },
        2: { cellWidth: 85 },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 24, halign: "right" },
      },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Totales
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Totales", xR, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`Subtotal: ${formatoL(subtotal)}`, xR, y, { align: "right" });
    y += 5;
    doc.text(`ISV: ${formatoL(impuesto)}`, xR, y, { align: "right" });
    y += 5;

    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(`TOTAL: ${formatoL(total)}`, xR, y, { align: "right" });
    y += 10;

    // Observaciones
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Observaciones:", xL, y);
    y += 6;

    doc.setFont("helvetica", "normal").setFontSize(9);
    const obs = doc.splitTextToSize(
      observaciones || "Recibí conforme la mercadería descrita.",
      pageW - M * 2,
    );
    obs.forEach((ln) => {
      doc.text(ln, xL, y);
      y += 5;
    });

    y += 10;

    // Firmas
    const firmaW = (pageW - M * 2 - 10) / 2;

    doc.line(xL, y, xL + firmaW, y);
    doc.line(xL + firmaW + 10, y, xR, y);

    doc.setFontSize(9);
    doc.text("Entregado por (Firma)", xL + firmaW / 2, y + 5, {
      align: "center",
    });
    doc.text("Recibido por (Firma)", xL + firmaW + 10 + firmaW / 2, y + 5, {
      align: "center",
    });

    y += 18;

    doc.setFontSize(8);
    doc.text("Nombre / Identidad:", xL, y);
    doc.text("Nombre / Identidad:", xL + firmaW + 10, y);
    y += 10;

    doc.text(
      `Generado desde el sistema • ${new Date().toLocaleString("es-HN")}`,
      xC,
      pageH - 10,
      {
        align: "center",
      },
    );

    window.open(doc.output("bloburl"), "_blank");
  };

  img.onload = render;
  img.onerror = render;
};

export default generarComprobanteEntregaPDF;
