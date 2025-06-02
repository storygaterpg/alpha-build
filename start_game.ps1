# PowerShell script to start StoryGateRPG
Write-Host "Starting StoryGateRPG Game" -ForegroundColor Cyan

Write-Host "Setting up server..." -ForegroundColor Yellow
Set-Location -Path server
.\reset_and_setup.ps1
Set-Location -Path ..

Write-Host "Starting server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PWD\server'; .\run_server.ps1"

Write-Host "Wait for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PWD\frontend'; npm run dev"

Write-Host "`nBoth server and frontend are now running." -ForegroundColor Cyan
Write-Host "To stop the game, close both PowerShell windows." -ForegroundColor Cyan 