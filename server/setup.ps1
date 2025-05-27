# PowerShell script to set up the StoryGateRPG server environment

# Create a virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating new virtual environment..." -ForegroundColor Green
    python -m venv venv
} else {
    Write-Host "Using existing virtual environment..." -ForegroundColor Green
}

# Activate the virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
pip install -r minimal_requirements.txt

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "To run the server, use: .\run_server.ps1 or .\run_minimal_server.ps1" -ForegroundColor Cyan 