"""
tests/test_character.py

This module tests core functionality of the Character class including:
  - Calculation of Armor Class (AC) in various scenarios.
  - Flat-footed and touch AC values.
  - The effect of conditions on AC.
  - Proper updating (ticking and expiration) of conditions.
  
Each test includes comments explaining the rationale behind the expected values.
"""

import sys
import os
from typing import Generator
# Ensure that the parent directory is in the sys.path so that modules are correctly imported.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import math
from character import Character
import conditions

@pytest.fixture
def base_character() -> Character:
    """
    Fixture to create a basic Character instance.
    TestChar is initialized with dexterity 14 (yielding a +2 modifier).
    """
    return Character("TestChar", x=0, y=0, dexterity=14)

def test_get_ac_without_conditions(base_character: Character) -> None:
    """
    Test that when no conditions affect the character,
    the Armor Class (AC) is computed as:
      Base AC = 10 + (Dexterity modifier)
    For a character with 14 DEX (modifier +2), AC should equal 12.
    """
    expected_ac = 12  # 10 + (14-10)//2 = 10 + 2
    actual_ac = base_character.get_ac()
    assert actual_ac == expected_ac, f"Expected AC {expected_ac} but got {actual_ac}"

def test_flatfooted_ac(base_character: Character) -> None:
    """
    Test that flat-footed AC (which excludes Dex and dodge bonuses)
    is computed as the base 10 plus any armor bonuses. With no armor, flat-footed AC should be 10.
    """
    expected_flatfooted_ac = 10
    actual_flatfooted_ac = base_character.get_flatfooted_ac()
    assert actual_flatfooted_ac == expected_flatfooted_ac, f"Expected flat-footed AC {expected_flatfooted_ac} but got {actual_flatfooted_ac}"

def test_touch_ac(base_character: Character) -> None:
    """
    Test that touch AC (which excludes armor, shield, and natural armor bonuses)
    is computed as 10 plus the DEX modifier (if not affected by conditions).
    For a character with 14 DEX, touch AC should equal 12.
    """
    expected_touch_ac = 12  # 10 + (14-10)//2 = 10 + 2
    actual_touch_ac = base_character.get_touch_ac()
    assert actual_touch_ac == expected_touch_ac, f"Expected touch AC {expected_touch_ac} but got {actual_touch_ac}"

def test_ac_with_multiple_conditions(base_character: Character) -> None:
    """
    Test that adding conditions that modify AC correctly affects the total AC.
    In this test:
      - A Prone condition applies a -4 AC modifier.
      - A Stunned condition applies a -2 AC modifier.
    Thus, with a base AC of 12 (from no conditions), the new AC should be 12 - 4 - 2 = 6.
    """
    # Add conditions with explicit durations.
    base_character.add_condition(conditions.ProneCondition(duration=2))
    base_character.add_condition(conditions.StunnedCondition(duration=2))
    
    expected_ac = 6  # 10 + Dex mod (2) - 4 (Prone) - 2 (Stunned)
    actual_ac = base_character.get_ac()
    assert actual_ac == expected_ac, f"Expected AC {expected_ac} with conditions, but got {actual_ac}"

def test_update_conditions(base_character: Character) -> None:
    """
    Test that the update_conditions method correctly ticks down condition durations
    and removes expired conditions. Here, a Shaken condition with duration 1 should expire
    after update_conditions is called.
    """
    condition = conditions.ShakenCondition(duration=1)
    base_character.add_condition(condition)
    assert len(base_character.conditions) == 1, "Character should have one condition applied."
    
    # Tick conditions once; Shaken with duration 1 should now be expired.
    base_character.update_conditions()
    assert len(base_character.conditions) == 0, "Condition should have expired and been removed after update."
