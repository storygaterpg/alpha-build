"""
tests/test_conditions.py

This module tests the conditions framework for our Pathfinder simulation.
It verifies that each condition:
  - Returns the correct modifiers and skill penalties as defined in the configuration.
  - Ticks down its duration correctly and expires when expected.
  - Properly affects or does not affect a character’s effective skill modifiers.
  
Each test case is documented with clear explanations.
"""

import pytest
import math
from character import Character
import conditions
from skill_utils import get_skill_modifier  # Utility function to calculate effective skill modifier

# Test raw properties (modifiers and skill penalties) for each condition.
@pytest.mark.parametrize("ConditionClass, expected_modifiers, expected_skill_penalty", [
    (conditions.BlindedCondition, {"ac": -2}, -5),
    (conditions.CharmedCondition, {}, 0),
    (conditions.ConfusedCondition, {}, 0),
    (conditions.DazedCondition, {}, 0),
    (conditions.DeafenedCondition, {}, -4),
    (conditions.DyingCondition, {}, 0),
    (conditions.FatiguedCondition, {}, -2),
    (conditions.FlatfootedCondition, {}, 0),
    (conditions.FrightenedCondition, {}, -2),
    (conditions.GrappledCondition, {}, -4),
    (conditions.ImmobilizedCondition, {}, 0),
    (conditions.ParalyzedCondition, {}, 0),
    (conditions.PetrifiedCondition, {}, 0),
    (conditions.SickenedCondition, {}, -2),
    (conditions.StaggeredCondition, {}, 0),
    (conditions.StunnedCondition, {"ac": -2}, 0),
    (conditions.UnconsciousCondition, {}, 0),
    (conditions.EnfeebledCondition, {}, 0),
    (conditions.DazzledCondition, {}, -1),
    (conditions.EntangledCondition, {}, -2),
    (conditions.ProneCondition, {"ac": -4}, 0),
    (conditions.ShakenCondition, {}, 0)
])
def test_condition_raw_properties(ConditionClass, expected_modifiers, expected_skill_penalty):
    """
    For each condition class, instantiate it without an explicit duration so that
    the default is used. Then verify that its modifiers and skill penalty match
    the expected values.
    """
    cond = ConditionClass()  # Uses default duration from configuration if not overridden.
    mods = cond.get_modifiers(None)  # Modifiers are static; the character parameter is unused.
    assert isinstance(mods, dict), f"{cond.name} modifiers should be returned as a dictionary."
    assert mods == expected_modifiers, f"{cond.name} modifiers expected {expected_modifiers}, got {mods}"
    assert hasattr(cond, "skill_penalty"), f"{cond.name} should have a 'skill_penalty' attribute."
    assert cond.skill_penalty == expected_skill_penalty, f"{cond.name} skill penalty expected {expected_skill_penalty}, got {cond.skill_penalty}"

# Test the ticking mechanism and expiration of conditions.
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
    """
    Verify that each condition decreases its duration correctly via tick() and reports
    expiration once its duration reaches zero.
    """
    cond = ConditionClass(duration=2)
    assert cond.duration == 2, f"Initial duration for {cond.name} should be 2."
    cond.tick()
    assert cond.duration == 1, f"After one tick, duration for {cond.name} should be 1."
    cond.tick()
    assert cond.duration == 0, f"After two ticks, duration for {cond.name} should be 0."
    assert cond.is_expired(), f"{cond.name} should be expired when duration is 0."

# Test that the Blinded condition correctly affects Dexterity-based skills.
def test_blinded_skill_modifier():
    """
    Create a character and verify that without conditions the effective DEX modifier is as expected.
    Then, add a Blinded condition (which penalizes DEX and STR by -5) and check that the effective DEX modifier is updated.
    """
    char = Character("Tester", x=0, y=0, dexterity=14)  # DEX modifier = +2
    # No conditions: expect +2 modifier.
    assert char.get_effective_skill_modifier("DEX") == 2, "Expected effective DEX modifier +2 without conditions."
    # Add Blinded condition.
    blinded = conditions.BlindedCondition(duration=2)
    char.add_condition(blinded)
    # With Blinded: effective modifier should be +2 + (-5) = -3.
    assert char.get_effective_skill_modifier("DEX") == -3, (
        f"Expected effective DEX modifier -3 with Blinded, got {char.get_effective_skill_modifier('DEX')}."
    )

# Test that the Fatigued condition correctly affects Dexterity-based skills.
def test_fatigued_skill_modifier():
    """
    Verify that adding a Fatigued condition (penalty -2 on DEX and STR) adjusts the effective modifier.
    """
    char = Character("Tester", x=0, y=0, dexterity=14)  # DEX modifier = +2
    fatigued = conditions.FatiguedCondition(duration=1)
    char.add_condition(fatigued)
    # With Fatigued: expected modifier is +2 + (-2) = 0.
    assert char.get_effective_skill_modifier("DEX") == 0, (
        f"Expected effective DEX modifier 0 with Fatigued, got {char.get_effective_skill_modifier('DEX')}."
    )

# Test that the Grappled condition correctly affects Dexterity-based skills.
def test_grappled_skill_modifier():
    """
    Verify that the Grappled condition (penalty -4 on DEX) applies only to DEX-based skills.
    Also check that skills based on other abilities (e.g., STR) remain unaffected.
    """
    char = Character("Tester", x=0, y=0, dexterity=14)  # DEX modifier = +2
    grappled = conditions.GrappledCondition(duration=1)
    char.add_condition(grappled)
    # For DEX: expected modifier is +2 + (-4) = -2.
    assert char.get_effective_skill_modifier("DEX") == -2, (
        f"Expected effective DEX modifier -2 with Grappled, got {char.get_effective_skill_modifier('DEX')}."
    )
    # For STR (default 10, modifier 0): expected modifier remains 0.
    assert char.get_effective_skill_modifier("STR") == 0, "Expected effective STR modifier 0 with no STR-based penalty."

# Test cumulative effects when multiple conditions are applied.
def test_multiple_conditions_skill_modifier():
    """
    Apply both Blinded (-5 on DEX) and Fatigued (-2 on DEX) to a character with DEX 14 (+2 modifier)
    and verify that the cumulative effective modifier is correct.
    """
    char = Character("Tester", x=0, y=0, dexterity=14)  # Base DEX mod = +2
    char.add_condition(conditions.BlindedCondition(duration=2))   # -5 penalty
    char.add_condition(conditions.FatiguedCondition(duration=1))    # -2 penalty
    # Expected cumulative: 2 + (-5) + (-2) = -5.
    assert char.get_effective_skill_modifier("DEX") == -5, (
        f"Expected effective DEX modifier -5 with Blinded and Fatigued, got {char.get_effective_skill_modifier('DEX')}."
    )

# Test that a condition affecting DEX/STR does not alter a modifier for an unrelated ability (e.g., INT).
def test_condition_no_effect_on_unrelated_stat():
    """
    For a character with INT 12 (+1 modifier), ensure that applying a Blinded condition (which affects DEX and STR)
    does not change the effective INT modifier.
    """
    char = Character("Tester", x=0, y=0, dexterity=14)
    char.intelligence = 12  # INT modifier should be +1
    char.add_condition(conditions.BlindedCondition(duration=2))
    skill_mod = get_skill_modifier(char, "Knowledge (arcana)")
    # Since Knowledge (arcana) is based on INT, its effective modifier should remain +1.
    assert skill_mod == 1, f"Expected effective INT modifier for Knowledge (arcana) to be +1, got {skill_mod}."
