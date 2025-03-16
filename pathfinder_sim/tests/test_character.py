# tests/test_character.py

import sys
import os
# Add the parent directory to sys.path so that modules can be imported correctly.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import math
from character import Character
import conditions

@pytest.fixture
def base_character():
    # Create a character with dexterity 14 (mod +2)
    return Character("TestChar", x=0, y=0, dexterity=14)

def test_get_ac_without_conditions(base_character):
    # Without conditions, AC = 10 + Dex mod (2) = 12.
    assert base_character.get_ac() == 12

def test_flatfooted_ac(base_character):
    # Flat-footed AC = 10 (no Dex mod) = 10.
    assert base_character.get_flatfooted_ac() == 10

def test_touch_ac(base_character):
    # Touch AC = 10 + Dex mod (2) = 12.
    assert base_character.get_touch_ac() == 12

def test_ac_with_multiple_conditions(base_character):
    # Add Prone (-4) and Stunned (-2); total modifier -6.
    base_character.add_condition(conditions.ProneCondition(duration=2))
    base_character.add_condition(conditions.StunnedCondition(duration=2))
    # Full AC = 10 + Dex mod (2) -6 = 6.
    assert base_character.get_ac() == 6

def test_update_conditions(base_character):
    condition = conditions.ShakenCondition(duration=1)
    base_character.add_condition(condition)
    assert len(base_character.conditions) == 1
    base_character.update_conditions()
    # After one update, the condition should expire.
    assert len(base_character.conditions) == 0
