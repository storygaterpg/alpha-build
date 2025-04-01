"""
turn_manager.py
---------------

This module implements our advanced turn management and action economy system for the Pathfinder simulation.
It handles action sequencing, initiative ordering, turn numbering, and parsing JSON orders into actions.
All actions conform to the standardized IAction interface.
"""

import json
from typing import List, Dict, Any
from character import Character
from actions import (
    AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction,
    GameAction, IAction
)
from action_types import ActionType  # Import ActionType enum

class Turn:
    def __init__(self, turn_number: int):
        self.turn_number = turn_number
        # For each character, record actions in a dictionary with keys:
        #   "immediate": list of immediate actions,
        #   "readied": list of readied actions,
        #   "delayed": single delayed action (or None),
        #   "standard": one standard action,
        #   "move": list of move actions,
        #   "swift": one swift action,
        #   "full_round": one full-round action,
        #   "free": list of free actions.
        # Also, store the actor reference so that later updates can be applied.
        self.character_actions: Dict[str, Dict[str, Any]] = {}

    def add_action(self, action: IAction) -> None:
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
        else:
            raise Exception(f"Unsupported action type: {action.action_type}")

    def get_ordered_actions(self, rules_engine) -> List[IAction]:
        """
        Compute initiative order and return a list of actions in the order they will be processed.

        For each actor not delaying, compute an initiative score (d20 roll + DEX modifier) using the rules engine's RNG.
        Sort these actors in descending order (tie-break: higher DEX modifier, then alphabetical order).

        Then, for each actor:
          - Process immediate actions first.
          - If the actor has a delayed action, skip processing their standard/move/swift/free actions now.
          - Otherwise, if a full-round action exists, process it; else process standard and move actions.
          - Then process swift actions.
          - Finally, process free and readied actions.

        After processing non-delayed actions, append delayed actions (sorted by their original initiative score in ascending order)
        so that those delaying act later.
        """
        non_delayed = {}
        delayed = {}
        # Compute initiative for each actor.
        for actor_name, record in self.character_actions.items():
            actor = record["actor"]
            # Roll initiative: d20 roll + DEX modifier.
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
        # Process actions for non-delayed actors.
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
        Assign a unique action ID to the action.
        """
        action.action_id = self.action_id_counter
        self.action_id_counter += 1

    def process_turn(self, turn: Turn) -> List[Any]:
        """
        Process all actions for a given turn in initiative order and update game state.

        This method:
          1. Retrieves ordered actions based on initiative.
          2. Assigns unique IDs to actions.
          3. Injects the game map for movement-related actions.
          4. Executes each action, collecting their results.
          5. Updates the state (conditions, resources, etc.) for each actor involved.
          6. Returns a list of action result dictionaries.
        """
        results = []
        ordered_actions = turn.get_ordered_actions(self.rules_engine)
        for action in ordered_actions:
            self.assign_action_id(action)
            action.rules_engine = self.rules_engine
            # Inject the current game map for movement and full-round actions.
            if action.action_type in [ActionType.MOVE, ActionType.FULL_ROUND]:
                action.game_map = self.game_map
            result = action.execute()
            result["turn_number"] = turn.turn_number
            result["action_id"] = action.action_id
            results.append(result)
        # After processing, update the state of each actor from the Turn's records.
        for actor_name, record in turn.character_actions.items():
            record["actor"].update_state()
        return results

    def parse_json_actions(self, json_input: str, characters: Dict[str, Character]) -> Turn:
        """
        Parse JSON-formatted orders into a Turn object with appropriate action objects.

        The JSON should be an array of orders, each with:
          - "actor": The name of the actor.
          - "action_type": The type of action (standard, move, swift, full_round, free, immediate, readied, delayed).
          - "parameters": A dictionary with additional parameters (such as target, skill_name, DC, etc.)

        Returns a Turn instance populated with actions.
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
            elif action_type == ActionType.FREE:
                action = GameAction(actor=actor, action_type="free", parameters=params)
                # For free actions, define a simple execution lambda.
                action.execute = lambda: {
                    "action": "free",
                    "actor": actor.name,
                    "justification": "Free action executed."
                }
            elif action_type == ActionType.IMMEDIATE:
                action = SkillCheckAction(
                    actor=actor,
                    skill_name=params.get("skill_name"),
                    dc=params.get("dc", 15),
                    action_type="immediate"
                )
            elif action_type == ActionType.READIED:
                # For simplicity, create a readied action as a generic free-like action.
                action = GameAction(actor=actor, action_type="readied", parameters=params)
                action.execute = lambda: {
                    "action": "readied",
                    "actor": actor.name,
                    "justification": "Readied action executed."
                }
            elif action_type == ActionType.DELAYED:
                action = GameAction(actor=actor, action_type="delayed", parameters=params)
                action.execute = lambda: {
                    "action": "delayed",
                    "actor": actor.name,
                    "justification": "Delayed action executed."
                }
            else:
                raise ValueError(f"Unsupported action type: {action_type_str}")
            turn.add_action(action)
        return turn
