@echo off
echo Starting StoryGateRPG Game

echo Setting up server...
cd server
call reset_and_setup.bat
cd ..

echo Starting server...
start cmd /k "cd server && call run_server.bat"

echo Wait for server to initialize...
timeout /t 5

echo Starting frontend...
cd frontend
start cmd /k npm run dev
cd ..

echo.
echo Both server and frontend are now running.
echo To stop the game, close both command windows.
echo. 