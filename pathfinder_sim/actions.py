"""
actions.py
----------

This module defines all GameAction classes for our Pathfinder simulation.
It now uses a data-driven logging system via logger.py.
"""

from typing import Dict, Any, Tuple
from character import Character
import os
import json
from logger import format_log  # Import our logging helper

class GameAction:
    def __init__(self, actor: Character, action_type: str, parameters: Dict[str, Any] = None):
        self.actor = actor
        self.action_type = action_type  # e.g., "attack", "move", etc.
        self.action_id: int = 0
        self.parameters = parameters if parameters is not None else {}
        self.rules_engine = None  # To be injected by TurnManager.
        self.game_map = None      # For movement actions.

    def execute(self) -> Dict[str, Any]:
        raise NotImplementedError("Subclasses must implement execute()")

class AttackAction(GameAction):
    def __init__(self, actor: Character, defender: Character, weapon_bonus: int = 0,
                 weapon: Any = None, is_touch_attack: bool = False, target_flat_footed: bool = False,
                 action_type: str = "attack"):
        super().__init__(actor, action_type)
        self.defender = defender
        self.weapon_bonus = weapon_bonus
        self.weapon = weapon
        self.is_touch_attack = is_touch_attack
        self.target_flat_footed = target_flat_footed

    def execute(self) -> Dict[str, Any]:
        # Resolve the attack using the rules engine.
        result = self.rules_engine.combat_resolver.resolve_attack(self)
        # Build a data dictionary for logging.
        log_data = {
            "attacker_name": result.get("attacker_name", ""),
            "defender_name": result.get("defender_name", ""),
            "natural_roll": result.get("natural_roll", ""),
            "effective_bonus": result.get("effective_bonus", ""),
            "total_attack": result.get("total_attack", ""),
            "effective_defense": result.get("effective_defense", ""),
            "hit": result.get("hit", ""),
            "critical": result.get("critical", False)
        }
        # Format log message using our logger helper.
        result["log"] = format_log("attack", log_data)
        return result
