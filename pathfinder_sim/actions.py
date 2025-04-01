"""
actions.py
----------
This module defines all GameAction classes for our Pathfinder simulation.
All actions now adhere to the standardized IAction interface, ensuring that each action can be executed
in a deterministic, auditable manner. It uses a data-driven logging system via logger.py.
"""

from typing import Dict, Any, Tuple
from abc import ABC, abstractmethod
from character import Character
import os
import json
from logger import format_log  # Import logging helper
from action_types import ActionType  # Import ActionType enum

# Define the IAction interface for all game actions.
class IAction(ABC):
    """
    IAction is the interface that all game actions must implement.
    It guarantees that every action has an execute() method that returns an ActionResult
    in the form of a dictionary, containing outcome details and audit metadata.
    """
    @abstractmethod
    def execute(self) -> Dict[str, Any]:
        """
        Execute the action and return a dictionary containing the outcome and audit data.
        """
        pass

class GameAction(IAction):
    """
    GameAction is the base class for all actions in the simulation.
    It implements the IAction interface and provides common properties such as the actor,
    action type, parameters, and placeholders for the rules engine and game map.
    """
    def __init__(self, actor: Character, action_type, parameters: Dict[str, Any] = None):
        self.actor = actor
        # Convert action_type to an ActionType enum if necessary.
        if isinstance(action_type, ActionType):
            self.action_type = action_type
        else:
            self.action_type = ActionType(action_type.lower())
        self.action_id: int = 0
        self.parameters = parameters if parameters is not None else {}
        self.rules_engine = None  # Will be injected by TurnManager.
        self.game_map = None      # For movement actions.

    @abstractmethod
    def execute(self) -> Dict[str, Any]:
        """
        Execute the action. Must be implemented by subclasses.
        Returns a dictionary containing the action result and audit data.
        """
        pass

class AttackAction(GameAction):
    """
    Represents an attack action where the actor attempts to hit a defender.
    Uses the combat resolver from the rules engine to compute the outcome.
    """
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
    """
    Represents a spellcasting action where the actor casts a spell on a target.
    Verifies that the actor knows the spell and has sufficient spell resources.
    """
    def __init__(self, actor: Character, target: Character, spell_name: str,
                 action_type: str = "spell"):
        super().__init__(actor, action_type)
        self.target = target
        self.spell_name = spell_name

    def execute(self) -> Dict[str, Any]:
        # Validate that the spell is known.
        if self.spell_name.lower() not in [spell.lower() for spell in self.actor.spells]:
            raise ValueError(f"{self.actor.name} does not know '{self.spell_name}'.")
        # Ensure sufficient spell slots.
        if not self.actor.spend_resource("spell_slots", 1):
            raise ValueError(f"{self.actor.name} does not have enough spell slots to cast '{self.spell_name}'.")
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
    """
    Represents a skill check action where the actor attempts to perform a skill-based task.
    The outcome is determined by the skill resolver in the rules engine.
    """
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
    """
    Represents a movement action where the actor moves from its current position to a target cell.
    Delegates pathfinding to the MovementAction class in movement.py.
    """
    def __init__(self, actor: Character, target: Tuple[int, int],
                 action_type: str = "move"):
        super().__init__(actor, action_type, parameters={"target": target})
        self.target = target

    def execute(self) -> Dict[str, Any]:
        from movement import MovementAction
        movement_action = MovementAction(self.game_map, self.actor, self.actor.position, self.target)
        start_pos = self.actor.position
        movement_result = movement_action.execute()  # Returns a dictionary.
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
    """
    Represents a full-round action, such as a charge, that combines movement and an attack.
    """
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
            return {"action": "full_round", "result": "unknown", "justification": "Full-round action type not recognized."}
