# PowerShell script to run the StoryGateRPG server

# Activate the virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

# Run the server
Write-Host "Starting server..." -ForegroundColor Green
python server.py 