@echo off
echo Forcing reinstallation of all dependencies...

:: Delete marker files to force reinstallation
if exist "venv\dependencies_installed.marker" del /f "venv\dependencies_installed.marker"
if exist "venv\requirements_installed.txt" del /f "venv\requirements_installed.txt"

:: Run the setup script
call reset_and_setup.bat

echo Forced reinstallation complete. 