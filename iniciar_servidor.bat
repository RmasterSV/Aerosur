@echo off
title AereoSur - Servidor de Vuelos
echo ===================================================
echo   Aereosur - Iniciando Terminal de Control
echo ===================================================
echo.
echo Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado o no se encuentra en las variables de entorno (PATH).
    echo Por favor, instala Python 3 y vuelve a intentarlo.
    pause
    exit /b
)

echo Iniciando el servidor...
python run.py
echo.
pause
