# PowerShell script to reset and set up the server environment
Write-Host "Setting up server environment..." -ForegroundColor Yellow

# Check if virtual environment exists
if (-not (Test-Path -Path ".\venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Green
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

# Install required packages
Write-Host "Installing required packages..." -ForegroundColor Green
pip install -r requirements.txt

Write-Host "Server setup complete!" -ForegroundColor Green 