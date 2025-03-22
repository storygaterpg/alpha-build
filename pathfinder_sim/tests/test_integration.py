"""
tests/test_integration.py

This file contains integration tests that simulate complete turns, verifying that
movement, combat, spellcasting, condition updates, and JSON order parsing are correctly processed.
It ensures that global state updates (like character positions and condition durations)
are consistent with Pathfinder 1e rules.
"""

import json
import pytest
import math
import sys, os
# Ensure the parent directory is in sys.path.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from character import Character
import conditions
from movement import Map, MovementAction
import spell_utils
from turn_manager import TurnManager, ActionType, AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction
from rules_engine import Dice, RulesEngine, rules_engine

# --------------------------
# Fixtures for Integration Tests
# --------------------------

@pytest.fixture
def game_environment():
    """
    Set up a basic game environment:
      - A 10x10 map with defined terrain.
      - A global TurnManager using the RulesEngine and the map.
      - Two characters: Alice and Bob.
    """
    # Create a 10x10 map and modify terrain:
    test_map = Map(10, 10)
    # Set column 3 (rows 3-5) as difficult terrain.
    for y in range(3, 6):
        test_map.set_terrain(3, y, "difficult")
    # Set one impassable cell.
    test_map.set_terrain(5, 5, "impassable")
    
    # Create dice, rules engine, and TurnManager.
    dice = Dice(seed=42)
    global rules_engine
    rules_engine = RulesEngine(dice)
    tm = TurnManager(rules_engine, test_map)
    
    # Create characters.
    alice = Character("Alice", x=0, y=0, dexterity=14)
    bob = Character("Bob", x=9, y=9, dexterity=12)
    bob.spells.append("Magic Missile")
    
    # Apply conditions.
    bob.add_condition(conditions.BlindedCondition(duration=2))
    bob.add_condition(conditions.ConfusedCondition(duration=3))
    alice.add_condition(conditions.ProneCondition(duration=2))
    
    return {
        "map": test_map,
        "turn_manager": tm,
        "characters": {"Alice": alice, "Bob": bob},
        "rules_engine": rules_engine
    }

# --------------------------
# Integration Test Scenarios
# --------------------------

def test_full_turn_simulation_move_and_attack(game_environment):
    """
    Simulate a full turn where Alice first moves and then attacks Bob.
    Verify that:
      - Alice's position is updated correctly.
      - An attack action is processed and returns an appropriate result.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    
    turn = tm.new_turn()
    
    # Create a move action for Alice from (0,0) to (2,0)
    move_action = MoveAction(actor=characters["Alice"], target=(2, 0), action_type=ActionType.MOVE)
    # Then create an attack action from Alice to Bob.
    attack_action = AttackAction(
        actor=characters["Alice"],
        defender=characters["Bob"],
        weapon_bonus=2,
        weapon=None,
        is_touch_attack=False,
        target_flat_footed=False,
        action_type=ActionType.STANDARD
    )
    
    turn.add_action(move_action)
    turn.add_action(attack_action)
    
    results = tm.process_turn(turn)
    # Verify move action result.
    move_results = [res for res in results if res["action"] == "move"]
    assert move_results, "Move action should be processed."
    final_pos = move_results[0]["final_position"]
    assert final_pos == (2, 0), f"Expected final position (2,0), got {final_pos}"
    
    # Verify attack action result.
    attack_results = [res for res in results if res["action"] == "attack"]
    assert attack_results, "Attack action should be processed."

def test_full_turn_simulation_spell_and_swift(game_environment):
    """
    Simulate a turn where Bob casts a spell and takes a swift action.
    Verify that:
      - The spell action returns a valid result.
      - The swift action is processed.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    
    turn = tm.new_turn()
    
    spell_action = SpellAction(
        actor=characters["Bob"],
        target=characters["Alice"],
        spell_name="Magic Missile",
        action_type=ActionType.STANDARD
    )
    swift_action = SkillCheckAction(
        actor=characters["Bob"],
        skill_name="Use Magic Device",
        dc=15,
        action_type=ActionType.SWIFT
    )
    
    turn.add_action(spell_action)
    turn.add_action(swift_action)
    
    results = tm.process_turn(turn)
    spell_results = [res for res in results if res["action"] == "spell"]
    swift_results = [res for res in results if res["action"] == "skill_check" and res.get("skill_name") == "Use Magic Device"]
    assert spell_results, "Spell action should be processed."
    assert swift_results, "Swift action should be processed."

def test_multi_turn_condition_update(game_environment):
    """
    Simulate multiple turns to verify that conditions tick down and eventually expire.
    For example, Bob's Blinded condition should expire after 2 turns.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    bob = characters["Bob"]
    
    initial_conditions = bob.get_condition_status()
    blinded = next((cond for cond in initial_conditions if cond["name"] == "Blinded"), None)
    assert blinded is not None, "Bob should start with Blinded condition."
    assert blinded["duration"] == 2
    
    # Process two turns and update conditions.
    for _ in range(2):
        turn = tm.new_turn()
        tm.process_turn(turn)
        bob.update_conditions()
    
    final_conditions = bob.get_condition_status()
    blinded = next((cond for cond in final_conditions if cond["name"] == "Blinded"), None)
    assert blinded is None, "Blinded condition should have expired after 2 turns."

def test_json_order_parsing_integration(game_environment):
    """
    Provide a well-formed JSON order representing a full turn for multiple characters,
    then verify that TurnManager parses the orders correctly into appropriate actions.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    
    orders = [
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [1, 0]}},
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [2, 0]}},
        {"actor": "Bob", "action_type": "standard", "parameters": {"skill_name": "Stealth", "dc": 15}},
        {"actor": "Bob", "action_type": "swift", "parameters": {"skill_name": "Quick Reflexes", "dc": 12}}
    ]
    json_orders = json.dumps(orders)
    turn = tm.parse_json_actions(json_orders, characters)
    
    alice_actions = turn.character_actions["Alice"]
    bob_actions = turn.character_actions["Bob"]
    assert len(alice_actions["move"]) == 2, "Alice should have 2 move actions."
    assert bob_actions["standard"] is not None, "Bob should have a standard action."
    assert bob_actions["swift"] is not None, "Bob should have a swift action."

def test_action_limit_enforcement(game_environment):
    """
    Test that exceeding allowed action limits raises an exception.
    For example, adding a standard action after two move actions should fail.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    turn = tm.new_turn()
    alice = characters["Alice"]
    move1 = MoveAction(actor=alice, target=(1, 0))
    move2 = MoveAction(actor=alice, target=(2, 0))
    turn.add_action(move1)
    turn.add_action(move2)
    standard_action = SkillCheckAction(actor=alice, skill_name="Tumble", dc=15, action_type=ActionType.STANDARD)
    with pytest.raises(Exception):
        turn.add_action(standard_action)

def test_obstacle_movement_interaction():
    """
    Test a scenario where the path is completely blocked.
    The movement action should return an empty path.
    """
    from movement import Map, MovementAction
    m = Map(3, 3)
    for x in range(3):
        m.set_terrain(x, 1, "impassable")
    action = MovementAction(m, (0, 0), (2, 2))
    path = action.execute()
    assert path == [], "Expected no path due to complete blockage."

def test_full_round_action_charge(game_environment):
    """
    Test a full-round action simulating a charge.
    Verify that the charge correctly combines movement and attack,
    updating the character's position and returning a valid result.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    turn = tm.new_turn()
    alice = characters["Alice"]
    bob = characters["Bob"]
    full_round_action = FullRoundAction(
        actor=alice,
        parameters={"type": "charge", "target": (3, 0), "defender": bob, "weapon": None},
        action_type=ActionType.FULL_ROUND
    )
    turn.add_action(full_round_action)
    results = tm.process_turn(turn)
    charge_results = [res for res in results if res["action"] == "full_round"]
    assert charge_results, "Expected full-round action result for charge."
    assert alice.position == (3, 0), f"Expected Alice's position to be (3,0), got {alice.position}"

def test_integration_spell_and_movement(game_environment):
    """
    Simulate a scenario where a character moves and then is targeted by a spell.
    Verify that:
      - Movement updates the character's position.
      - The spell resolver processes the spell correctly using the updated position.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    turn = tm.new_turn()
    alice = characters["Alice"]
    bob = characters["Bob"]
    
    move_action = MoveAction(actor=alice, target=(4, 0), action_type=ActionType.MOVE)
    spell_action = SpellAction(actor=bob, target=alice, spell_name="Magic Missile", action_type=ActionType.STANDARD)
    
    turn.add_action(move_action)
    turn.add_action(spell_action)
    
    results = tm.process_turn(turn)
    move_result = next((res for res in results if res["action"] == "move"), None)
    assert move_result is not None
    assert move_result["final_position"] == (4, 0), f"Expected final position (4,0), got {move_result['final_position']}"
    
    spell_results = [res for res in results if res["action"] == "spell"]
    assert spell_results, "Expected spell action result."

def test_global_state_consistency(game_environment):
    """
    After processing a turn with multiple actions, verify that global state
    (character positions, condition durations, etc.) is updated correctly.
    """
    env = game_environment
    tm = env["turn_manager"]
    characters = env["characters"]
    alice = characters["Alice"]
    bob = characters["Bob"]
    
    turn = tm.new_turn()
    move_action = MoveAction(actor=alice, target=(2, 0), action_type=ActionType.MOVE)
    attack_action = AttackAction(
        actor=alice,
        defender=bob,
        weapon_bonus=2,
        weapon=None,
        is_touch_attack=False,
        target_flat_footed=False,
        action_type=ActionType.STANDARD
    )
    spell_action = SpellAction(actor=bob, target=alice, spell_name="Magic Missile", action_type=ActionType.STANDARD)
    turn.add_action(move_action)
    turn.add_action(attack_action)
    turn.add_action(spell_action)
    
    tm.process_turn(turn)
    # Verify that Alice's position has been updated.
    assert alice.position == (2, 0), f"Expected Alice's position to be (2,0), got {alice.position}"
    
    # Process an empty turn to tick conditions and update global state.
    empty_turn = tm.new_turn()
    tm.process_turn(empty_turn)
    bob.update_conditions()
    updated_conditions = bob.get_condition_status()
    for cond in updated_conditions:
        assert cond["duration"] < 3, "Condition duration should have decreased."
