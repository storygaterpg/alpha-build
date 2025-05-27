@echo off
echo Creating/activating virtual environment...
if not exist venv (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Using existing virtual environment.
)

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r minimal_requirements.txt

echo.
echo Setup complete!
echo To run the server, use: run_server.bat or run_minimal_server.bat
echo. 