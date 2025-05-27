# PowerShell script to start the StoryGateRPG frontend

Write-Host "Starting StoryGateRPG Frontend" -ForegroundColor Green

# Start the frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Push-Location "$PSScriptRoot\frontend"
npm run dev 