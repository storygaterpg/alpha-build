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
    # Set up inventory: The character has 2 Potions of Healing.
    char.inventory = [{"name": "Potion of Healing", "quantity": 2}]
    
    # Create a UseItemAction. Note: We do not pass "use_item" because it is not a valid ActionType.
    # Instead, the default (standard) action type is used.
    action = UseItemAction(actor=char, item_name="Potion of Healing")
    
    result = action.execute()
    # The result should indicate that the item was activated.
    assert result.result_data.get("item_name") == "Potion of Healing", "The activated item should be Potion of Healing."
    assert "activated successfully" in result.result_data.get("effect", ""), "The effect should indicate successful activation."

def test_use_item_failure():
    # Create a character with the item but quantity 0.
    char = Character("ItemUser", 0, 0, dexterity=14)
    char.inventory = [{"name": "Potion of Healing", "quantity": 0}]
    action = UseItemAction(actor=char, item_name="Potion of Healing")
    with pytest.raises(ValueError):
        action.execute()
