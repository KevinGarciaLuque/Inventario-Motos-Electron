import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";

const generarReciboPDF = ({
  numeroFactura,
  carrito,
  subtotal,
  impuesto,
  total,
  user,
  cai = {},
  cliente_nombre,
  cliente_rtn,
  cliente_direccion,
  metodoPago = "efectivo",
  efectivo = 0,
  cambio = 0,
  montoTarjeta = 0,
  esCopia = false,
}) => {
  const alturaTotal = 150 + carrito.length * 10 + 110;

  const totalNumerico = Number(total || 0);

  const formatoLempiras = (valor) =>
    `L ${Number(valor || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, alturaTotal],
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 80
  const MARGEN = 4;
  const xLeft = MARGEN;
  const xRight = pageWidth - MARGEN; // 76
  const xCenter = pageWidth / 2;

  let posY = 10;

  const img = new Image();
  img.src = logoImage;

  const renderPDF = () => {
    // Logo centrado (imagen cuadrada)
    const logoW = 24;
    const logoH = 24;
    const logoX = (pageWidth - logoW) / 2;

    if (img.complete && img.naturalWidth) {
      doc.addImage(img, "PNG", logoX, posY, logoW, logoH);
    }
    posY += logoH + 5;

    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("MOTOREPUESTOS ", xCenter, posY, { align: "center" });
    posY += 5;
    doc.text("Y TALLER JOSE", xCenter, posY, { align: "center" });
    posY += 5;

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Sucursal Tegucigalpa", xCenter, posY, { align: "center" });
    posY += 5;
    doc.text("RTN: 0801-1995-116230", xCenter, posY, { align: "center" });
    posY += 5;
    doc.text("Tel: (504) 98736249", xCenter, posY, { align: "center" });
    posY += 5;

    doc.line(xLeft, posY, xRight, posY);
    posY += 5;

    doc.setFontSize(9);
    doc.text(`CAI: ${cai.cai_codigo || "-"}`, xLeft, posY);
    posY += 4;
    doc.text(
      `Rango: ${cai.rango_inicio || "-"} - ${cai.rango_fin || "-"}`,
      xLeft,
      posY,
    );
    posY += 4;
    doc.text(`Autorizado: ${cai.fecha_autorizacion || "-"}`, xLeft, posY);
    posY += 4;
    doc.text(`Vence: ${cai.fecha_limite_emision || "-"}`, xLeft, posY);
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("FACTURA", xCenter, posY, { align: "center" });
    posY += 5;

    if (esCopia) {
      doc.setFontSize(9);
      doc.setTextColor(255, 0, 0);
      doc.text("COPIA", xCenter, posY, { align: "center" });
      doc.setTextColor(0, 0, 0);
      posY += 5;
    }

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`No. ${numeroFactura}`, xLeft, posY);
    posY += 4;
    doc.text(`Fecha: ${new Date().toLocaleString("es-HN")}`, xLeft, posY);
    posY += 4;
    doc.text(`Cajero: ${user?.nombre || "Sistema"}`, xLeft, posY);
    posY += 4;
    doc.text(`Cliente: ${cliente_nombre || "Consumidor Final"}`, xLeft, posY);
    posY += 4;

    if (cliente_rtn) {
      doc.text(`RTN: ${cliente_rtn}`, xLeft, posY);
      posY += 4;
    }

    if (cliente_direccion) {
      doc.text(`Dirección: ${cliente_direccion}`, xLeft, posY);
      posY += 4;
    }

    doc.line(xLeft, posY, xRight, posY);
    posY += 5;

    autoTable(doc, {
      startY: posY,
      head: [["Cant", "Código", "Descripción", "P/U", "Total"]],
      body: carrito.map((item) => [
        item.cantidad ?? 0,
        item.codigo || "-",
        (item.nombre || "").substring(0, 16),
        item.precio ? Number(item.precio).toFixed(2) : "0.00",
        item.cantidad && item.precio
          ? (item.cantidad * item.precio).toFixed(2)
          : "0.00",
      ]),
      margin: { left: MARGEN, right: MARGEN },
      tableWidth: pageWidth - MARGEN * 2,
      styles: { fontSize: 7, halign: "center", textColor: 0, cellPadding: 0.8 },
      headStyles: { fillColor: [0, 0, 0], textColor: 255, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8 }, // Cant
        1: { cellWidth: 14 }, // Código
        2: { cellWidth: 24 }, // Descripción
        3: { cellWidth: 13 }, // P/U
        4: { cellWidth: 13 }, // Total
      },
    });

    posY = doc.lastAutoTable.finalY + 5;
    doc.line(xLeft, posY, xRight, posY);
    posY += 5;

    const margenIzq = xLeft;
    const margenDer = xRight;

    doc.setFontSize(8);
    doc.text("Subtotal Exonerado:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Exento:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Gravado 15%:", margenIzq, posY);
    doc.text(formatoLempiras(subtotal), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal Gravado 18%:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Descuentos/Rebajas:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("Subtotal General:", margenIzq, posY);
    doc.text(formatoLempiras(subtotal), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("ISV 15%:", margenIzq, posY);
    doc.text(formatoLempiras(impuesto), margenDer, posY, { align: "right" });
    posY += 4;

    doc.text("ISV 18%:", margenIzq, posY);
    doc.text(formatoLempiras(0), margenDer, posY, { align: "right" });
    posY += 6;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("TOTAL A PAGAR:", margenIzq, posY);
    doc.text(formatoLempiras(totalNumerico), margenDer, posY, {
      align: "right",
    });
    posY += 6;

    doc.setFont("helvetica", "normal").setFontSize(8);
    const metodo = (metodoPago || "efectivo").toLowerCase();
    const etiquetaMetodo =
      metodo === "tarjeta" ? "Tarjeta" : metodo === "mixto" ? "Mixto" : "Efectivo";
    doc.text(`Método de pago: ${etiquetaMetodo}`, margenIzq, posY);
    posY += 4;

    if (metodo === "efectivo") {
      doc.text(
        `Pago en efectivo: ${formatoLempiras(efectivo)}`,
        margenIzq,
        posY,
      );
      posY += 4;
      doc.text(`Cambio entregado: ${formatoLempiras(cambio)}`, margenIzq, posY);
      posY += 4;
    } else if (metodo === "mixto") {
      doc.text(`Pago con tarjeta: ${formatoLempiras(montoTarjeta)}`, margenIzq, posY);
      posY += 4;
      doc.text(`Pago en efectivo: ${formatoLempiras(efectivo)}`, margenIzq, posY);
      posY += 4;
      doc.text(`Cambio entregado: ${formatoLempiras(cambio)}`, margenIzq, posY);
      posY += 4;
    } else {
      doc.text("Pago realizado con tarjeta", margenIzq, posY);
      posY += 4;
    }

    posY += 4;
    doc.setFont("helvetica", "italic").setFontSize(8);
    doc.text("Su cantidad a pagar es de:", xCenter, posY, { align: "center" });
    posY += 4;

    // ✅ Total en letras (centavos correctos)
    const textoEnLetras = `"${convertirNumeroALetras(totalNumerico)}"`;
    const anchoTexto = pageWidth - MARGEN * 2; // 72mm útiles
    const lineas = doc.splitTextToSize(textoEnLetras, anchoTexto);

    lineas.forEach((linea) => {
      doc.text(linea, xCenter, posY, { align: "center" });
      posY += 4;
    });

    posY += 4;

    doc.setFont("helvetica", "bold");
    doc.text("*** GRACIAS POR SU COMPRA ***", xCenter, posY, {
      align: "center",
    });
    posY += 5;
    doc.text("La factura es beneficio de todos.", xCenter, posY, {
      align: "center",
    });
    posY += 5;
    doc.text("EXÍJALA", xCenter, posY, { align: "center" });

    window.open(doc.output("bloburl"), "_blank");
  };

  img.onload = renderPDF;
  img.onerror = renderPDF;
};

// ✅ Convertidor a letras MEJORADO (ciento/veintiún/centavos correctos)
const convertirNumeroALetras = (monto) => {
  const safe = Number(monto || 0);
  const fijo = (Math.round(safe * 100) / 100).toFixed(2);
  const [entStr, centStr] = fijo.split(".");
  const enteros = parseInt(entStr, 10);
  const centavos = parseInt(centStr, 10);

  const letrasEnteros = apocoparFinal(numeroALetrasEntero(enteros));
  const moneda = enteros === 1 ? "lempira" : "lempiras";

  if (centavos === 0) {
    return capitalizar(`${letrasEnteros} ${moneda} exactos`);
  }

  const letrasCentavos = apocoparFinal(numeroALetrasEntero(centavos));
  const monedaCent = centavos === 1 ? "centavo" : "centavos";

  return capitalizar(
    `${letrasEnteros} ${moneda} con ${letrasCentavos} ${monedaCent}`,
  );
};

const capitalizar = (txt) =>
  txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;

const apocoparFinal = (txt) => {
  // Apócope solo al final (para "un lempira", "treinta y un", "veintiún", etc.)
  return txt
    .replace(/\bveintiuno\b$/i, "veintiún")
    .replace(/\by uno\b$/i, "y un")
    .replace(/\buno\b$/i, "un");
};

const numeroALetrasEntero = (n) => {
  const num = Math.floor(Math.abs(Number(n || 0)));

  if (num === 0) return "cero";

  const unidades = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const decenas = [
    "",
    "diez",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const centenas = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  const especiales = {
    10: "diez",
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    16: "dieciséis",
    17: "diecisiete",
    18: "dieciocho",
    19: "diecinueve",
  };

  const veintis = {
    21: "veintiuno",
    22: "veintidós",
    23: "veintitrés",
    24: "veinticuatro",
    25: "veinticinco",
    26: "veintiséis",
    27: "veintisiete",
    28: "veintiocho",
    29: "veintinueve",
  };

  const menor100 = (x) => {
    if (x < 10) return unidades[x];
    if (especiales[x]) return especiales[x];
    if (x === 20) return "veinte";
    if (veintis[x]) return veintis[x];
    const d = Math.floor(x / 10);
    const u = x % 10;
    let out = decenas[d];
    if (u) out += ` y ${unidades[u]}`;
    return out;
  };

  const menor1000 = (x) => {
    if (x === 0) return "";
    if (x === 100) return "cien";
    const c = Math.floor(x / 100);
    const r = x % 100;
    let out = "";
    if (c) out += `${centenas[c]}${r ? " " : ""}`;
    if (r) out += menor100(r);
    return out.trim();
  };

  const millones = Math.floor(num / 1_000_000);
  const restoMillones = num % 1_000_000;

  const miles = Math.floor(restoMillones / 1000);
  const resto = restoMillones % 1000;

  const partes = [];

  if (millones) {
    if (millones === 1) partes.push("un millón");
    else partes.push(`${numeroALetrasEntero(millones)} millones`);
  }

  if (miles) {
    if (miles === 1) partes.push("mil");
    else partes.push(`${menor1000(miles)} mil`);
  }

  if (resto) {
    partes.push(menor1000(resto));
  }

  return partes.join(" ").replace(/\s+/g, " ").trim();
};

export default generarReciboPDF;
