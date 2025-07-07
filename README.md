# StoryGateRPG

A React-based RPG game with a Python backend server. This project allows you to play a tabletop-style RPG game with real-time updates via WebSocket connections.

## Quick Start

### Using npm scripts
```
npm run setup    # First-time setup
npm run start    # Start both server and frontend
```

Or run components separately:
```
npm run dev:server    # Start just the server
npm run dev:frontend  # Start just the frontend
```

### Windows with Batch Files
Double-click on `start_game.bat` to launch both the server and frontend together.

### Windows with PowerShell
Run `.\start_game.ps1` from PowerShell to launch both the server and frontend together.

## Manual Setup

If you prefer to start the components separately:

### 1. Start the Server
First, set up and run the server:

```
cd server
.\setup.bat     # Windows batch
.\setup.ps1     # PowerShell

# Then run:
.\run_server.bat        # Server (batch)
.\run_server.ps1        # Server (PowerShell)
```

### 2. Start the Frontend
In a separate terminal:

```
# Start only the frontend (after server is running)
.\start_frontend.bat    # Windows batch
.\start_frontend.ps1    # PowerShell

# Or manually:
cd frontend
npm install  # Only needed first time
npm run dev
```

## Architecture

The project consists of two main components:

1. **Server** (server.py): Python FastAPI server that handles game logic and WebSocket communication
   - Runs on port 8000
   - Provides WebSocket endpoint at /ws
   - Falls back to mock data if core game modules can't be imported

2. **Frontend** (Vite + React): User interface for the game
   - Runs on port 5173
   - Connects to the server via WebSocket
   - Built with React, Redux, and Phaser

## Troubleshooting

### Virtual Environment Issues
If you encounter module import errors, you can reset and recreate the virtual environment:

```
cd server
.\reset_and_setup.bat    # Windows batch
.\reset_and_setup.ps1    # PowerShell
```

### Connection Issues
If you see "Not connected to server" errors:

1. Make sure the server is running on port 8000
2. Check that the frontend is configured to connect to the correct URL (ws://localhost:8000/ws)
3. Restart both the server and frontend if needed

### Other Common Issues
- **Server not starting**: Check that you have Python 3.8+ installed and the virtual environment is properly set up
- **Frontend not starting**: Make sure you have Node.js and npm installed and have run `npm install` in the frontend directory

See the README files in the `server` and `frontend` directories for more detailed instructions.
