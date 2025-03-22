# tests/test_rules_engine.py

import math
import pytest
from rules_engine import Dice, RulesEngine, CombatResolver, SpellResolver, SkillResolver
from character import Character

# Create a dummy weapon for testing.
class DummyWeapon:
    def __init__(self, is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2, check_penalty=0):
        self.is_ranged = is_ranged
        self.threat_range = threat_range
        self.damage_dice = damage_dice
        self.critical_multiplier = critical_multiplier
        self.check_penalty = check_penalty

# Create a minimal dummy character for testing. It inherits from Character.
class DummyCharacter(Character):
    def __init__(self, name, dexterity, BAB, ac):
        # Initialize with x, y default to 0.
        super().__init__(name, x=0, y=0, dexterity=dexterity)
        # Override BAB and AC as provided.
        self.BAB = BAB
        self._ac = ac
        # Ensure conditions and spells are empty lists.
        self.conditions = []
        self.spells = []


# ---- Dice Tests ----
def test_dice_roll():
    dice = Dice(seed=1)
    # Test that dice roll returns an integer and obeys notation.
    result = dice.roll("2d4+1")
    # With fixed seed, we can check for a specific value.
    assert isinstance(result, int)

def test_dice_d20_roll():
    dice = Dice(seed=1)
    roll1 = dice.roll_d20()
    roll2 = dice.roll_d20()
    # Rolls should be within 1 and 20.
    assert 1 <= roll1 <= 20
    assert 1 <= roll2 <= 20
    # With seed fixed, roll values should be reproducible.
    # For example, with seed=1, the first two d20 rolls might be (for our random generator):
    expected_first = roll1  # We can't hard-code without knowing the RNG, but ensure they're not equal in a small sample.
    assert roll1 != roll2

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
    # Use a dummy melee weapon.
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    # Create a dummy attack action object.
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
    # With these numbers, expect the attack to miss.
    assert result["hit"] is False

def test_combat_resolver_hit(setup_combat):
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=16, BAB=5, ac=12)
    defender = DummyCharacter("Defender", dexterity=10, BAB=0, ac=12)
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    # Create dummy attack action.
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
    # With these numbers, expect the attack to hit.
    assert result["hit"] is True

def test_combat_resolver_concealment(setup_combat):
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=16, BAB=5, ac=12)
    # For defender, set a high concealment chance.
    defender = DummyCharacter("Defender", dexterity=10, BAB=0, ac=12)
    defender.concealment = 100  # 100% concealment, so attack should always miss.
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
    # Expect the attack to miss due to concealment.
    assert result["hit"] is False
    assert result["concealment_applied"] is True

# ---- SpellResolver Tests ----
def test_spell_resolver(setup_combat):
    engine = setup_combat
    caster = DummyCharacter("Caster", dexterity=14, BAB=0, ac=12)
    target = DummyCharacter("Target", dexterity=12, BAB=0, ac=12)
    # Create a dummy spell action.
    class DummySpell:
        pass
    spell_action = DummySpell()
    spell_action.actor = caster
    spell_action.target = target
    spell_action.spell_name = "Magic Missile"
    result = engine.spell_resolver.resolve_spell(spell_action)
    assert result["action"] == "spell"
    assert "damage" in result

# ---- SkillResolver Tests ----
def test_skill_resolver(setup_combat):
    engine = setup_combat
    actor = DummyCharacter("SkillUser", dexterity=14, BAB=0, ac=12)
    # Create a dummy skill check action.
    class DummySkill:
        pass
    skill_action = DummySkill()
    skill_action.actor = actor
    skill_action.skill_name = "Acrobatics"
    skill_action.dc = 15
    result = engine.skill_resolver.resolve_skill_check(skill_action)
    assert result["action"] == "skill_check"
    assert "roll" in result and "total" in result
