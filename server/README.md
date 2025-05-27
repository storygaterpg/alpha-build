# StoryGateRPG Server

This is the server component for the StoryGateRPG game. It provides a WebSocket server that the frontend can connect to for real-time game communication.

## Setup

### Prerequisites
- Python 3.8 or higher

### Installation

#### Windows (using batch files)
1. Double-click on `setup.bat` to create a virtual environment and install dependencies
2. After setup completes, you can run either:
   - `run_server.bat` to start the full featured server (port 8000)
   - `run_minimal_server.bat` to start the simplified server (port 8000)

#### Windows (using PowerShell)
1. Open PowerShell in the server directory
2. Run `.\setup.ps1` to create a virtual environment and install dependencies
3. Run one of:
   - `.\run_server.ps1` to start the full featured server
   - `.\run_minimal_server.ps1` to start the simplified server

## Server Options

### Full Server (server.py)
- Complete implementation with all game features
- Includes game logic, turn management, rules engine
- WebSocket endpoint: `/ws`
- Default port: 8000

### Minimal Server (minimal_server.py)
- Simplified implementation for testing frontend connections
- Provides basic WebSocket functionality with mock data
- WebSocket endpoint: `/ws`
- Default port: 8000
- Use this if you encounter issues with the full server

## Server API

Both servers implement the following WebSocket events:

### Client to Server
- `requestMap`: Request the game map
- `requestActors`: Request actor data
- `move`: Move an actor to a new position
- `chat`: Send a chat message

### Server to Client
- `mapData`: Game map data
- `actors`: Actor data
- `activeActor`: Currently active actor
- `chat`: Chat messages

## Troubleshooting

### Module Import Errors
If you encounter module import errors (e.g., `ModuleNotFoundError: No module named 'fastapi'`):

1. Use the reset scripts to create a fresh environment:
   ```
   .\reset_and_setup.bat    # Windows batch
   .\reset_and_setup.ps1    # PowerShell
   ```

2. These scripts will:
   - Delete the existing virtual environment
   - Create a new one
   - Install the minimal dependencies needed for the server

### Other Common Issues
1. Make sure you have Python 3.8+ installed
2. Check that you've activated the virtual environment before running the server
3. Try running the minimal server if the full server has issues
4. If dependencies fail to install, try running:
   ```
   pip install --upgrade pip
   pip install -r minimal_requirements.txt
   ```
5. Check server logs for error messages 