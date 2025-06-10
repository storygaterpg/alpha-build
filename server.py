# server.py
"""
FastAPI WebSocket server for the AI-Driven Tabletop RPG.
Handles client connections, routes events to the core Python engine modules,
and broadcasts responses back to clients with improved AIService integration
and robust error handling.
"""
import json
import asyncio
import sys
import os
import time
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
import uvicorn
import logging

# Add server directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'server'))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("server")

app = FastAPI()

# Define a MockAIService class that will be used if the real AIService isn't available
class MockAIService:
    """Simple mock implementation of AIService for testing"""
    def chat(self, message, msg_type="in-character"):
        """Generate a mock response to a chat message"""
        logger.info(f"MockAIService: Generating response for: {message}")
        
        # Create basic mock response
        response = {
            "sender": "Dungeon Master",
            "text": f"I acknowledge your message: '{message[:30]}...' Please continue your adventure!",
        }
        
        # Add some variety based on message content
        if "hello" in message.lower() or "hi" in message.lower():
            response["text"] = "Greetings, adventurer! Welcome to the realm of StoryGate!"
        elif "help" in message.lower():
            response["text"] = "What do you need help with? I'm the Dungeon Master, at your service."
        elif "attack" in message.lower() or "fight" in message.lower():
            response["text"] = "You ready your weapon. What would you like to attack?"
        elif "look" in message.lower() or "where" in message.lower():
            response["text"] = "You find yourself in a mysterious tavern. The air is thick with stories untold."
            
        logger.info(f"MockAIService: Generated response: {response}")
        return response

# Try to import core engine modules
# If they fail, use mock implementations for testing
try:
    # Core engine imports
    from config_manager import ConfigManager
    from turn_manager import TurnManager
    from movement import Movement
    from rules_engine import RulesEngine
    from logger import Logger
    from ai_service import AIService
    from character_sheet import CharacterSheetBuilder
    from character import Character
    
    # Load config once
    config = ConfigManager.load_all()
    # Instantiate engine singletons
    rules_engine = RulesEngine(config)
    turn_manager = TurnManager(rules_engine)
    movement_engine = Movement(config)
    log_service = Logger(config)
    ai_service = AIService()
    
    logger.info("Loaded all core engine modules successfully.")
    USING_MOCK_DATA = False
    
except ImportError as e:
    logger.warning(f"Could not import core modules: {e}")
    logger.warning("Using mock data for testing. Some features will be limited.")
    USING_MOCK_DATA = True
    
    # Create mock AI service
    ai_service = MockAIService()
    
    # Mock data for testing when modules aren't available
    MOCK_ACTORS = [
        {
            "id": "player1",
            "name": "Player Character",
            "type": "player",
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
                "wisdom": 13,
                "charisma": 11
            },
            "skills": [],
            "inventory": [],
            "level": 1,
            "experience": 0,
            "nextLevelExperience": 1000
        },
        {
            "id": "npc1",
            "name": "Friendly NPC",
            "type": "npc",
            "position": {"x": 8, "y": 8},
            "stats": {
                "health": 50,
                "maxHealth": 50,
                "mana": 20,
                "maxMana": 20,
                "strength": 10,
                "dexterity": 10,
                "intelligence": 12,
                "constitution": 10,
                "wisdom": 14,
                "charisma": 16
            },
            "skills": [],
            "inventory": [],
            "level": 1,
            "experience": 0,
            "nextLevelExperience": 1000
        },
        {
            "id": "warrior1",
            "name": "Elite Warrior",
            "type": "warrior",
            "position": {"x": 3, "y": 7},
            "stats": {
                "health": 120,
                "maxHealth": 120,
                "mana": 30,
                "maxMana": 30,
                "strength": 18,
                "dexterity": 14,
                "intelligence": 8,
                "constitution": 16,
                "wisdom": 10,
                "charisma": 12
            },
            "skills": [],
            "inventory": [],
            "level": 3,
            "experience": 2500,
            "nextLevelExperience": 4000
        },
        {
            "id": "rob1",
            "name": "Rob",
            "type": "rob",
            "position": {"x": 1, "y": 1},
            "stats": {
                "health": 85,
                "maxHealth": 85,
                "mana": 40,
                "maxMana": 40,
                "strength": 14,
                "dexterity": 16,
                "intelligence": 13,
                "constitution": 12,
                "wisdom": 15,
                "charisma": 14
            },
            "skills": [],
            "inventory": [],
            "level": 2,
            "experience": 1200,
            "nextLevelExperience": 2000
        }
    ]

    MOCK_MAP = {
        "id": "test_map",
        "name": "Test Map",
        "width": 15,
        "height": 15,
        "tiles": [[{"type": "normal", "walkable": True} for _ in range(15)] for _ in range(15)],
        "startPosition": {"x": 5, "y": 5},
        "backgroundImage": "/assets/maps/test-map2.png",
        "gridSize": 64
    }

# Manage connections and player characters
connections: List[WebSocket] = []
players: Dict[str, Any] = {}  # Will hold Character objects or mock data

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
        if USING_MOCK_DATA:
            await send_event(ws, "mapData", MOCK_MAP)
            await send_event(ws, "actors", MOCK_ACTORS)
        else:
            # Use actual game data
            await send_map(ws)
            await send_actors(ws)
            # Broadcast turn and actions
            await broadcast('activeActor', {'id': turn_manager.current_actor.id})
            await broadcast('availableActions', {'actions': turn_manager.available_actions()})
        
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            event = msg.get('event')
            payload = msg.get('payload', {})
            
            logger.info(f"Received event: {event} with payload: {payload}")
            
            # Dispatch inside try to catch errors per event
            await asyncio.create_task(handle_event(ws, event, payload))
    except WebSocketDisconnect:
        if ws in connections:
            connections.remove(ws)
        logger.info(f"Client disconnected. Remaining connections: {len(connections)}")
    except Exception as e:
        logger.exception(f"Unexpected WebSocket error: {e}")
        if ws in connections:
            connections.remove(ws)

async def handle_event(ws: WebSocket, event: str, payload: dict):
    """Dispatch and handle client events with error safety."""
    try:
        if USING_MOCK_DATA:
            # Handle events with mock data
            if event == 'requestMap':
                await send_event(ws, "mapData", MOCK_MAP)
                
            elif event == 'requestActors':
                await send_event(ws, "actors", MOCK_ACTORS)
                
            elif event == 'move':
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
                
            # Handle chat messages using AIService
            elif event == 'chat_message':
                content = payload.get('content', '')
                msg_type = payload.get('type', 'in-character')
                character_id = payload.get('characterId', 'player1')
                
                # Get the character name
                character_name = "Player"
                for actor in MOCK_ACTORS:
                    if actor['id'] == character_id:
                        character_name = actor['name']
                        break
                
                # Log the received message
                logger.info(f"Chat message from {character_name}: {content}")
                
                # Create a unique ID for the user message - do this BEFORE any try/except
                user_msg_id = f"msg_{int(time.time())}_{id(content)}"
                
                # First broadcast the original message - do this BEFORE any try/except to ensure it always happens
                user_msg = {
                    "id": user_msg_id,
                    "sender": character_name,
                    "content": content,
                    "timestamp": time.time(),
                    "type": msg_type
                }
                logger.info(f"Broadcasting user message: {user_msg}")
                await broadcast("chat_message", user_msg)
                
                # Now try to generate an AI response
                try:
                    # Generate response using AI service (will work with both real and mock implementation)
                    logger.info(f"Generating AI response for message: {content}")
                    response = ai_service.chat(content, msg_type)
                    logger.info(f"AI response generated: {response}")
                    
                    # Create a unique ID for the AI response
                    ai_msg_id = f"msg_{int(time.time())}_{id(response)}"
                    
                    # Then broadcast AI response
                    ai_msg = {
                        "id": ai_msg_id,
                        "sender": response["sender"],
                        "content": response["text"],
                        "timestamp": time.time(),
                        "type": "system"
                    }
                    logger.info(f"Broadcasting AI response: {ai_msg}")
                    await broadcast("chat_message", ai_msg)
                    
                except Exception as e:
                    logger.exception(f"Error generating AI response: {e}")
                    # Send error message if something goes wrong
                    error_msg = {
                        "id": f"err_{int(time.time())}",
                        "sender": "System",
                        "content": f"Error processing message: {str(e)}",
                        "timestamp": time.time(),
                        "type": "system"
                    }
                    await broadcast("chat_message", error_msg)
                
            else:
                if USING_MOCK_DATA:
                    logger.warning(f"Unhandled event in mock mode: {event}")
                
        else:
            # Handle events with real game engine
            if event == 'join':
                name = payload.get('name')
                if not name:
                    raise ValueError("Missing player name")
                character = Character(name=name)
                players[name] = character
                turn_manager.add_player(character)
                await send_map(ws)
                await send_actors(ws)
                # Broadcast turn and actions
                await broadcast('activeActor', {'id': turn_manager.current_actor.id})
                await broadcast('availableActions', {'actions': turn_manager.available_actions()})

            elif event == 'requestMap':
                await send_map(ws)

            elif event == 'requestActors':
                await send_actors(ws)

            elif event == 'requestAction':
                action = payload.get('action')
                actor = turn_manager.current_actor
                if action == 'Move':
                    tiles = movement_engine.get_reachable_tiles(actor)
                    await send_event(ws, 'movementOverlay', {'tiles': tiles})
                elif action == 'Attack':
                    targets = rules_engine.get_attackable_targets(actor)
                    await send_event(ws, 'movementOverlay', {'tiles': targets})
                elif action == 'End Turn':
                    await handle_end_turn()
                else:
                    raise ValueError(f"Unknown action: {action}")

            elif event == 'move':
                x, y = payload.get('x'), payload.get('y')
                result = turn_manager.perform_action('Move', {'x': x, 'y': y})
                await handle_action_result(result)

            elif event == 'attack':
                target_id = payload.get('targetId')
                result = turn_manager.perform_action('Attack', {'target_id': target_id})
                await handle_action_result(result)

            elif event == 'endTurn':
                await handle_end_turn()

            elif event == 'chat':
                text = payload.get('text', '')
                # Broadcast player message
                await broadcast('chat', {'sender': name_or_default(ws), 'text': text})
                # AI DM response asynchronously with thread
                try:
                    ai_resp = await asyncio.to_thread(ai_service.chat, text)
                    await broadcast('chat', ai_resp)
                except Exception as ai_e:
                    logger.exception("AIService.chat failed")
                    await broadcast('chat', {'sender': 'DM', 'text': 'Error generating response.'})

            elif event == 'requestSheet':
                actor_id = payload.get('actorId')
                # Build sheet in thread
                sheet_char = players.get(actor_id) or turn_manager.get_actor_by_id(actor_id)
                if not sheet_char:
                    raise ValueError(f"Actor {actor_id} not found for sheet")
                sheet = await asyncio.to_thread(CharacterSheetBuilder.build, sheet_char)
                await send_event(ws, 'sheetData', sheet.to_dict())

            else:
                logger.warning(f"Unhandled event: {event}")
                await send_event(ws, 'error', {'message': f"Unknown event {event}"})

    except Exception as e:
        logger.exception(f"Error handling {event}")
        await send_event(ws, 'error', {'message': str(e)})

async def send_map(ws: WebSocket):
    if USING_MOCK_DATA:
        await send_event(ws, "mapData", MOCK_MAP)
    else:
        map_data = config.get_map_data()
        await send_event(ws, 'mapData', map_data)

async def send_actors(ws: WebSocket):
    if USING_MOCK_DATA:
        await send_event(ws, "actors", MOCK_ACTORS)
    else:
        actors = [a.to_dict() for a in turn_manager.actors]
        await send_event(ws, 'actors', actors)

async def handle_end_turn():
    if USING_MOCK_DATA:
        # Simple turn handling for mock mode
        await broadcast('activeActor', {'id': 'player1'})
        await broadcast('availableActions', {'actions': ['Move', 'Attack', 'End Turn']})
    else:
        turn_manager.end_turn()
        await broadcast('activeActor', {'id': turn_manager.current_actor.id})
        await broadcast('availableActions', {'actions': turn_manager.available_actions()})

async def handle_action_result(result: Any):
    if USING_MOCK_DATA:
        # Simple result handling for mock mode
        await broadcast('actionResult', {'logs': ['Action performed']})
        return

    # Actors update
    if hasattr(result, 'actors') and result.actors:
        actors = [a.to_dict() for a in result.actors]
        await broadcast('actors', actors)
    # Overlay update
    if hasattr(result, 'movement_overlay') and result.movement_overlay is not None:
        await broadcast('movementOverlay', {'tiles': result.movement_overlay})
    # Logs
    logs = getattr(result, 'logs', [])
    await broadcast('actionResult', {'logs': logs})

def name_or_default(ws: WebSocket) -> str:
    # placeholder: derive name from ws mapping if stored
    return 'Player'

@app.get("/")
async def get_root():
    mode = "MOCK MODE" if USING_MOCK_DATA else "FULL ENGINE MODE"
    return {
        "message": f"StoryGate RPG Server is running in {mode}",
        "websocket_endpoint": "/ws",
        "connections": len(connections)
    }

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": f"Internal server error: {str(exc)}"}
    )

if __name__ == '__main__':
    mode = "MOCK MODE" if USING_MOCK_DATA else "FULL ENGINE MODE"
    port = int(os.environ.get('PORT', 8000))
    logger.info(f"Starting server on port {port} in {mode}")
    uvicorn.run(app, host='0.0.0.0', port=port, log_level='info') 