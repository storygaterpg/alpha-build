# PowerShell script to run the main server
Write-Host "Activating virtual environment..." -ForegroundColor Green
.\venv\Scripts\Activate.ps1

Write-Host "Starting main server on port 8000..." -ForegroundColor Green
python server.py 