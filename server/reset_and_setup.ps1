# PowerShell script to reset and set up the StoryGateRPG server environment

Write-Host "Resetting and creating a fresh virtual environment..." -ForegroundColor Yellow

if (Test-Path "venv") {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Red
    Remove-Item -Recurse -Force venv
}

# Create a new virtual environment
Write-Host "Creating new virtual environment..." -ForegroundColor Green
python -m venv venv

# Activate the virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
pip install -r minimal_requirements.txt

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "To run the server, use: .\run_server.ps1 or .\run_minimal_server.ps1" -ForegroundColor Cyan 