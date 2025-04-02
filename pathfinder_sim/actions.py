"""
actions.py
----------
This module defines all GameAction classes for our Pathfinder simulation.
Each action implements the standardized IAction interface so that it can be executed
deterministically and logged using a data-driven logging system.
All actions integrate with the rules engine and resource management system.
"""

from typing import Dict, Any, Tuple
from abc import ABC, abstractmethod
from character import Character
import os
import json
from logger import format_log  # Logging helper to format audit messages
from action_types import ActionType  # Enum defining allowed action types

class IAction(ABC):
    """
    IAction is the interface that every game action must implement.
    It guarantees that each action provides an execute() method that returns a dictionary
    containing the action result and audit metadata.
    """
    @abstractmethod
    def execute(self) -> Dict[str, Any]:
        """
        Execute the action and return a dictionary containing the outcome and audit data.
        """
        pass

class GameAction(IAction):
    """
    Base class for all game actions.
    Provides common properties for every action:
      - actor: The Character performing the action.
      - action_type: The type of action (an instance of ActionType).
      - parameters: Optional dictionary for additional action parameters.
      - rules_engine: Injected RulesEngine instance (by the TurnManager).
      - game_map: Injected Map instance (for movement-related actions).
    """
    def __init__(self, actor: Character, action_type, parameters: Dict[str, Any] = None):
        self.actor = actor
        # Convert action_type to an ActionType enum if needed.
        if isinstance(action_type, ActionType):
            self.action_type = action_type
        else:
            self.action_type = ActionType(action_type.lower())
        self.action_id: int = 0
        self.parameters = parameters if parameters is not None else {}
        self.rules_engine = None  # To be injected by TurnManager.
        self.game_map = None      # For movement actions.

    @abstractmethod
    def execute(self) -> Dict[str, Any]:
        """
        Execute the action and return a dictionary with outcome and audit information.
        """
        pass

class AttackAction(GameAction):
    """
    Represents an attack action where the actor attempts to hit a defender.
    Uses the combat resolver in the rules engine to determine hit/miss, damage, and critical outcomes.
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
        # Use the combat resolver from the rules engine to calculate the attack outcome.
        result = self.rules_engine.combat_resolver.resolve_attack(self)
        # Prepare log data from the result.
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
        # Format the log message using the logging configuration.
        result["log"] = format_log("attack", log_data)
        return result

class SpellAction(GameAction):
    """
    Represents a spellcasting action.
    Validates that the caster knows the spell and has sufficient spell slot resources,
    then uses the spell resolver from the rules engine.
    """
    def __init__(self, actor: Character, target: Character, spell_name: str,
                 action_type: str = "spell"):
        super().__init__(actor, action_type)
        self.target = target
        self.spell_name = spell_name

    def execute(self) -> Dict[str, Any]:
        # Verify that the spell is known by the caster.
        if self.spell_name.lower() not in [spell.lower() for spell in self.actor.spells]:
            raise ValueError(f"{self.actor.name} does not know '{self.spell_name}'.")
        # Ensure that the caster has enough spell slots (resource consumption).
        if not self.actor.spend_resource("spell_slots", 1):
            raise ValueError(f"{self.actor.name} does not have enough spell slots to cast '{self.spell_name}'.")
        # Resolve the spell using the spell resolver.
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
    Represents a skill check action where the actor attempts to perform a task using a skill.
    The outcome is determined by the skill resolver in the rules engine.
    """
    def __init__(self, actor: Character, skill_name: str, dc: int,
                 action_type: str = "skill_check"):
        super().__init__(actor, action_type)
        self.skill_name = skill_name
        self.dc = dc

    def execute(self) -> Dict[str, Any]:
        result = self.rules_engine.skill_resolver.resolve_skill_check(self)
        result["log"] = (f"Skill check by {result.get('character_name')} on {result.get('skill_name')}: "
                         f"Roll={result.get('roll')}, Total={result.get('total')}, DC={result.get('dc')}.")
        return result

class MoveAction(GameAction):
    """
    Represents a movement action that moves the actor from its current position to a target cell.
    Delegates pathfinding to the MovementAction class from the movement module.
    """
    def __init__(self, actor: Character, target: Tuple[int, int],
                 action_type: str = "move"):
        super().__init__(actor, action_type, parameters={"target": target})
        self.target = target

    def execute(self) -> Dict[str, Any]:
        from movement import MovementAction as MA
        # Instantiate the movement action with current actor position and target.
        movement_action = MA(self.game_map, self.actor, self.actor.position, self.target)
        start_pos = self.actor.position
        movement_result = movement_action.execute()
        path = movement_result.get("path", [])
        # Update actor's position if a valid path is found.
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
    Represents a full-round action (e.g., a charge) that combines movement and an attack.
    Consumes the entire round so that standard and move actions cannot be taken separately.
    """
    def __init__(self, actor: Character, parameters: Dict[str, Any],
                 action_type: str = "full_round"):
        super().__init__(actor, action_type, parameters)

    def execute(self) -> Dict[str, Any]:
        if self.parameters.get("type") == "charge":
            target = self.parameters.get("target")
            from movement import MovementAction as MA
            movement_action = MA(self.game_map, self.actor, self.actor.position, target)
            movement_result = movement_action.execute()
            path = movement_result.get("path", [])
            if not path:
                return {"action": "full_round", "result": "failed", "justification": "No clear path for charge."}
            self.actor.position = target
            from rules_engine import rules_engine
            temp_attack = AttackAction(
                actor=self.actor,
                defender=self.parameters.get("defender"),
                weapon_bonus=0,
                weapon=self.parameters.get("weapon"),
                action_type="full_round"
            )
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
            result["log"] = (f"Full-round charge by {self.actor.name} to {target}. "
                             f"Attack result: {attack_result}.")
            return result
        else:
            return {"action": "full_round", "result": "unknown", "justification": "Full-round action type not recognized."}
