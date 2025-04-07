"""
tests/test_rules_engine.py

Tests for the Core Rules Engine.
This file verifies dice rolling, combat resolution (including critical confirmation and concealment),
spell resolution, and skill check processing. It ensures outcomes align with Pathfinder rules.
"""

import math
import pytest
from rules_engine import Dice, RulesEngine, CombatResolver, SpellResolver, SkillResolver
from character import Character

# Dummy weapon for testing.
class DummyWeapon:
    def __init__(self, is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2, check_penalty=0):
        self.is_ranged = is_ranged
        self.threat_range = threat_range
        self.damage_dice = damage_dice
        self.critical_multiplier = critical_multiplier
        self.check_penalty = check_penalty

# DummyCharacter for testing, inheriting from Character.
class DummyCharacter(Character):
    def __init__(self, name, dexterity, BAB, ac):
        super().__init__(name, x=0, y=0, dexterity=dexterity)
        self.BAB = BAB
        self._ac = ac
        self.conditions = []
        self.spells = []

# ---- Dice Tests ----
def test_dice_roll():
    dice = Dice(seed=1)
    result = dice.roll("2d4+1")
    assert isinstance(result, int), "Dice roll result should be an integer."

def test_dice_d20_roll():
    dice = Dice(seed=1)
    roll1 = dice.roll_d20()
    roll2 = dice.roll_d20()
    assert 1 <= roll1 <= 20, "d20 roll should be between 1 and 20."
    assert 1 <= roll2 <= 20, "d20 roll should be between 1 and 20."
    assert roll1 != roll2, "Different d20 rolls expected with fixed seed."

# ---- CombatResolver Tests ----
@pytest.fixture
def setup_combat():
    dice = Dice(seed=1)
    engine = RulesEngine(dice)
    return engine

def test_combat_resolver_miss(setup_combat):
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=14, BAB=2, ac=12)
    defender = DummyCharacter("Defender", dexterity=12, BAB=0, ac=16)
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    class DummyAttack:
        pass
    attack_action = DummyAttack()
    attack_action.actor = attacker
    attack_action.defender = defender
    attack_action.weapon = weapon
    attack_action.weapon_bonus = 0
    attack_action.is_touch_attack = False
    attack_action.target_flat_footed = False
    result = engine.combat_resolver.resolve_attack(attack_action)
    result_dict = result.to_dict()
    assert result_dict.get("hit") is False, "Attack should miss under these conditions."

def test_combat_resolver_hit(setup_combat):
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=16, BAB=5, ac=12)
    defender = DummyCharacter("Defender", dexterity=10, BAB=0, ac=12)
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    class DummyAttack:
        pass
    attack_action = DummyAttack()
    attack_action.actor = attacker
    attack_action.defender = defender
    attack_action.weapon = weapon
    attack_action.weapon_bonus = 1
    attack_action.is_touch_attack = False
    attack_action.target_flat_footed = False
    result = engine.combat_resolver.resolve_attack(attack_action)
    result_dict = result.to_dict()
    assert result_dict.get("hit") is True, "Attack should hit under these conditions."

def test_combat_resolver_concealment(setup_combat):
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=16, BAB=5, ac=12)
    defender = DummyCharacter("Defender", dexterity=10, BAB=0, ac=12)
    defender.concealment = 100  # 100% concealment should force a miss.
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    class DummyAttack:
        pass
    attack_action = DummyAttack()
    attack_action.actor = attacker
    attack_action.defender = defender
    attack_action.weapon = weapon
    attack_action.weapon_bonus = 0
    attack_action.is_touch_attack = False
    attack_action.target_flat_footed = False
    result = engine.combat_resolver.resolve_attack(attack_action)
    result_dict = result.to_dict()
    assert result_dict.get("hit") is False, "Attack should miss due to defender's concealment."
    assert result_dict.get("concealment_applied") is True, "Concealment should be applied."

# ---- SpellResolver Tests ----
def test_spell_resolver(setup_combat):
    engine = setup_combat
    caster = DummyCharacter("Caster", dexterity=14, BAB=0, ac=12)
    target = DummyCharacter("Target", dexterity=12, BAB=0, ac=12)
    class DummySpell:
        pass
    spell_action = DummySpell()
    spell_action.actor = caster
    spell_action.target = target
    spell_action.spell_name = "Magic Missile"
    result = engine.spell_resolver.resolve_spell(spell_action)
    result_dict = result.to_dict()
    assert result_dict.get("action") == "spell", "Spell action should have action 'spell'."
    assert "damage" in result_dict.get("result_data", {}), "Spell result should include damage."

# ---- SkillResolver Tests ----
def test_skill_resolver(setup_combat):
    engine = setup_combat
    actor = DummyCharacter("SkillUser", dexterity=14, BAB=0, ac=12)
    class DummySkill:
        pass
    skill_action = DummySkill()
    skill_action.actor = actor
    skill_action.skill_name = "Acrobatics"
    skill_action.dc = 15
    result = engine.skill_resolver.resolve_skill_check(skill_action)
    result_dict = result.to_dict()
    assert result_dict.get("action") == "skill_check", "Skill check action should be processed."
    result_data = result_dict.get("result_data", {})
    assert "roll" in result_data and "total" in result_data, "Skill check result should include roll and total."
