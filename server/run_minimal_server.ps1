# PowerShell script to run the StoryGateRPG minimal server

# Activate the virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

# Run the server
Write-Host "Starting minimal server..." -ForegroundColor Green
python minimal_server.py 