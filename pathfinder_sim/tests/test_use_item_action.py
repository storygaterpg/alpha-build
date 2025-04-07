"""
tests/test_use_item_action.py

This file tests the UseItemAction:
 - That using an item decrements its quantity.
 - That it raises an error when the item is not available or its quantity is zero.
"""

import pytest
from character import Character
from actions import UseItemAction
from action_result import ActionResult

def test_use_item_success():
    # Create a character with an item available.
    char = Character("ItemUser", 0, 0, dexterity=14)
    char.inventory = [{"name": "Potion of Healing", "quantity": 2}]
    action = UseItemAction(actor=char, item_name="Potion of Healing")
    # Set up a dummy rules engine with current_rng_seed.
    class DummyRulesEngine:
        current_rng_seed = 42
    action.rules_engine = DummyRulesEngine()
    result = action.execute()
    assert "Used item: Potion of Healing" in result.result_data.get("justification", ""), "Item usage should succeed."
    # Verify that the item quantity decreases.
    assert char.inventory[0]["quantity"] == 1, "Item quantity should decrease by 1."

def test_use_item_failure():
    # Create a character with the item but quantity 0.
    char = Character("ItemUser", 0, 0, dexterity=14)
    char.inventory = [{"name": "Potion of Healing", "quantity": 0}]
    action = UseItemAction(actor=char, item_name="Potion of Healing")
    with pytest.raises(ValueError):
        action.execute()
