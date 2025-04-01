"""
turn_manager.py
---------------

This module implements our advanced turn management and action economy system for the Pathfinder simulation.
It handles action sequencing, initiative ordering, turn numbering, and parsing JSON orders into actions.
All core action classes are imported from actions.py.
"""

import json
from typing import List, Dict, Any
from character import Character
from actions import AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction, GameAction
from action_types import ActionType  # Import ActionType enum


class Turn:
    def __init__(self, turn_number: int):
        self.turn_number = turn_number
        # For each character, record the following:
        # "actor": the Character instance,
        # "immediate": list of immediate actions,
        # "standard": one standard action (or None),
        # "move": list of move actions,
        # "swift": one swift action (or None),
        # "full_round": one full-round action (or None),
        # "free": list of free actions.
        self.character_actions: Dict[str, Dict[str, Any]] = {}

    def add_action(self, action) -> None:
        actor_name = action.actor.name
        # If the actor is not already present, initialize their action record.
        if actor_name not in self.character_actions:
            self.character_actions[actor_name] = {
                "actor": action.actor,
                "immediate": [],
                "standard": None,
                "move": [],
                "swift": None,
                "full_round": None,
                "free": []
            }
        records = self.character_actions[actor_name]
        # Enforce action limits based on action type.
        if action.action_type == ActionType.FULL_ROUND:
            if records["standard"] or records["move"]:
                raise Exception(f"{actor_name} cannot combine a full-round action with standard or move actions.")
            if records["full_round"] is not None:
                raise Exception(f"{actor_name} has already taken a full-round action this turn.")
            records["full_round"] = action
        elif action.action_type == ActionType.STANDARD:
            if records["standard"] is not None:
                raise Exception(f"{actor_name} has already taken a standard action this turn.")
            # If any move actions have been taken (more than one), standard actions are not allowed.
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
            # Immediate actions are stored separately.
            records["immediate"].append(action)
        else:
            raise Exception(f"Unsupported action type: {action.action_type}")

    def get_ordered_actions(self, rules_engine) -> List:
        """
        Compute initiative order and return a list of actions ordered by initiative.
        For each actor in the turn, compute an initiative score (d20 + DEX modifier),
        sort actors in descending order (with tie-breakers on DEX modifier and name),
        and then for each actor, append their actions in the following priority:
          1. Immediate actions (if any)
          2. Full-round action (if present; else Standard action, then Move actions)
          3. Swift action
          4. Free actions
        """
        # Build a mapping from actor name to (actor instance, initiative score).
        initiative_map = {}
        for actor_name, record in self.character_actions.items():
            actor = record["actor"]
            # Compute initiative: d20 roll (deterministic via rules_engine's dice) plus DEX modifier.
            # Using the same RNG for consistency; ensure the RNG is seeded appropriately per turn.
            initiative_roll = rules_engine.dice.roll_d20()
            dex_mod = actor.get_modifier("DEX")
            initiative_score = initiative_roll + dex_mod
            # Tie-breaker: store the DEX modifier and actor name.
            initiative_map[actor_name] = (actor, initiative_score, dex_mod)
        
        # Sort the actor names by initiative_score (descending), then dex_mod (descending), then name (alphabetically).
        sorted_actor_names = sorted(
            initiative_map.keys(),
            key=lambda name: (initiative_map[name][1], initiative_map[name][2], name),
            reverse=True
        )
        
        ordered_actions = []
        # Process actions in initiative order.
        for actor_name in sorted_actor_names:
            record = self.character_actions[actor_name]
            # Process immediate actions first (they may be interrupts or reactions).
            ordered_actions.extend(record["immediate"])
            # If a full-round action exists, it replaces standard and move actions.
            if record["full_round"]:
                ordered_actions.append(record["full_round"])
            else:
                if record["standard"]:
                    ordered_actions.append(record["standard"])
                ordered_actions.extend(record["move"])
            # Then process swift actions.
            if record["swift"]:
                ordered_actions.append(record["swift"])
            # Finally, free actions.
            ordered_actions.extend(record["free"])
        return ordered_actions


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
        # Compute the ordered list of actions based on initiative.
        ordered_actions = turn.get_ordered_actions(self.rules_engine)
        # Process each action in the computed order.
        for action in ordered_actions:
            self.assign_action_id(action)
            action.rules_engine = self.rules_engine
            # For movement and full-round actions, inject the current game map.
            if action.action_type in [ActionType.MOVE, ActionType.FULL_ROUND]:
                action.game_map = self.game_map
            result = action.execute()
            result["turn_number"] = turn.turn_number
            result["action_id"] = action.action_id
            results.append(result)
        # After processing, update each actor’s state.
        for actor_name, record in turn.character_actions.items():
            actor = record["actor"]
            actor.update_state()
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
                # For free actions, we define a simple lambda for execution.
                action.execute = lambda: {"action": "free", "actor": actor.name, "justification": "Free action executed."}
            elif action_type == ActionType.IMMEDIATE:
                action = SkillCheckAction(actor=actor,
                                          skill_name=params.get("skill_name"),
                                          dc=params.get("dc", 15),
                                          action_type="immediate")
            else:
                raise ValueError(f"Unsupported action type: {action_type_str}")
            turn.add_action(action)
        return turn
