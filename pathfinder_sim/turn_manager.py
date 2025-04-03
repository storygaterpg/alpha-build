"""
turn_manager.py
---------------
This module implements advanced turn management and action sequencing.
Actions now return structured ActionResult objects.
We've extended the JSON parser to support the new 'maneuver' action type.
"""

import json
from typing import List, Dict, Any
from character import Character
from actions import (AttackAction, SpellAction, SkillCheckAction, MoveAction,
                     FullRoundAction, GameAction, IAction)
from action_types import ActionType
from action_result import ActionResult
# Import new combat maneuver actions.
from combat_maneuvers import BullRushAction, GrappleAction

class Turn:
    """
    Represents a single turn in the simulation.
    Maintains a dictionary of actions for each actor, categorized by action type.
    """
    def __init__(self, turn_number: int):
        self.turn_number = turn_number
        # Each actor's actions are stored in a dict including the actor reference.
        self.character_actions: Dict[str, Dict[str, Any]] = {}

    def add_action(self, action: IAction) -> None:
        """
        Add an action to the turn for the corresponding actor.
        Enforces action economy limits.
        """
        actor_name = action.actor.name
        if actor_name not in self.character_actions:
            self.character_actions[actor_name] = {
                "actor": action.actor,
                "immediate": [],
                "readied": [],
                "delayed": None,
                "standard": None,
                "move": [],
                "swift": None,
                "full_round": None,
                "free": []
            }
        records = self.character_actions[actor_name]
        # Enforce limits based on action type.
        if action.action_type == ActionType.FULL_ROUND:
            if records["standard"] or records["move"]:
                raise Exception(f"{actor_name} cannot combine a full-round action with standard or move actions.")
            if records["full_round"] is not None:
                raise Exception(f"{actor_name} has already taken a full-round action this turn.")
            records["full_round"] = action
        elif action.action_type == ActionType.STANDARD:
            if records["standard"] is not None:
                raise Exception(f"{actor_name} has already taken a standard action this turn.")
            # If more than one move action has been taken, a standard action is not allowed.
            if len(records["move"]) > 1:
                raise Exception(f"{actor_name} cannot take a standard action after taking 2 move actions.")
            records["standard"] = action
        elif action.action_type == ActionType.MOVE:
            # If a standard action is taken, only one move action is allowed.
            if records["standard"] and len(records["move"]) >= 1:
                raise Exception(f"{actor_name} cannot take more than 1 move action when a standard action is used.")
            # Otherwise, allow up to two move actions.
            elif not records["standard"] and len(records["move"]) >= 2:
                raise Exception(f"{actor_name} cannot take more than 2 move actions in a turn.")
            records["move"].append(action)
        elif action.action_type == ActionType.SWIFT:
            if records["swift"] is not None:
                raise Exception(f"{actor_name} has already taken a swift action this turn.")
            records["swift"] = action
        elif action.action_type == ActionType.FREE:
            records["free"].append(action)
        elif action.action_type == ActionType.IMMEDIATE:
            records["immediate"].append(action)
        elif action.action_type == ActionType.READIED:
            records["readied"].append(action)
        elif action.action_type == ActionType.DELAYED:
            if records["delayed"] is not None:
                raise Exception(f"{actor_name} has already delayed an action this turn.")
            records["delayed"] = action
        elif action.action_type == ActionType.MANEUVER:
            # Maneuver actions can be stored as standard actions or in their own category.
            # For simplicity, we treat them like standard actions.
            if records["standard"] is not None:
                raise Exception(f"{actor_name} has already taken a standard action; cannot perform an additional maneuver.")
            records["standard"] = action
        else:
            raise Exception(f"Unsupported action type: {action.action_type}")

    def get_ordered_actions(self, rules_engine) -> List[IAction]:
        """
        Compute initiative order and return a list of actions in the order they will be processed.
        For non-delayed actors, initiative is computed as a d20 roll plus the actor's DEX modifier,
        and actors are sorted in descending order (with tie-breakers).
        Delayed actions are appended later in ascending order.
        """
        non_delayed = {}
        delayed = {}
        for actor_name, record in self.character_actions.items():
            actor = record["actor"]
            init_roll = rules_engine.dice.roll_d20()
            dex_mod = actor.get_modifier("DEX")
            initiative_score = init_roll + dex_mod
            if record["delayed"] is None:
                non_delayed[actor_name] = (record, initiative_score, dex_mod)
            else:
                delayed[actor_name] = (record, initiative_score, dex_mod)

        # Sort non-delayed actors in descending order.
        sorted_non_delayed = sorted(
            non_delayed.keys(),
            key=lambda name: (non_delayed[name][1], non_delayed[name][2], name),
            reverse=True
        )
        # Sort delayed actors in ascending order (so they act later).
        sorted_delayed = sorted(
            delayed.keys(),
            key=lambda name: (delayed[name][1], delayed[name][2], name)
        )
        
        ordered_actions: List[IAction] = []
        # Process non-delayed actors first.
        for actor_name in sorted_non_delayed:
            record = non_delayed[actor_name][0]
            # Immediate actions always go first.
            ordered_actions.extend(record["immediate"])
            # If a full-round action exists, it replaces standard and move actions.
            if record["full_round"]:
                ordered_actions.append(record["full_round"])
            else:
                if record["standard"]:
                    ordered_actions.append(record["standard"])
                ordered_actions.extend(record["move"])
            # Then swift actions.
            if record["swift"]:
                ordered_actions.append(record["swift"])
            # Then free actions.
            ordered_actions.extend(record["free"])
            # And readied actions.
            ordered_actions.extend(record["readied"])

        # Append delayed actions after non-delayed actions.
        for actor_name in sorted_delayed:
            record = delayed[actor_name][0]
            if record["delayed"]:
                ordered_actions.append(record["delayed"])
            # Optionally, process immediate and readied actions for delayed actors as well.
            ordered_actions.extend(record["immediate"])
            ordered_actions.extend(record["readied"])
            # Note: Standard/move/swift/free actions are skipped if the actor has delayed an action.

        return ordered_actions

class TurnManager:
    """
    Manages the overall turn sequence and action processing.
    Responsible for assigning unique action IDs, injecting the rules engine and game map into actions,
    processing all actions in initiative order, and updating actor states after each turn.
    """
    def __init__(self, rules_engine, game_map):
        self.rules_engine = rules_engine
        self.game_map = game_map
        self.current_turn = 1
        self.action_id_counter = 1

    def new_turn(self) -> Turn:
        """
        Create and return a new Turn instance with a unique turn number.
        """
        turn = Turn(self.current_turn)
        self.current_turn += 1
        return turn

    def assign_action_id(self, action: IAction) -> None:
        """
        Assign a unique action ID to an action.
        """
        action.action_id = self.action_id_counter
        self.action_id_counter += 1

    def process_turn(self, turn: Turn) -> List[Dict[str, Any]]:
        """
        Process a turn by executing actions in initiative order.
        Inject required dependencies, and update each actor's state after the turn.
        Returns a list of action result dictionaries.
        """
        results = []
        ordered_actions = turn.get_ordered_actions(self.rules_engine)
        for action in ordered_actions:
            self.assign_action_id(action)
            action.rules_engine = self.rules_engine
            if action.action_type in [ActionType.MOVE, ActionType.FULL_ROUND]:
                action.game_map = self.game_map
            action_result = action.execute()
            # Inject turn number and action ID into the result.
            action_result = type(action_result)(
                action=action_result.action,
                actor_name=action_result.actor_name,
                target_name=action_result.target_name,
                result_data=action_result.result_data,
                log=action_result.log,
                turn_number=turn.turn_number,
                action_id=action.action_id
            )
            results.append(action_result.to_dict())
        for actor_name, record in turn.character_actions.items():
            record["actor"].update_state()
        return results

    def parse_json_actions(self, json_input: str, characters: Dict[str, Character]) -> Turn:
        """
        Parse a JSON string of orders into a Turn instance populated with IAction objects.
        Each order must include 'actor', 'action_type', and 'parameters'.
        """
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
            # Create the appropriate action object based on type.
            if action_type == ActionType.STANDARD:
                if "defender" in params:
                    defender_name = params.get("defender")
                    if defender_name not in characters:
                        raise ValueError(f"Unknown defender: {defender_name}")
                    defender = characters[defender_name]
                    action = AttackAction(
                        actor=actor,
                        defender=defender,
                        weapon_bonus=params.get("weapon_bonus", 0),
                        weapon=params.get("weapon"),
                        is_touch_attack=params.get("is_touch_attack", False),
                        target_flat_footed=params.get("target_flat_footed", False),
                        action_type="standard"
                    )
                elif "skill_name" in params:
                    action = SkillCheckAction(
                        actor=actor,
                        skill_name=params.get("skill_name"),
                        dc=params.get("dc", 15),
                        action_type="standard"
                    )
                else:
                    raise ValueError("Standard action must be an attack or a skill check.")
            elif action_type == ActionType.MOVE:
                target = tuple(params.get("target"))
                action = MoveAction(actor=actor, target=target, action_type="move")
            elif action_type == ActionType.SWIFT:
                action = SkillCheckAction(
                    actor=actor,
                    skill_name=params.get("skill_name"),
                    dc=params.get("dc", 15),
                    action_type="swift"
                )
            elif action_type == ActionType.FULL_ROUND:
                action = FullRoundAction(actor=actor, parameters=params, action_type="full_round")
            elif action_type == ActionType.MANEUVER:
                # New: For maneuver actions, we expect a 'maneuver_type' field.
                maneuver_type = params.get("maneuver_type")
                if not maneuver_type:
                    raise ValueError("Maneuver action must specify a 'maneuver_type'.")
                # Instantiate the appropriate maneuver action based on the type.
                if maneuver_type.lower() == "bull_rush":
                    defender_name = params.get("defender")
                    if defender_name not in characters:
                        raise ValueError(f"Unknown defender: {defender_name}")
                    defender = characters[defender_name]
                    action = BullRushAction(actor=actor, defender=defender, parameters=params)
                elif maneuver_type.lower() == "grapple":
                    defender_name = params.get("defender")
                    if defender_name not in characters:
                        raise ValueError(f"Unknown defender: {defender_name}")
                    defender = characters[defender_name]
                    action = GrappleAction(actor=actor, defender=defender, parameters=params)
                else:
                    raise ValueError(f"Unsupported maneuver type: {maneuver_type}")
            elif action_type == ActionType.FREE:
                action = GameAction(actor=actor, action_type="free", parameters=params)
                action.execute = lambda: ActionResult(
                    action="free",
                    actor_name=actor.name,
                    result_data={"justification": "Free action executed."}
                )
            elif action_type == ActionType.IMMEDIATE:
                action = SkillCheckAction(
                    actor=actor,
                    skill_name=params.get("skill_name"),
                    dc=params.get("dc", 15),
                    action_type="immediate"
                )
            elif action_type == ActionType.READIED:
                action = GameAction(actor=actor, action_type="readied", parameters=params)
                action.execute = lambda: ActionResult(
                    action="readied",
                    actor_name=actor.name,
                    result_data={"justification": "Readied action executed."}
                )
            elif action_type == ActionType.DELAYED:
                action = GameAction(actor=actor, action_type="delayed", parameters=params)
                action.execute = lambda: ActionResult(
                    action="delayed",
                    actor_name=actor.name,
                    result_data={"justification": "Delayed action executed."}
                )
            else:
                raise ValueError(f"Unsupported action type: {action_type_str}")
            turn.add_action(action)
        return turn
