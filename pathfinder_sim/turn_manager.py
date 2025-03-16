"""
turn_manager.py
---------------

This module implements our advanced turn management and action economy system for the Pathfinder simulation.
It enforces that each character, per turn, may choose one of the following combinations for standard and move actions:
  - Option A: 2 Move actions (no standard action),
  - Option B: 1 Standard action and 1 Move action,
  - Option C: 1 Full-round action (substituting for both standard and move actions).

Additionally, each character may take 1 Swift action and unlimited Free actions.
A JSON parser is provided to process external action orders.

Classes:
  - ActionType: Enumeration for action types.
  - GameAction and its subclasses.
  - Turn: Represents a single turn and tracks per-character actions.
  - TurnManager: Manages turn sequencing, action ID assignment, and JSON parsing.
"""

import json
from enum import Enum
from typing import List, Dict, Any
from character import Character
from rules_engine import rules_engine  # Global rules engine instance

class ActionType(Enum):
    STANDARD = "standard"
    MOVE = "move"
    SWIFT = "swift"
    FREE = "free"
    FULL_ROUND = "full_round"

class GameAction:
    def __init__(self, actor: Character, action_type: ActionType, parameters: Dict[str, Any] = None):
        self.actor = actor
        self.action_type = action_type
        self.action_id: int = 0
        self.parameters = parameters if parameters is not None else {}

    def execute(self) -> Dict[str, Any]:
        raise NotImplementedError("Subclasses must implement execute()")

class AttackAction(GameAction):
    def __init__(self, actor: Character, defender: Character, weapon_bonus: int = 0,
                 weapon: Any = None, is_touch_attack: bool = False, target_flat_footed: bool = False,
                 action_type: ActionType = ActionType.STANDARD):
        super().__init__(actor, action_type)
        self.defender = defender
        self.weapon_bonus = weapon_bonus
        self.weapon = weapon
        self.is_touch_attack = is_touch_attack
        self.target_flat_footed = target_flat_footed

    def execute(self) -> Dict[str, Any]:
        from rules_engine import rules_engine
        return rules_engine.combat_resolver.resolve_attack(self)

class SpellAction(GameAction):
    def __init__(self, actor: Character, target: Character, spell_name: str,
                 action_type: ActionType = ActionType.STANDARD):
        super().__init__(actor, action_type)
        self.target = target
        self.spell_name = spell_name

    def execute(self) -> Dict[str, Any]:
        from rules_engine import rules_engine
        if self.spell_name.lower() not in [spell.lower() for spell in self.actor.spells]:
            raise ValueError(f"{self.actor.name} does not know '{self.spell_name}'.")
        return rules_engine.spell_resolver.resolve_spell(self)

class SkillCheckAction(GameAction):
    def __init__(self, actor: Character, skill_name: str, dc: int,
                 action_type: ActionType = ActionType.STANDARD):
        super().__init__(actor, action_type)
        self.skill_name = skill_name
        self.dc = dc

    def execute(self) -> Dict[str, Any]:
        from rules_engine import rules_engine
        return rules_engine.skill_resolver.resolve_skill_check(self)

class MoveAction(GameAction):
    def __init__(self, actor: Character, target: Tuple[int, int],
                 action_type: ActionType = ActionType.MOVE):
        super().__init__(actor, action_type, parameters={"target": target})
        self.target = target

    def execute(self) -> Dict[str, Any]:
        from movement import MovementAction
        from pathfinder_sim.main import game_map
        movement_action = MovementAction(game_map, self.actor.position, self.target)
        path = movement_action.execute()
        if path:
            self.actor.position = path[-1]
        result = {
            "action": "move",
            "actor": self.actor.name,
            "path": path,
            "final_position": self.actor.position,
            "justification": "Movement action executed."
        }
        return result

class FullRoundAction(GameAction):
    def __init__(self, actor: Character, parameters: Dict[str, Any],
                 action_type: ActionType = ActionType.FULL_ROUND):
        super().__init__(actor, action_type, parameters)

    def execute(self) -> Dict[str, Any]:
        if self.parameters.get("type") == "charge":
            target = self.parameters.get("target")
            from movement import MovementAction
            from pathfinder_sim.main import game_map
            movement_action = MovementAction(game_map, self.actor.position, target)
            path = movement_action.execute()
            if not path:
                return {"action": "full_round", "result": "failed", "justification": "No clear path for charge."}
            self.actor.position = target
            from rules_engine import rules_engine
            temp_attack = AttackAction(actor=self.actor, defender=self.parameters.get("defender"),
                                       weapon_bonus=0, weapon=self.parameters.get("weapon"),
                                       action_type=ActionType.FULL_ROUND)
            attack_result = rules_engine.combat_resolver.resolve_attack(temp_attack)
            return {
                "action": "full_round",
                "type": "charge",
                "path": path,
                "final_position": self.actor.position,
                "attack_result": attack_result,
                "justification": "Charge executed as a full-round action."
            }
        else:
            return {"action": "full_round", "result": "unknown", "justification": "Full-round action type not implemented."}

class Turn:
    def __init__(self, turn_number: int):
        self.turn_number = turn_number
        # Per character, record actions: "standard", "move" (list), "swift", "full_round", "free" (list).
        self.character_actions: Dict[str, Dict[str, Any]] = {}

    def add_action(self, action: GameAction) -> None:
        actor_name = action.actor.name
        if actor_name not in self.character_actions:
            self.character_actions[actor_name] = {
                "standard": None,
                "move": [],
                "swift": None,
                "full_round": None,
                "free": []
            }
        records = self.character_actions[actor_name]
        if action.action_type == ActionType.FULL_ROUND:
            if records["standard"] or records["move"]:
                raise Exception(f"{actor_name} cannot combine a full-round action with standard or move actions.")
            if records["full_round"] is not None:
                raise Exception(f"{actor_name} has already taken a full-round action this turn.")
            records["full_round"] = action
        elif action.action_type == ActionType.STANDARD:
            if records["standard"] is not None:
                raise Exception(f"{actor_name} has already taken a standard action this turn.")
            if len(records["move"]) > 1:
                raise Exception(f"{actor_name} cannot take a standard action after taking 2 move actions.")
            records["standard"] = action
        elif action.action_type == ActionType.MOVE:
            if records["standard"] and len(records["move"]) >= 1:
                raise Exception(f"{actor_name} cannot take more than 1 move action when a standard action is used.")
            elif not records["standard"] and len(records["move"]) >= 2:
                raise Exception(f"{actor_name} cannot take more than 2 move actions in a turn.")
            records["move"].append(action)
        elif action.action_type == ActionType.SWIFT:
            if records["swift"] is not None:
                raise Exception(f"{actor_name} has already taken a swift action this turn.")
            records["swift"] = action
        elif action.action_type == ActionType.FREE:
            records["free"].append(action)
        else:
            raise Exception(f"Unsupported action type: {action.action_type}")

    def get_all_actions(self) -> List[GameAction]:
        actions = []
        for rec in self.character_actions.values():
            if rec["full_round"]:
                actions.append(rec["full_round"])
            else:
                if rec["standard"]:
                    actions.append(rec["standard"])
                actions.extend(rec["move"])
            if rec["swift"]:
                actions.append(rec["swift"])
            actions.extend(rec["free"])
        return actions

class TurnManager:
    def __init__(self, rules_engine):
        self.rules_engine = rules_engine
        self.current_turn = 1
        self.action_id_counter = 1

    def new_turn(self) -> Turn:
        turn = Turn(self.current_turn)
        self.current_turn += 1
        return turn

    def assign_action_id(self, action: GameAction) -> None:
        action.action_id = self.action_id_counter
        self.action_id_counter += 1

    def process_turn(self, turn: Turn) -> List[Any]:
        results = []
        for action in turn.get_all_actions():
            self.assign_action_id(action)
            result = action.execute()
            result["turn_number"] = turn.turn_number
            result["action_id"] = action.action_id
            results.append(result)
        return results

    def parse_json_actions(self, json_input: str, characters: Dict[str, Character]) -> Turn:
        turn = Turn(self.current_turn)
        orders = json.loads(json_input)
        for order in orders:
            actor_name = order.get("actor")
            action_type_str = order.get("action_type")
            params = order.get("parameters", {})
            if actor_name not in characters:
                raise ValueError(f"Unknown actor: {actor_name}")
            actor = characters[actor_name]
            try:
                action_type = ActionType(action_type_str)
            except ValueError:
                raise ValueError(f"Invalid action type: {action_type_str}")
            if action_type == ActionType.STANDARD:
                if "defender" in params:
                    defender_name = params.get("defender")
                    if defender_name not in characters:
                        raise ValueError(f"Unknown defender: {defender_name}")
                    defender = characters[defender_name]
                    action = AttackAction(actor=actor,
                                          defender=defender,
                                          weapon_bonus=params.get("weapon_bonus", 0),
                                          weapon=params.get("weapon"),
                                          is_touch_attack=params.get("is_touch_attack", False),
                                          target_flat_footed=params.get("target_flat_footed", False),
                                          action_type=ActionType.STANDARD)
                elif "skill_name" in params:
                    action = SkillCheckAction(actor=actor,
                                              skill_name=params.get("skill_name"),
                                              dc=params.get("dc", 15),
                                              action_type=ActionType.STANDARD)
                else:
                    raise ValueError("Standard action must be an attack or a skill check.")
            elif action_type == ActionType.MOVE:
                target = tuple(params.get("target"))
                action = MoveAction(actor=actor, target=target, action_type=ActionType.MOVE)
            elif action_type == ActionType.SWIFT:
                action = SkillCheckAction(actor=actor,
                                          skill_name=params.get("skill_name"),
                                          dc=params.get("dc", 15),
                                          action_type=ActionType.SWIFT)
            elif action_type == ActionType.FULL_ROUND:
                action = FullRoundAction(actor=actor, parameters=params, action_type=ActionType.FULL_ROUND)
            elif action_type == ActionType.FREE:
                action = GameAction(actor=actor, action_type=ActionType.FREE, parameters=params)
                action.execute = lambda: {"action": "free", "actor": actor.name, "justification": "Free action executed."}
            else:
                raise ValueError(f"Unsupported action type: {action_type_str}")
            turn.add_action(action)
        return turn
