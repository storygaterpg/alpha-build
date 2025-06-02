# PowerShell script to start the StoryGateRPG frontend

Write-Host "Starting StoryGateRPG Frontend" -ForegroundColor Green

# Start the frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\frontend"
npm run dev 