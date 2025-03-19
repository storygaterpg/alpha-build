# tests/test_conditions_full.py

import pytest
import math
from character import Character
import conditions

# List of condition classes along with expected modifier outcomes from the configuration.
# For conditions defined in conditions_config.json, we expect the following:
#   - Blinded: {"ac": -2}
#   - Charmed: {}
#   - Confused: {}
#   - Dazed: {}
#   - Deafened: {}
#   - Dying: {}
#   - Fatigued: {}
#   - Flatfooted: {}
#   - Frightened: {}
#   - Grappled: {}
#   - Immobilized: {}
#   - Paralyzed: {}
#   - Petrified: {}
#   - Sickened: {}
#   - Staggered: {}
#   - Stunned: {"ac": -2}
#   - Unconscious: {}
#   - Enfeebled: {}
#   - Dazzled: {}
#   - Entangled: {}
# Additionally, our project-defined conditions:
#   - ProneCondition: {"ac": -4}
#   - ShakenCondition: {}
#
# We assume that the configuration file (conditions_config.json) supplies these values.
#
# For each condition class, we test:
# 1. Instantiation and default duration (if not overridden).
# 2. That get_modifiers() returns the expected dictionary.
# 3. That tick() decrements the duration and is_expired() returns True when appropriate.

@pytest.mark.parametrize("ConditionClass, expected_modifiers", [
    (conditions.BlindedCondition, {"ac": -2}),
    (conditions.CharmedCondition, {}),
    (conditions.ConfusedCondition, {}),
    (conditions.DazedCondition, {}),
    (conditions.DeafenedCondition, {}),
    (conditions.DyingCondition, {}),
    (conditions.FatiguedCondition, {}),
    (conditions.FlatfootedCondition, {}),
    (conditions.FrightenedCondition, {}),
    (conditions.GrappledCondition, {}),
    (conditions.ImmobilizedCondition, {}),
    (conditions.ParalyzedCondition, {}),
    (conditions.PetrifiedCondition, {}),
    (conditions.SickenedCondition, {}),
    (conditions.StaggeredCondition, {}),
    (conditions.StunnedCondition, {"ac": -2}),
    (conditions.UnconsciousCondition, {}),
    (conditions.EnfeebledCondition, {}),
    (conditions.DazzledCondition, {}),
    (conditions.EntangledCondition, {}),
    (conditions.ProneCondition, {"ac": -4}),
    (conditions.ShakenCondition, {})
])
def test_condition_modifiers(ConditionClass, expected_modifiers):
    # Instantiate the condition with no duration override so that default_duration is used.
    cond = ConditionClass()
    mods = cond.get_modifiers(None)  # Passing None as character since modifiers are static.
    assert isinstance(mods, dict), f"{cond.name} modifiers should be a dictionary."
    assert mods == expected_modifiers, f"{cond.name} modifiers expected {expected_modifiers}, got {mods}"

@pytest.mark.parametrize("ConditionClass", [
    conditions.BlindedCondition,
    conditions.CharmedCondition,
    conditions.ConfusedCondition,
    conditions.DazedCondition,
    conditions.DeafenedCondition,
    conditions.DyingCondition,
    conditions.FatiguedCondition,
    conditions.FlatfootedCondition,
    conditions.FrightenedCondition,
    conditions.GrappledCondition,
    conditions.ImmobilizedCondition,
    conditions.ParalyzedCondition,
    conditions.PetrifiedCondition,
    conditions.SickenedCondition,
    conditions.StaggeredCondition,
    conditions.StunnedCondition,
    conditions.UnconsciousCondition,
    conditions.EnfeebledCondition,
    conditions.DazzledCondition,
    conditions.EntangledCondition,
    conditions.ProneCondition,
    conditions.ShakenCondition
])
def test_condition_tick_and_expiration(ConditionClass):
    # Create condition with a specific duration (e.g., 2 rounds)
    cond = ConditionClass(duration=2)
    assert cond.duration == 2, f"Initial duration for {cond.name} should be 2."
    cond.tick()
    assert cond.duration == 1, f"After one tick, duration for {cond.name} should be 1."
    cond.tick()
    assert cond.duration == 0, f"After two ticks, duration for {cond.name} should be 0."
    assert cond.is_expired(), f"{cond.name} should be expired at duration 0."

def test_character_condition_integration():
    # Create a character and add several conditions, then test AC calculations.
    # For AC, base is 10 + Dex mod (for dex=14, mod=2) plus dodge bonus.
    # Our get_ac() in character.py adds Dex and dodge only if conditions that remove them are absent.
    char = Character("Tester", x=0, y=0, dexterity=14)
    # Without conditions, AC should be 10 + 2 = 12.
    assert char.get_ac() == 12, "Expected AC 12 without conditions."

    # Add Blinded condition (which should remove Dex bonus and dodge)
    blinded = conditions.BlindedCondition(duration=2)
    char.add_condition(blinded)
    # Now AC should be 10 + bonuses that are still in effect.
    # In our character.get_ac(), if blinded is present, we do not add Dex mod or dodge.
    # So AC becomes 10 + armor bonuses etc. (all zeros) plus any condition modifiers.
    # Blinded condition provides {"ac": -2}, so expected AC becomes 10 - 2 = 8.
    assert char.get_ac() == 8, f"Expected AC 8 with Blinded condition, got {char.get_ac()}."

    # Remove blinded, add Prone (which gives -4) but does not remove Dex bonus.
    char.conditions = []
    prone = conditions.ProneCondition(duration=1)
    char.add_condition(prone)
    # Now, AC should be 10 + Dex mod (2) -4 = 8.
    assert char.get_ac() == 8, f"Expected AC 8 with Prone condition, got {char.get_ac()}."

    # Add Stunned condition as well, which should remove Dex bonus.
    stunned = conditions.StunnedCondition(duration=1)
    char.add_condition(stunned)
    # Now, AC calculation should not include Dex bonus (and dodge) because stunned is one of those conditions.
    # So AC = 10 - 4 (from prone) - 2 (from stunned) = 4.
    assert char.get_ac() == 4, f"Expected AC 4 with Prone and Stunned conditions, got {char.get_ac()}."

    # Update conditions and check expiration.
    initial_count = len(char.conditions)
    char.update_conditions()
    # Conditions ticked; if any reached 0, they should be removed.
    # We expect that conditions with duration 1 now expire.
    for cond in char.conditions:
        assert cond.duration >= 0, "Condition duration should not be negative."
