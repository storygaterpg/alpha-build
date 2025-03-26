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
from action_types import ActionType  # Import the ActionType enum from our new module

class GameAction:
    def __init__(self, actor: Character, action_type, parameters: Dict[str, Any] = None):
        self.actor = actor
        # If action_type is already an instance of ActionType, use it; otherwise, convert from string.
        if isinstance(action_type, ActionType):
            self.action_type = action_type
        else:
            self.action_type = ActionType(action_type.lower())
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
        result = self.rules_engine.combat_resolver.resolve_attack(self)
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
        result["log"] = format_log("attack", log_data)
        return result

class SpellAction(GameAction):
    def __init__(self, actor: Character, target: Character, spell_name: str,
                 action_type: str = "spell"):
        super().__init__(actor, action_type)
        self.target = target
        self.spell_name = spell_name

    def execute(self) -> Dict[str, Any]:
        if self.spell_name.lower() not in [spell.lower() for spell in self.actor.spells]:
            raise ValueError(f"{self.actor.name} does not know '{self.spell_name}'.")
        result = self.rules_engine.spell_resolver.resolve_spell(self)
        log_data = {
            "spell_name": result.get("spell_name", ""),
            "caster_name": result.get("caster_name", ""),
            "target_name": result.get("target_name", ""),
            "damage": result.get("damage", "")
        }
        result["log"] = format_log("spell", log_data)
        return result

class SkillCheckAction(GameAction):
    def __init__(self, actor: Character, skill_name: str, dc: int,
                 action_type: str = "skill_check"):
        super().__init__(actor, action_type)
        self.skill_name = skill_name
        self.dc = dc

    def execute(self) -> Dict[str, Any]:
        result = self.rules_engine.skill_resolver.resolve_skill_check(self)
        result["log"] = f"Skill check by {result.get('character_name')} on {result.get('skill_name')}: Roll={result.get('roll')}, Total={result.get('total')}, DC={result.get('dc')}."
        return result

class MoveAction(GameAction):
    def __init__(self, actor: Character, target: Tuple[int, int],
                 action_type: str = "move"):
        super().__init__(actor, action_type, parameters={"target": target})
        self.target = target

    def execute(self) -> Dict[str, Any]:
        from movement import MovementAction
        # Create a MovementAction with game_map, actor, start position, and target.
        movement_action = MovementAction(self.game_map, self.actor, self.actor.position, self.target)
        start_pos = self.actor.position
        movement_result = movement_action.execute()  # This returns a dict.
        path = movement_result.get("path", [])
        if path:
            self.actor.position = path[-1]
        else:
            self.actor.position = start_pos
        result = {
            "action": "move",
            "actor": self.actor.name,
            "path": path,
            "final_position": self.actor.position,
            "justification": "Movement action executed." if path else "No valid path found."
        }
        result["log"] = format_log("move", {
            "actor_name": self.actor.name,
            "start_position": start_pos,
            "end_position": self.actor.position,
            "path": path
        })
        return result

class FullRoundAction(GameAction):
    def __init__(self, actor: Character, parameters: Dict[str, Any],
                 action_type: str = "full_round"):
        super().__init__(actor, action_type, parameters)

    def execute(self) -> Dict[str, Any]:
        if self.parameters.get("type") == "charge":
            target = self.parameters.get("target")
            from movement import MovementAction
            movement_action = MovementAction(self.game_map, self.actor, self.actor.position, target)
            movement_result = movement_action.execute()
            path = movement_result.get("path", [])
            if not path:
                return {"action": "full_round", "result": "failed", "justification": "No clear path for charge."}
            self.actor.position = target
            from rules_engine import rules_engine
            temp_attack = AttackAction(actor=self.actor, defender=self.parameters.get("defender"),
                                       weapon_bonus=0, weapon=self.parameters.get("weapon"),
                                       action_type="full_round")
            temp_attack.rules_engine = self.rules_engine
            attack_result = self.rules_engine.combat_resolver.resolve_attack(temp_attack)
            result = {
                "action": "full_round",
                "type": "charge",
                "path": path,
                "final_position": self.actor.position,
                "attack_result": attack_result,
                "justification": "Charge executed as a full-round action."
            }
            result["log"] = f"Full-round charge by {self.actor.name} to {target}. Attack result: {attack_result}."
            return result
        else:
            return {"action": "full_round", "result": "unknown", "justification": "Full-round action type not implemented."}
