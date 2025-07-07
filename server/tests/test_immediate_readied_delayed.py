"""
tests/test_immediate_readied_delayed.py

This file tests that immediate, free, readied, and delayed actions are correctly
categorized and processed by the TurnManager in the proper initiative order.
"""

import pytest
import json
from turn_manager import TurnManager, ActionType, GameAction
from character import Character
from rules_engine import Dice, RulesEngine

# Define a dummy action implementing IAction for testing purposes.
class DummyAction(GameAction):
    def execute(self):
        from action_result import ActionResult
        return ActionResult(
            action=self.action_type.value,
            actor_name=self.actor.name,
            result_data={"justification": f"Executed {self.action_type.value} action."},
            log="",
            debug={}
        )

def test_immediate_and_readied_order():
    # Test ordering of immediate, free, and readied actions.
    dice = Dice(seed=1)
    engine = RulesEngine(dice)
    # Create a dummy game map (required by TurnManager).
    from movement import Map
    game_map = Map(5, 5)
    # Create a character.
    char = Character("Tester", 0, 0, 14)
    from turn_manager import Turn
    tm = TurnManager(engine, game_map)
    turn = tm.new_turn()
    # Add immediate, free, and readied actions.
    immediate_action = DummyAction(actor=char, action_type=ActionType.IMMEDIATE)
    free_action = DummyAction(actor=char, action_type=ActionType.FREE)
    readied_action = DummyAction(actor=char, action_type=ActionType.READIED)
    turn.add_action(immediate_action)
    turn.add_action(free_action)
    turn.add_action(readied_action)
    ordered = turn.get_ordered_actions(engine)
    # Expected order: immediate -> free -> readied.
    assert ordered[0].action_type == ActionType.IMMEDIATE, "First action should be immediate."
    assert ordered[1].action_type == ActionType.FREE, "Second action should be free."
    assert ordered[2].action_type == ActionType.READIED, "Third action should be readied."

def test_delayed_action():
    # Test that a delayed action is processed after non-delayed actions.
    dice = Dice(seed=1)
    engine = RulesEngine(dice)
    from movement import Map
    game_map = Map(5, 5)
    char = Character("Tester", 0, 0, 14)
    from turn_manager import Turn
    tm = TurnManager(engine, game_map)
    turn = tm.new_turn()
    delayed_action = DummyAction(actor=char, action_type=ActionType.DELAYED)
    turn.add_action(delayed_action)
    ordered = turn.get_ordered_actions(engine)
    # With only delayed action present, it should be last.
    assert ordered[-1].action_type == ActionType.DELAYED, "Delayed action should be processed last."
