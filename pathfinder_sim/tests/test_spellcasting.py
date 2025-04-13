"""
tests/test_spellcasting.py

This file contains tests for spellcasting mechanics, ensuring that:
- A spell action (e.g., Magic Missile) produces a valid result including damage.
- The spellcasting action correctly deducts spell slot resources.
- An error is raised when the caster does not have enough spell slots.
"""

import pytest
from character import Character
from rules_engine import Dice, RulesEngine
from actions import SpellAction

@pytest.fixture
def spell_engine():
    """
    Fixture that returns a RulesEngine instance with a deterministic RNG.
    """
    dice = Dice(seed=42)
    return RulesEngine(dice)

def test_spell_resolution(spell_engine):
    """
    Test that a spell action produces a valid result.
    This test ensures that:
      - The action type returned is 'spell'.
      - The result includes a damage value.
    """
    caster = Character("Caster", x=0, y=0, dexterity=14)
    target = Character("Target", x=1, y=1, dexterity=12)
    # Add the spell to the caster's known spells.
    caster.spells.append("Magic Missile")
    # Ensure that the caster has at least one spell slot available.
    caster.resources["spell_slots"] = 1

    spell_action = SpellAction(actor=caster, target=target, spell_name="Magic Missile", action_type="standard")
    spell_action.rules_engine = spell_engine
    result = spell_action.execute()
    result_dict = result.to_dict()

    assert result_dict.get("action") == "spell", "Expected action type 'spell'."
    assert "damage" in result_dict.get("result_data", {}), "Spell result should include damage."

def test_spell_resource_consumption_success(spell_engine):
    """
    Test that casting a spell properly consumes a spell slot.
    After the spell is cast, the caster's spell slot count should be reduced.
    """
    caster = Character("Caster", x=0, y=0, dexterity=14)
    target = Character("Target", x=1, y=1, dexterity=12)
    caster.spells.append("Magic Missile")
    # Set initial spell slots to 1.
    caster.resources["spell_slots"] = 1

    spell_action = SpellAction(actor=caster, target=target, spell_name="Magic Missile", action_type="standard")
    spell_action.rules_engine = spell_engine
    result = spell_action.execute()

    # Check that the spell action succeeded and a spell slot was consumed.
    assert result.action == "spell", "Expected action type 'spell'."
    assert "damage" in result.result_data, "Spell result should include damage."
    assert caster.resources["spell_slots"] == 0, "Expected spell slot to be consumed after casting."


def test_spell_resource_consumption_failure(spell_engine):
    """
    Test that an error is raised when attempting to cast a spell with insufficient spell slots.
    """
    caster = Character("Caster", x=0, y=0, dexterity=14)
    target = Character("Target", x=1, y=1, dexterity=12)
    caster.spells.append("Magic Missile")
    # Ensure the caster has 0 spell slots.
    caster.resources["spell_slots"] = 0

    spell_action = SpellAction(actor=caster, target=target, spell_name="Magic Missile", action_type="standard")
    spell_action.rules_engine = spell_engine

    with pytest.raises(ValueError, match="does not have enough spell slots"):
        spell_action.execute()
