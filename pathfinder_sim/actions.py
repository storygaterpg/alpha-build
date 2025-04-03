"""
actions.py
----------
This module defines all GameAction classes for our Pathfinder simulation.
Each action implements the standardized IAction interface so that it can be executed
deterministically and logged using a data-driven logging system.
All actions now return an ActionResult for consistent auditability, including additional audit metadata.
"""

from typing import Dict, Any, Tuple
from abc import ABC, abstractmethod
from character import Character
import os
import json
from logger import format_log  # Logging helper to format audit messages
from action_types import ActionType  # Enum defining allowed action types
from action_result import ActionResult  # Standardized result object

# --- IAction Interface ---
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

# --- Base GameAction Class ---
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

# --- AttackAction ---
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
        result = self.rules_engine.combat_resolver.resolve_attack(self)
        # Inject audit metadata.
        result.actor_id = id(self.actor)
        result.target_id = id(self.defender)
        result.rng_seed = self.rules_engine.current_rng_seed
        return result

# --- SpellAction ---
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
        result = self.rules_engine.spell_resolver.resolve_spell(self)
        result.actor_id = id(self.actor)
        result.target_id = id(self.target)
        result.rng_seed = self.rules_engine.current_rng_seed
        return result

# --- SkillCheckAction ---
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
        result = self.rules_engine.skill_resolver.resolve_skill_check(self)
        result.actor_id = id(self.actor)
        # No target for general skill checks.
        result.rng_seed = self.rules_engine.current_rng_seed
        return result

# --- MovementAction ---
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
        result = ActionResult(action="move", actor_name=self.actor.name, result_data=result_data)
        result.actor_id = id(self.actor)
        result.rng_seed = self.rules_engine.current_rng_seed
        return result

# --- FullRoundAction ---
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
            result_data["log"] = f"Full-round charge by {self.actor.name} to {target}. Attack result: {attack_result.result_data}."
            result = ActionResult(action="full_round", actor_name=self.actor.name,
                                target_name=getattr(self.parameters.get("defender"), "name", ""),
                                result_data=result_data)
            result.actor_id = id(self.actor)
            result.target_id = id(self.parameters.get("defender")) if self.parameters.get("defender") else None
            result.rng_seed = self.rules_engine.current_rng_seed
            return result
        else:
            result_data = {"result": "unknown", "justification": "Full-round action type not recognized."}
            result = ActionResult(action="full_round", actor_name=self.actor.name, result_data=result_data)
            result.actor_id = id(self.actor)
            result.rng_seed = self.rules_engine.current_rng_seed
            return result

# --- UseItemAction ---
class UseItemAction(GameAction):
    """
    Represents an action where the actor uses an item from their inventory.
    Checks if the item exists and reduces its quantity.
    """
    def __init__(self, actor: Character, item_name: str, action_type: str = "use_item"):
        super().__init__(actor, action_type, parameters={"item_name": item_name})
        self.item_name = item_name

    def execute(self) -> ActionResult:
        # For simplicity, assume inventory is a list of dicts with 'name' and 'quantity'.
        item_found = False
        for item in self.actor.inventory:
            if item.get("name").lower() == self.item_name.lower():
                item_found = True
                if item.get("quantity", 0) > 0:
                    item["quantity"] -= 1
                    justification = f"Used item: {self.item_name}."
                else:
                    raise ValueError(f"{self.actor.name} has no {self.item_name} left.")
                break
        if not item_found:
            raise ValueError(f"{self.actor.name} does not have {self.item_name} in inventory.")
        result_data = {"justification": justification}
        result = ActionResult(action="use_item", actor_name=self.actor.name, result_data=result_data)
        result.actor_id = id(self.actor)
        result.rng_seed = self.rules_engine.current_rng_seed
        return result

# --- ConditionApplicationAction ---
class ConditionApplicationAction(GameAction):
    """
    Represents an action that applies a condition to a target character.
    """
    def __init__(self, actor: Character, target: Character, condition_name: str, duration: int = None,
                 action_type: str = "condition_application"):
        super().__init__(actor, action_type, parameters={"condition_name": condition_name, "duration": duration})
        self.target = target
        self.condition_name = condition_name
        self.duration = duration

    def execute(self) -> ActionResult:
        # Create the condition using our factory method.
        from conditions import create_condition
        condition = create_condition(self.condition_name, self.duration)
        self.target.add_condition(condition)
        result_data = {
            "justification": f"Applied condition '{condition.name}' to {self.target.name} for {condition.duration} rounds."
        }
        result = ActionResult(action="condition_application", actor_name=self.actor.name,
                                target_name=self.target.name, result_data=result_data)
        result.actor_id = id(self.actor)
        result.target_id = id(self.target)
        result.rng_seed = self.rules_engine.current_rng_seed
        return result
