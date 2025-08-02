const mysql = require("mysql2/promise");
const path = require("path");
const dotenv = require("dotenv");

// ✅ Cargar el archivo .env desde la misma carpeta del ejecutable
dotenv.config({
  path: path.join(__dirname, ".env"),
});

// ⚠️ Validar que se hayan cargado las variables
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.warn(
    "⚠️ Variables de entorno no cargadas correctamente. Revisa el archivo .env"
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "inventario_react_vite",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Prueba de conexión
pool
  .getConnection()
  .then((conn) => {
    console.log("✔️ Conexión a MySQL exitosa");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ Error de conexión a MySQL:", err);
  });

module.exports = pool;
