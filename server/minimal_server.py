"""
Minimal WebSocket server for StoryGate RPG

This server provides core WebSocket functionality for the frontend.
"""

import json
import asyncio
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("minimal_server")

app = FastAPI()

# Manage connections
connections: List[WebSocket] = []

# Mock data for testing
MOCK_ACTORS = [
    {
        "id": "player1",
        "name": "Player Character",
        "type": "PLAYER",
        "position": {"x": 5, "y": 5},
        "stats": {
            "health": 100,
            "maxHealth": 100,
            "mana": 50,
            "maxMana": 50,
            "strength": 15,
            "dexterity": 12,
            "intelligence": 10
        }
    },
    {
        "id": "npc1",
        "name": "Friendly NPC",
        "type": "NPC",
        "position": {"x": 8, "y": 8},
        "stats": {
            "health": 50,
            "maxHealth": 50
        }
    }
]

MOCK_MAP = {
    "id": "test_map",
    "name": "Test Map",
    "width": 15,
    "height": 15,
    "tiles": [[{"type": "normal", "walkable": True} for _ in range(15)] for _ in range(15)],
    "startPosition": {"x": 5, "y": 5}
}

async def send_event(ws: WebSocket, event: str, payload: Any):
    """Send an event to a single client."""
    try:
        msg = json.dumps({"event": event, "payload": payload})
        await ws.send_text(msg)
        logger.info(f"Sent {event} to client")
    except Exception as e:
        logger.error(f"Failed to send {event}: {e}")

async def broadcast(event: str, payload: Any):
    """Broadcast an event to all connected clients."""
    if not connections:
        logger.warning("No connections to broadcast to")
        return
        
    msg = json.dumps({"event": event, "payload": payload})
    dead: List[WebSocket] = []
    for conn in connections:
        try:
            await conn.send_text(msg)
        except Exception as e:
            logger.error(f"Failed to broadcast to client: {e}")
            dead.append(conn)
    
    # Clean up disconnected
    for conn in dead:
        if conn in connections:
            connections.remove(conn)
            
    logger.info(f"Broadcast {event} to {len(connections)} clients")

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connections.append(ws)
    logger.info(f"New client connected. Total connections: {len(connections)}")
    
    try:
        # Send initial data
        await send_event(ws, "mapData", MOCK_MAP)
        for actor in MOCK_ACTORS:
            await send_event(ws, "actors", [actor])
        
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            event = msg.get('event')
            payload = msg.get('payload', {})
            
            logger.info(f"Received event: {event} with payload: {payload}")
            
            # Handle different message types
            if event == 'move':
                actor_id = payload.get('actorId')
                position = payload.get('position')
                
                if actor_id and position:
                    # Echo back the movement
                    await broadcast("activeActor", {
                        "id": actor_id,
                        "position": position
                    })
                    
            elif event == 'chat':
                # Echo back messages as NPC responses
                text = payload.get('text', '')
                sender = payload.get('sender', 'Unknown')
                
                # Broadcast the player's message
                await broadcast("chat", {
                    "sender": sender,
                    "text": text
                })
                
                # Send an NPC response after a short delay
                await asyncio.sleep(1)
                await broadcast("chat", {
                    "sender": "NPC",
                    "text": f"You said: {text}"
                })
                
            elif event == 'requestMap':
                await send_event(ws, "mapData", MOCK_MAP)
                
            elif event == 'requestActors':
                await send_event(ws, "actors", MOCK_ACTORS)
                
            else:
                logger.warning(f"Unhandled event: {event}")
                
    except WebSocketDisconnect:
        if ws in connections:
            connections.remove(ws)
        logger.info(f"Client disconnected. Remaining connections: {len(connections)}")
    except Exception as e:
        logger.exception(f"Unexpected WebSocket error: {e}")
        if ws in connections:
            connections.remove(ws)

@app.get("/")
async def get_root():
    return {"message": "StoryGate RPG Minimal Server is running"}

if __name__ == "__main__":
    logger.info("Starting minimal server on port 8000")
    uvicorn.run("minimal_server:app", host="0.0.0.0", port=8000, log_level="info") 