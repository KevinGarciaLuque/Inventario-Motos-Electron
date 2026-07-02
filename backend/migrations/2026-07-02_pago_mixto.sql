-- Migración: soporte de pago mixto (Efectivo + Tarjeta)
-- Ejecutar UNA SOLA VEZ contra la base de datos del cliente (inventario_react_vite)

ALTER TABLE ventas
  ADD COLUMN monto_tarjeta DECIMAL(10,2) DEFAULT 0 AFTER cambio;

ALTER TABLE facturas
  ADD COLUMN monto_tarjeta DECIMAL(10,2) DEFAULT 0 AFTER cambio;
