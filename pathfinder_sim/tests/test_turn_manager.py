"""
tests/test_turn_manager.py

This file contains tests for the TurnManager, ensuring that actions are correctly
categorized, that JSON orders are parsed into proper actions, and that action limits
and sequencing (including immediate, delayed, swift, and free actions) are enforced according to Pathfinder 1e rules.
"""

import pytest
import json
from turn_manager import TurnManager, ActionType, AttackAction, MoveAction, SkillCheckAction, FullRoundAction, IAction
from character import Character
from rules_engine import Dice, RulesEngine, rules_engine
from movement import Map

# Use the actual Character class for testing.
class DummyCharacter(Character):
    pass

@pytest.fixture
def setup_characters() -> dict:
    alice = Character("Alice", x=0, y=0, dexterity=14)
    bob = Character("Bob", x=5, y=5, dexterity=12)
    return {"Alice": alice, "Bob": bob}

@pytest.fixture
def setup_turn_manager() -> tuple:
    dice = Dice(seed=1)
    global rules_engine
    rules_engine = RulesEngine(dice)
    test_map = Map(10, 10)
    tm = TurnManager(rules_engine, test_map)
    return tm, test_map

def test_turn_manager_action_limits(setup_characters: dict, setup_turn_manager: tuple) -> None:
    """
    Test that the TurnManager enforces action limits.
    Adding a standard action after two move actions should raise an exception.
    """
    turn_manager, _ = setup_turn_manager
    turn = turn_manager.new_turn()
    alice = setup_characters["Alice"]
    # Add two move actions for Alice.
    move1 = MoveAction(actor=alice, target=(1, 0))
    move2 = MoveAction(actor=alice, target=(2, 0))
    turn.add_action(move1)
    turn.add_action(move2)
    # Adding a standard action now should raise an exception.
    standard_action = SkillCheckAction(actor=alice, skill_name="Tumble", dc=15, action_type=ActionType.STANDARD)
    with pytest.raises(Exception):
        turn.add_action(standard_action)

def test_turn_manager_json_parsing(setup_characters: dict, setup_turn_manager: tuple) -> None:
    """
    Test that the TurnManager correctly parses JSON orders into actions.
    """
    turn_manager, _ = setup_turn_manager
    json_orders = json.dumps([
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [1, 0]}},
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [2, 0]}},
        {"actor": "Bob", "action_type": "standard", "parameters": {"skill_name": "Stealth", "dc": 15}}
    ])
    turn = turn_manager.parse_json_actions(json_orders, setup_characters)
    alice_actions = turn.character_actions["Alice"]
    bob_actions = turn.character_actions["Bob"]
    assert len(alice_actions["move"]) == 2, "Alice should have 2 move actions."
    assert bob_actions["standard"] is not None, "Bob should have a standard action."

def test_turn_manager_swift_and_free(setup_characters: dict, setup_turn_manager: tuple) -> None:
    """
    Test that swift and free actions are correctly recorded.
    """
    turn_manager, _ = setup_turn_manager
    turn = turn_manager.new_turn()
    bob = setup_characters["Bob"]
    swift_action = SkillCheckAction(actor=bob, skill_name="Acrobatics", dc=15, action_type=ActionType.SWIFT)
    free_action1 = SkillCheckAction(actor=bob, skill_name="Bluff", dc=10, action_type=ActionType.FREE)
    free_action2 = SkillCheckAction(actor=bob, skill_name="Diplomacy", dc=10, action_type=ActionType.FREE)
    turn.add_action(swift_action)
    turn.add_action(free_action1)
    turn.add_action(free_action2)
    bob_actions = turn.character_actions["Bob"]
    assert bob_actions["swift"] is not None, "Bob should have one swift action."
    assert len(bob_actions["free"]) == 2, "Bob should have two free actions."

def test_turn_manager_delayed_and_immediate(setup_characters: dict, setup_turn_manager: tuple) -> None:
    """
    Test that immediate and delayed actions are correctly processed and ordered.
    """
    turn_manager, _ = setup_turn_manager
    turn = turn_manager.new_turn()
    bob = setup_characters["Bob"]
    immediate_action = SkillCheckAction(actor=bob, skill_name="Perception", dc=10, action_type=ActionType.IMMEDIATE)
    delayed_action = SkillCheckAction(actor=bob, skill_name="Perception", dc=10, action_type=ActionType.DELAYED)
    turn.add_action(immediate_action)
    turn.add_action(delayed_action)
    ordered_actions = turn.get_ordered_actions(turn_manager.rules_engine)
    immediate_index = ordered_actions.index(immediate_action)
    delayed_index = ordered_actions.index(delayed_action)
    assert immediate_index < delayed_index, "Immediate action should be processed before delayed action."

def test_process_turn_integration(setup_characters: dict, setup_turn_manager: tuple) -> None:
    """
    Test that processing a turn updates the game state and returns appropriate action results.
    """
    turn_manager, _ = setup_turn_manager
    turn = turn_manager.new_turn()
    alice = setup_characters["Alice"]
    bob = setup_characters["Bob"]
    attack = AttackAction(
        actor=alice,
        defender=bob,
        weapon_bonus=1,
        weapon=None,
        is_touch_attack=False,
        target_flat_footed=False,
        action_type=ActionType.STANDARD
    )
    turn.add_action(attack)
    results = turn_manager.process_turn(turn)
    assert any(res["action"] == "attack" for res in results), "Attack action should be processed."

def test_turn_manager_swift_and_free_integration(setup_characters, setup_turn_manager):
    """
    Additional test to verify swift and free actions processing in a turn.
    """
    turn_manager, _ = setup_turn_manager
    turn = turn_manager.new_turn()
    bob = setup_characters["Bob"]
    swift_action = SkillCheckAction(actor=bob, skill_name="Acrobatics", dc=15, action_type=ActionType.SWIFT)
    free_action1 = SkillCheckAction(actor=bob, skill_name="Bluff", dc=10, action_type=ActionType.FREE)
    free_action2 = SkillCheckAction(actor=bob, skill_name="Diplomacy", dc=10, action_type=ActionType.FREE)
    turn.add_action(swift_action)
    turn.add_action(free_action1)
    turn.add_action(free_action2)
    results = turn_manager.process_turn(turn)
    swift_results = [res for res in results if res["action"] == "skill_check" and res["result_data"].get("skill_name") == "Acrobatics"]
    free_results = [res for res in results if res["action"] == "free"]
    assert swift_results, "Swift action should be processed."
    assert len(free_results) == 2, "Two free actions should be processed."

def test_turn_manager_json_parsing_with_maneuver(setup_characters, setup_turn_manager):
    """
    Verify that JSON orders including maneuver actions are correctly parsed.
    """
    turn_manager, _ = setup_turn_manager
    json_orders = json.dumps([
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [1, 0]}},
        {"actor": "Bob", "action_type": "standard", "parameters": {"maneuver_type": "bull_rush", "defender": "Alice"}}
    ])
    turn = turn_manager.parse_json_actions(json_orders, setup_characters)
    alice_actions = turn.character_actions["Alice"]
    bob_actions = turn.character_actions["Bob"]
    assert len(alice_actions["move"]) == 1, "Alice should have 1 move action."
    assert bob_actions["standard"] is not None, "Bob should have a standard action representing a maneuver."
