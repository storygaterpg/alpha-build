"""
turn_manager.py
---------------

This module implements our advanced turn management and action economy system for the Pathfinder simulation.
It handles action sequencing, turn numbering, and parsing JSON orders into actions.
All core action classes are now imported from actions.py.
"""

import json
from typing import List, Dict, Any
from character import Character
from actions import AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction, GameAction
from action_types import ActionType  # Import ActionType from the new module

class Turn:
    def __init__(self, turn_number: int):
        self.turn_number = turn_number
        # For each character, record actions: "standard", "move" (list), "swift", "full_round", "free" (list).
        self.character_actions: Dict[str, Dict[str, Any]] = {}

    def add_action(self, action) -> None:
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

    def get_all_actions(self) -> List:
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
    def __init__(self, rules_engine, game_map):
        self.rules_engine = rules_engine
        self.game_map = game_map
        self.current_turn = 1
        self.action_id_counter = 1

    def new_turn(self) -> Turn:
        turn = Turn(self.current_turn)
        self.current_turn += 1
        return turn

    def assign_action_id(self, action) -> None:
        action.action_id = self.action_id_counter
        self.action_id_counter += 1

    def process_turn(self, turn: Turn) -> List[Any]:
        results = []
        for action in turn.get_all_actions():
            self.assign_action_id(action)
            action.rules_engine = self.rules_engine
            if action.action_type in [ActionType.MOVE, ActionType.FULL_ROUND]:
                action.game_map = self.game_map
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
                action_type = ActionType(action_type_str.lower())
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
                                          action_type="standard")
                elif "skill_name" in params:
                    action = SkillCheckAction(actor=actor,
                                              skill_name=params.get("skill_name"),
                                              dc=params.get("dc", 15),
                                              action_type="standard")
                else:
                    raise ValueError("Standard action must be an attack or a skill check.")
            elif action_type == ActionType.MOVE:
                target = tuple(params.get("target"))
                action = MoveAction(actor=actor, target=target, action_type="move")
            elif action_type == ActionType.SWIFT:
                action = SkillCheckAction(actor=actor,
                                          skill_name=params.get("skill_name"),
                                          dc=params.get("dc", 15),
                                          action_type="swift")
            elif action_type == ActionType.FULL_ROUND:
                action = FullRoundAction(actor=actor, parameters=params, action_type="full_round")
            elif action_type == ActionType.FREE:
                action = GameAction(actor=actor, action_type="free", parameters=params)
                action.execute = lambda: {"action": "free", "actor": actor.name, "justification": "Free action executed."}
            else:
                raise ValueError(f"Unsupported action type: {action_type_str}")
            turn.add_action(action)
        return turn
