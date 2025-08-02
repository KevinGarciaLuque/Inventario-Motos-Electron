@echo off
echo ===============================
echo  COMPILANDO BACKEND CON PKG...
echo ===============================
cd /d "%~dp0"

:: Verifica que pkg esté instalado
where pkg >nul 2>&1
if errorlevel 1 (
  echo ❌ 'pkg' no está instalado. Ejecuta:
  echo    npm install -g pkg
  pause
  exit /b
)

:: Ejecuta la compilación
pkg .

echo ===============================
echo ✅ COMPILACIÓN COMPLETA
echo Archivo generado: inventario-backend.exe
echo ===============================
pause
