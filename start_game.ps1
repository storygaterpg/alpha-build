# PowerShell script to start the StoryGateRPG game

Write-Host "Starting StoryGateRPG Game" -ForegroundColor Green

# First set up the server
Write-Host "Setting up server..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\server"
.\reset_and_setup.ps1
Pop-Location

# Start the server (minimal version by default)
Write-Host "Starting server..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; .\run_minimal_server.ps1"

# Wait for server to initialize
Write-Host "Wait for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start the frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Both server and frontend are now running." -ForegroundColor Cyan
Write-Host "To stop the game, close both PowerShell windows." -ForegroundColor Cyan
Write-Host "" 