# tests/test_conditions.py

import pytest
from character import Character
import conditions

@pytest.fixture
def base_character():
    # Create a character with dexterity 14 (modifier +2)
    return Character("TestChar", x=0, y=0, dexterity=14)

def test_blinded_condition_modifiers(base_character):
    # For dexterity 14, Dex mod = +2, so Blinded should impose -4.
    blinded = conditions.BlindedCondition(duration=2)
    mods = blinded.get_modifiers(base_character)
    assert mods == {"ac": -4}, f"Expected {{'ac': -4}}, got {mods}"

def test_confused_condition_modifiers(base_character):
    confused = conditions.ConfusedCondition(duration=3)
    mods = confused.get_modifiers(base_character)
    assert mods == {}

def test_prone_condition_modifiers(base_character):
    prone = conditions.ProneCondition(duration=1)
    mods = prone.get_modifiers(base_character)
    assert mods == {"ac": -4}

def test_shaken_condition_modifiers(base_character):
    shaken = conditions.ShakenCondition(duration=1)
    mods = shaken.get_modifiers(base_character)
    assert mods == {}

def test_stunned_condition_modifiers(base_character):
    stunned = conditions.StunnedCondition(duration=1)
    mods = stunned.get_modifiers(base_character)
    assert mods == {"ac": -2}

def test_tick_and_expiration():
    condition = conditions.ProneCondition(duration=1)
    assert condition.duration == 1
    condition.tick()
    assert condition.duration == 0
    assert condition.is_expired()

def test_multiple_conditions_integration(base_character):
    # Add multiple conditions and check cumulative effect.
    base_character.add_condition(conditions.ProneCondition(duration=2))
    base_character.add_condition(conditions.StunnedCondition(duration=2))
    # Without conditions, AC = 10 + Dex mod (2) = 12.
    # Prone (-4) and Stunned (-2) should reduce AC to 6.
    assert base_character.get_ac() == 6
