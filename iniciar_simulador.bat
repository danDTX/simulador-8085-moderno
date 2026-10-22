@echo off
title Simulador Moderno Intel 8085 (Nativo WebView2)
echo ========================================================
echo   Iniciando Simulador Moderno Intel 8085 (Nativo WebView2)
echo ========================================================
cd /d "%~dp0"

if not exist "web\index.html" (
    echo Compilando aplicacion...
    call npm run build
)

call npm start
exit /b 0
