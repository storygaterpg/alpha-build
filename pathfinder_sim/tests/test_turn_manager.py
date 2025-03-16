# tests/test_turn_manager.py

import pytest
import json
from turn_manager import TurnManager, ActionType, AttackAction, MoveAction, SkillCheckAction, FullRoundAction
from character import Character
from rules_engine import Dice, RulesEngine, rules_engine
from movement import Map

class DummyCharacter(Character):
    pass  # We use the existing Character class for testing.

@pytest.fixture
def setup_characters():
    alice = Character("Alice", x=0, y=0, dexterity=14)
    bob = Character("Bob", x=5, y=5, dexterity=12)
    return {"Alice": alice, "Bob": bob}

@pytest.fixture
def setup_turn_manager():
    dice = Dice(seed=1)
    global rules_engine
    rules_engine = RulesEngine(dice)
    test_map = Map(10, 10)
    tm = TurnManager(rules_engine, test_map)
    return tm, test_map

def test_turn_manager_action_limits(setup_characters, setup_turn_manager):
    turn_manager, game_map = setup_turn_manager
    turn = turn_manager.new_turn()
    alice = setup_characters["Alice"]
    # Add two move actions for Alice (allowed if no standard action)
    move1 = MoveAction(actor=alice, target=(1, 0))
    move2 = MoveAction(actor=alice, target=(2, 0))
    turn.add_action(move1)
    turn.add_action(move2)
    # Adding a standard action after 2 move actions should raise an exception.
    standard_action = SkillCheckAction(actor=alice, skill_name="Tumble", dc=15, action_type=ActionType.STANDARD)
    with pytest.raises(Exception):
        turn.add_action(standard_action)

def test_turn_manager_json_parsing(setup_characters, setup_turn_manager):
    turn_manager, _ = setup_turn_manager
    json_orders = json.dumps([
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [1, 0]}},
        {"actor": "Alice", "action_type": "move", "parameters": {"target": [2, 0]}},
        {"actor": "Bob", "action_type": "standard", "parameters": {"skill_name": "Stealth", "dc": 15}}
    ])
    turn = turn_manager.parse_json_actions(json_orders, setup_characters)
    alice_actions = turn.character_actions["Alice"]
    bob_actions = turn.character_actions["Bob"]
    assert len(alice_actions["move"]) == 2
    assert bob_actions["standard"] is not None

def test_turn_manager_swift_and_free(setup_characters, setup_turn_manager):
    turn_manager, _ = setup_turn_manager
    turn = turn_manager.new_turn()
    bob = setup_characters["Bob"]
    # Add a swift action and multiple free actions.
    swift_action = SkillCheckAction(actor=bob, skill_name="Quick Reflexes", dc=15, action_type=ActionType.SWIFT)
    free_action1 = SkillCheckAction(actor=bob, skill_name="Brag", dc=10, action_type=ActionType.FREE)
    free_action2 = SkillCheckAction(actor=bob, skill_name="Taunt", dc=10, action_type=ActionType.FREE)
    turn.add_action(swift_action)
    turn.add_action(free_action1)
    turn.add_action(free_action2)
    actions = turn.get_all_actions()
    # Expect 1 swift action and 2 free actions for Bob.
    bob_actions = turn.character_actions["Bob"]
    assert bob_actions["swift"] is not None
    assert len(bob_actions["free"]) == 2

def test_process_turn_integration(setup_characters, setup_turn_manager):
    turn_manager, game_map = setup_turn_manager
    turn = turn_manager.new_turn()
    alice = setup_characters["Alice"]
    bob = setup_characters["Bob"]
    attack = AttackAction(actor=alice, defender=bob, weapon_bonus=1,
                          weapon=None, is_touch_attack=False, target_flat_footed=False,
                          action_type=ActionType.STANDARD)
    turn.add_action(attack)
    results = turn_manager.process_turn(turn)
    assert any(res["action"] == "attack" for res in results)
