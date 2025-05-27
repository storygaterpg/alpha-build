@echo off
echo Resetting and creating a fresh virtual environment...

if exist venv (
    echo Removing existing virtual environment...
    rmdir /s /q venv
)

echo Creating new virtual environment...
python -m venv venv
echo Virtual environment created.

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r minimal_requirements.txt

echo.
echo Setup complete!
echo To run the server, use: run_server.bat or run_minimal_server.bat
echo. 