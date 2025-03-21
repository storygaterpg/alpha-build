# tests/test_conditions_full.py

import pytest
import math
from character import Character
import conditions

# ----------------------------
# Test Raw Condition Properties
# ----------------------------
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
    # Instantiate the condition with no duration override so that default_duration is used.
    cond = ConditionClass()
    mods = cond.get_modifiers(None)  # Passing None as character since modifiers are static.
    assert isinstance(mods, dict), f"{cond.name} modifiers should be a dictionary."
    assert mods == expected_modifiers, f"{cond.name} modifiers expected {expected_modifiers}, got {mods}"
    # Check that the skill penalty is stored correctly.
    assert hasattr(cond, "skill_penalty"), f"{cond.name} should have a 'skill_penalty' attribute."
    assert cond.skill_penalty == expected_skill_penalty, f"{cond.name} skill penalty expected {expected_skill_penalty}, got {cond.skill_penalty}"

# ----------------------------
# Test Condition Tick and Expiration
# ----------------------------
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
    cond = ConditionClass(duration=2)
    assert cond.duration == 2, f"Initial duration for {cond.name} should be 2."
    cond.tick()
    assert cond.duration == 1, f"After one tick, duration for {cond.name} should be 1."
    cond.tick()
    assert cond.duration == 0, f"After two ticks, duration for {cond.name} should be 0."
    assert cond.is_expired(), f"{cond.name} should be expired at duration 0."

# ----------------------------
# Integration Tests: Conditions Affecting Skill Checks
# ----------------------------

def test_blinded_skill_modifier():
    # Create a character with dexterity 14 (modifier +2)
    char = Character("Tester", x=0, y=0, dexterity=14)
    # Without conditions, effective DEX modifier should be +2.
    assert char.get_effective_skill_modifier("DEX") == 2, "Expected effective DEX modifier +2 without conditions."
    # Add Blinded condition (affects DEX and STR; penalty -5).
    blinded = conditions.BlindedCondition(duration=2)
    char.add_condition(blinded)
    # Now, effective modifier for DEX-based skills should be +2 + (-5) = -3.
    assert char.get_effective_skill_modifier("DEX") == -3, f"Expected effective DEX modifier -3 with Blinded, got {char.get_effective_skill_modifier('DEX')}."

def test_fatigued_skill_modifier():
    # Fatigued affects STR and DEX with a -2 penalty.
    char = Character("Tester", x=0, y=0, dexterity=14)
    # Without conditions, effective DEX modifier is +2.
    fatigued = conditions.FatiguedCondition(duration=1)
    char.add_condition(fatigued)
    # Expected: +2 + (-2) = 0.
    assert char.get_effective_skill_modifier("DEX") == 0, f"Expected effective DEX modifier 0 with Fatigued, got {char.get_effective_skill_modifier('DEX')}."

def test_grappled_skill_modifier():
    # Grappled should affect only DEX-based skills with a -4 penalty.
    char = Character("Tester", x=0, y=0, dexterity=14)
    grappled = conditions.GrappledCondition(duration=1)
    char.add_condition(grappled)
    # For DEX skills: +2 + (-4) = -2.
    assert char.get_effective_skill_modifier("DEX") == -2, f"Expected effective DEX modifier -2 with Grappled, got {char.get_effective_skill_modifier('DEX')}."
    # For a stat not affected (e.g., STR, which defaults to 0), effective modifier should be 0.
    assert char.get_effective_skill_modifier("STR") == 0, "Expected effective STR modifier 0 without base modifier."

def test_multiple_conditions_skill_modifier():
    # Test cumulative penalties: Blinded (-5 on DEX) and Fatigued (-2 on DEX).
    char = Character("Tester", x=0, y=0, dexterity=14)
    # Without conditions: +2.
    char.add_condition(conditions.BlindedCondition(duration=2))
    char.add_condition(conditions.FatiguedCondition(duration=1))
    # Expected effective modifier: +2 + (-5) + (-2) = -5.
    assert char.get_effective_skill_modifier("DEX") == -5, f"Expected effective DEX modifier -5 with Blinded and Fatigued, got {char.get_effective_skill_modifier('DEX')}."

def test_condition_no_effect_on_unrelated_stat():
    # Conditions that affect DEX should not change effective modifier for a stat that is not affected.
    char = Character("Tester", x=0, y=0, dexterity=14)
    # Assume the character's STR modifier is 0 (default, since get_modifier returns 0 for STR).
    char.add_condition(conditions.BlindedCondition(duration=2))
    # Effective modifier for STR should remain 0 because even though Blinded lists STR in affected_stats,
    # the base STR mod is 0.
    assert char.get_effective_skill_modifier("STR") == 0, "Expected effective STR modifier 0 with Blinded on a character with STR mod 0."
