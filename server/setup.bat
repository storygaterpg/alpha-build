@echo off
echo Setting up server environment...

:: Check if virtual environment exists and create if necessary
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate the virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Install required packages
echo Installing required packages...
pip install -r requirements.txt

echo Server setup complete!
echo To run the server, use: run_server.bat 