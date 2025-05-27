"""
Simplified WebSocket server for StoryGate RPG

This server provides minimal WebSocket functionality to test the frontend.
It doesn't implement the actual game logic but sends dummy responses.
"""

import json
import asyncio
import logging
import random
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simple_server")

app = FastAPI()

# Manage connections
connections: List[WebSocket] = []

# Mock data
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
            "intelligence": 10,
            "constitution": 14,
            "wisdom": 8,
            "charisma": 10
        },
        "skills": [],
        "inventory": [],
        "level": 1,
        "experience": 0,
        "nextLevelExperience": 100
    },
    {
        "id": "npc1",
        "name": "Friendly NPC",
        "type": "NPC",
        "position": {"x": 8, "y": 8},
        "stats": {
            "health": 50,
            "maxHealth": 50,
            "mana": 30,
            "maxMana": 30,
            "strength": 10,
            "dexterity": 10,
            "intelligence": 10,
            "constitution": 10,
            "wisdom": 10,
            "charisma": 10
        },
        "skills": [],
        "inventory": [],
        "level": 1,
        "experience": 0,
        "nextLevelExperience": 100
    },
    {
        "id": "enemy1",
        "name": "Goblin",
        "type": "ENEMY",
        "position": {"x": 12, "y": 7},
        "stats": {
            "health": 30,
            "maxHealth": 30,
            "mana": 0,
            "maxMana": 0,
            "strength": 8,
            "dexterity": 14,
            "intelligence": 6,
            "constitution": 8,
            "wisdom": 6,
            "charisma": 4
        },
        "skills": [],
        "inventory": [],
        "level": 1,
        "experience": 0,
        "nextLevelExperience": 100
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
        msg = json.dumps({"type": event, "data": payload})
        await ws.send_text(msg)
        logger.info(f"Sent {event} to client")
    except Exception as e:
        logger.error(f"Failed to send {event}: {e}")

async def broadcast(event: str, payload: Any):
    """Broadcast an event to all connected clients."""
    if not connections:
        logger.warning("No connections to broadcast to")
        return
        
    msg = json.dumps({"type": event, "data": payload})
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
        await send_event(ws, "map", MOCK_MAP)
        await send_event(ws, "actor", MOCK_ACTORS[0])  # Send player
        await send_event(ws, "actor", MOCK_ACTORS[1])  # Send NPC
        await send_event(ws, "actor", MOCK_ACTORS[2])  # Send enemy
        
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            event_type = msg.get('type')
            data = msg.get('data', {})
            
            logger.info(f"Received event: {event_type} with data: {data}")
            
            # Handle different message types
            if event_type == "move":
                actor_id = data.get('actorId')
                position = data.get('position')
                
                if actor_id and position:
                    # Echo back the movement
                    await broadcast("actorMove", {
                        "id": actor_id,
                        "position": position
                    })
                    
            elif event_type == "chat":
                # Echo back messages as NPC responses
                message = data.get('message', '')
                sender = data.get('sender', 'Unknown')
                
                # Broadcast the player's message
                await broadcast("chat", {
                    "sender": sender,
                    "message": message,
                    "timestamp": data.get('timestamp', 0)
                })
                
                # Send an NPC response after a short delay
                await asyncio.sleep(1)
                
                npc_responses = [
                    "That's interesting!",
                    "I'm not sure about that.",
                    "Tell me more!",
                    "Yes, I agree.",
                    "Let's change the subject.",
                    "I was just thinking the same thing.",
                    "Have you heard about the dungeon to the east?",
                    "The king is looking for brave adventurers.",
                    "Watch out for goblins in these parts!"
                ]
                
                await broadcast("chat", {
                    "sender": "NPC",
                    "message": random.choice(npc_responses),
                    "timestamp": data.get('timestamp', 0) + 1000
                })
                
            elif event_type == "error":
                logger.error(f"Client reported error: {data}")
                
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
    return {"message": "StoryGate RPG Simple Server is running"}

if __name__ == "__main__":
    logger.info("Starting simple server on port 3001")
    uvicorn.run("simple_server:app", host="0.0.0.0", port=3001, log_level="info") 