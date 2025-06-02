@echo off
echo Activating virtual environment...
call venv\Scripts\activate.bat || (
    echo Failed to activate virtual environment
    exit /b 1
)

echo Starting server on port 8000...
python server.py || (
    echo Failed to start server
    exit /b 1
) 