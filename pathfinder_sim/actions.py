"""
actions.py
----------
This module defines all GameAction classes for our Pathfinder simulation.
Each action implements the standardized IAction interface so that it can be executed
deterministically and logged using a data-driven logging system.
All actions now return an ActionResult (converted to a dictionary via to_dict())
for consistent auditability and integration with the narrative/logging layers.
"""

from typing import Dict, Any, Tuple
from abc import ABC, abstractmethod
from character import Character
import os
import json
from logger import format_log  # Logging helper to format audit messages
from action_types import ActionType  # Enum defining allowed action types
from action_result import ActionResult  # Our standardized result object

class IAction(ABC):
    """
    IAction is the interface that every game action must implement.
    It guarantees that each action provides an execute() method that returns an ActionResult.
    """
    @abstractmethod
    def execute(self) -> ActionResult:
        """
        Execute the action and return an ActionResult containing the outcome and audit data.
        """
        pass

class GameAction(IAction):
    """
    Base class for all game actions.
    Provides common properties for every action.
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
    def execute(self) -> ActionResult:
        """
        Execute the action and return an ActionResult with outcome and audit information.
        """
        pass

class AttackAction(GameAction):
    """
    Represents an attack action where the actor attempts to hit a defender.
    Uses the combat resolver to determine hit/miss, damage, and critical outcomes.
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

    def execute(self) -> ActionResult:
        # Delegate resolution to the combat resolver.
        action_result = self.rules_engine.combat_resolver.resolve_attack(self)
        # Log formatting is already handled in the resolver (if needed).
        return action_result

class SpellAction(GameAction):
    """
    Represents a spellcasting action.
    Validates that the caster knows the spell and has enough spell slot resource,
    then uses the spell resolver.
    """
    def __init__(self, actor: Character, target: Character, spell_name: str,
                 action_type: str = "spell"):
        super().__init__(actor, action_type)
        self.target = target
        self.spell_name = spell_name

    def execute(self) -> ActionResult:
        if self.spell_name.lower() not in [s.lower() for s in self.actor.spells]:
            raise ValueError(f"{self.actor.name} does not know '{self.spell_name}'.")
        if not self.actor.spend_resource("spell_slots", 1):
            raise ValueError(f"{self.actor.name} does not have enough spell slots to cast '{self.spell_name}'.")
        action_result = self.rules_engine.spell_resolver.resolve_spell(self)
        return action_result

class SkillCheckAction(GameAction):
    """
    Represents a skill check action.
    Uses the skill resolver to determine the outcome of a skill check.
    """
    def __init__(self, actor: Character, skill_name: str, dc: int,
                 action_type: str = "skill_check"):
        super().__init__(actor, action_type)
        self.skill_name = skill_name
        self.dc = dc

    def execute(self) -> ActionResult:
        action_result = self.rules_engine.skill_resolver.resolve_skill_check(self)
        return action_result

class MoveAction(GameAction):
    """
    Represents a movement action that moves the actor from its current position to a target cell.
    Delegates pathfinding to the MovementAction class from the movement module.
    """
    def __init__(self, actor: Character, target: Tuple[int, int],
                 action_type: str = "move"):
        super().__init__(actor, action_type, parameters={"target": target})
        self.target = target

    def execute(self) -> ActionResult:
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
        result_data = {
            "actor": self.actor.name,
            "path": path,
            "final_position": self.actor.position,
            "justification": "Movement action executed." if path else "No valid path found."
        }
        # Format log message.
        result_data["log"] = format_log("move", {
            "actor_name": self.actor.name,
            "start_position": start_pos,
            "end_position": self.actor.position,
            "path": path
        })
        return ActionResult(action="move", actor_name=self.actor.name, result_data=result_data)

class FullRoundAction(GameAction):
    """
    Represents a full-round action (e.g., a charge) that combines movement and an attack.
    Consumes the entire round so that standard and move actions cannot be taken separately.
    """
    def __init__(self, actor: Character, parameters: Dict[str, Any],
                 action_type: str = "full_round"):
        super().__init__(actor, action_type, parameters)

    def execute(self) -> ActionResult:
        if self.parameters.get("type") == "charge":
            target = self.parameters.get("target")
            from movement import MovementAction as MA
            movement_action = MA(self.game_map, self.actor, self.actor.position, target)
            movement_result = movement_action.execute()
            path = movement_result.get("path", [])
            if not path:
                result_data = {"result": "failed", "justification": "No clear path for charge."}
                return ActionResult(action="full_round", actor_name=self.actor.name, result_data=result_data)
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
            result_data = {
                "type": "charge",
                "path": path,
                "final_position": self.actor.position,
                "attack_result": attack_result.result_data,
                "justification": "Charge executed as a full-round action."
            }
            result_data["log"] = (f"Full-round charge by {self.actor.name} to {target}. Attack result: {attack_result.result_data}.")
            return ActionResult(action="full_round", actor_name=self.actor.name,
                                target_name=getattr(self.parameters.get("defender"), "name", None),
                                result_data=result_data)
        else:
            result_data = {"result": "unknown", "justification": "Full-round action type not recognized."}
            return ActionResult(action="full_round", actor_name=self.actor.name, result_data=result_data)
