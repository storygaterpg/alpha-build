# server.py
"""
FastAPI WebSocket server for the AI-Driven Tabletop RPG.
Handles client connections, routes events to the core Python engine modules,
and broadcasts responses back to clients with improved AIService integration
and robust error handling.
"""
import json
import asyncio
from typing import Dict, List, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import logging

# Core engine imports (assumed to exist)
from config_manager import ConfigManager
from turn_manager import TurnManager
from movement import Movement
from rules_engine import RulesEngine
from logger import Logger
from ai_service import AIService
from character_sheet import CharacterSheetBuilder
from character import Character

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

app = FastAPI()
# Load config once
config = ConfigManager.load_all()
# Instantiate engine singletons
rules_engine = RulesEngine(config)
turn_manager = TurnManager(rules_engine)
movement_engine = Movement(config)
log_service = Logger(config)
ai_service = AIService()

# Manage connections and player characters
connections: List[WebSocket] = []
players: Dict[str, Character] = {}

async def send_event(ws: WebSocket, event: str, payload: Any):
    """Send an event to a single client."""
    try:
        msg = json.dumps({"event": event, "payload": payload})
        await ws.send_text(msg)
    except Exception as e:
        logger.error(f"Failed to send {event}: {e}")

async def broadcast(event: str, payload: Any):
    """Broadcast an event to all connected clients."""
    msg = json.dumps({"event": event, "payload": payload})
    dead: List[WebSocket] = []
    for conn in connections:
        try:
            await conn.send_text(msg)
        except Exception:
            dead.append(conn)
    # Clean up disconnected
    for conn in dead:
        connections.remove(conn)

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connections.append(ws)
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            event = msg.get('event')
            payload = msg.get('payload', {})
            # Dispatch inside try to catch errors per event
            await asyncio.create_task(handle_event(ws, event, payload))
    except WebSocketDisconnect:
        connections.remove(ws)
        logger.info("Client disconnected")
    except Exception as e:
        logger.exception("Unexpected WebSocket error")
        if ws in connections:
            connections.remove(ws)

async def handle_event(ws: WebSocket, event: str, payload: dict):
    """Dispatch and handle client events with error safety."""
    try:
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
    map_data = config.get_map_data()
    await send_event(ws, 'mapData', map_data)

async def send_actors(ws: WebSocket):
    actors = [a.to_dict() for a in turn_manager.actors]
    await send_event(ws, 'actors', actors)

async def handle_end_turn():
    turn_manager.end_turn()
    await broadcast('activeActor', {'id': turn_manager.current_actor.id})
    await broadcast('availableActions', {'actions': turn_manager.available_actions()})

async def handle_action_result(result: Any):
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

if __name__ == '__main__':
    uvicorn.run('server:app', host='0.0.0.0', port=8000, log_level='info')
