@echo off
REM Arranca main.py (FastAPI + WebSocket server) como servicio persistente
cd /d "%~dp0"
:loop
python main.py
echo [%date% %time%] main.py crashed, restarting in 5s...
timeout /t 5 /nobreak >nul
goto loop
