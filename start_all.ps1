# PowerShell script to start both the server and frontend
# This script uses Start-Process to start both processes in separate windows

Write-Host "Starting StoryGateRPG Server and Frontend..." -ForegroundColor Green

# Stop any running Python processes that might be using the ports
Write-Host "Stopping any existing Python processes..." -ForegroundColor Yellow
taskkill /F /IM python.exe 2>$null
# Wait a moment
Start-Sleep -Seconds 1

# Start the server on port 8001 to avoid conflicts
Write-Host "Starting Python server on port 8001..." -ForegroundColor Cyan
$env:PORT = "8001"  # Set environment variable for the server port
Start-Process -FilePath "python" -ArgumentList "server.py" -NoNewWindow

# Wait a moment to ensure server starts first
Start-Sleep -Seconds 2

# Start the frontend - use a separate script to handle this
Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-ExecutionPolicy", "Bypass", "-Command", "cd frontend; npm run dev" -NoNewWindow

Write-Host "Both processes started!" -ForegroundColor Green
Write-Host "Server running on http://localhost:8001" -ForegroundColor Yellow
Write-Host "Frontend running on http://localhost:5173" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Red 