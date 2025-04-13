"""
tests/test_rules_engine.py

This file contains tests for the core rules engine, covering dice rolling,
combat resolution (including critical hit logic and concealment), spell resolution,
and skill check resolution.
"""

import math
import pytest
from rules_engine import Dice, RulesEngine, CombatResolver, SpellResolver, SkillResolver
from character import Character

# Create a dummy weapon for testing purposes.
class DummyWeapon:
    def __init__(self, is_ranged: bool = False, threat_range: int = 19, damage_dice: str = "1d8",
                 critical_multiplier: int = 2, check_penalty: int = 0) -> None:
        self.is_ranged = is_ranged
        self.threat_range = threat_range
        self.damage_dice = damage_dice
        self.critical_multiplier = critical_multiplier
        self.check_penalty = check_penalty
        self.name = "dummy weapon"  # For configuration lookup.

# DummyCharacter now inherits from Character for full functionality.
class DummyCharacter(Character):
    def __init__(self, name: str, dexterity: int, BAB: int, ac: int) -> None:
        # Initialize with default x and y positions.
        super().__init__(name, x=0, y=0, dexterity=dexterity)
        # Override BAB.
        self.BAB = BAB
        # For testing AC, we override get_ac method.
        self._ac = ac
        self.conditions = []
        self.spells = []

    def get_ac(self) -> int:
        # Return the overridden AC value.
        return self._ac

# ---- Dice Tests ----

def test_dice_roll() -> None:
    """
    Test that the dice roll function follows standard notation and returns an integer.
    """
    dice = Dice(seed=1)
    result = dice.roll("2d4+1")
    assert isinstance(result, int), "Dice roll should return an integer."

def test_dice_d20_roll() -> None:
    """
    Test that d20 rolls return values in the range 1 to 20.
    """
    dice = Dice(seed=1)
    roll1 = dice.roll_d20()
    roll2 = dice.roll_d20()
    assert 1 <= roll1 <= 20, "d20 roll must be between 1 and 20."
    assert 1 <= roll2 <= 20, "d20 roll must be between 1 and 20."
    assert roll1 != roll2, "Different d20 rolls expected with fixed seed."

# ---- CombatResolver Tests ----

@pytest.fixture
def setup_combat() -> RulesEngine:
    dice = Dice(seed=1)
    engine = RulesEngine(dice)
    return engine

def test_combat_resolver_miss(setup_combat: RulesEngine) -> None:
    """
    Test that under specific conditions, an attack misses.
    """
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=14, BAB=2, ac=12)
    defender = DummyCharacter("Defender", dexterity=12, BAB=0, ac=16)
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    
    # Create a dummy attack action.
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
    assert result.result_data["hit"] is False, "Attack should miss under these conditions."

def test_combat_resolver_hit(setup_combat: RulesEngine) -> None:
    """
    Test that under favorable conditions, an attack hits.
    """
    engine = setup_combat
    # Create attacker with dexterity=16, BAB=5, and ac=12.
    # Increase strength to 18 to get a higher STR modifier.
    attacker = DummyCharacter("Attacker", dexterity=16, BAB=5, ac=12)
    attacker.strength = 18  # Now STR modifier is +4.
    
    # Create defender with dexterity=10, BAB=0, and ac=12.
    defender = DummyCharacter("Defender", dexterity=10, BAB=0, ac=12)
    
    # Create a dummy weapon.
    weapon = DummyWeapon(is_ranged=False, threat_range=19, damage_dice="1d8", critical_multiplier=2)
    
    # Create a dummy attack action.
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
    assert result.result_data["hit"] is True, "Attack should hit under these conditions."


def test_combat_resolver_concealment(setup_combat: RulesEngine) -> None:
    """
    Test that the defender's 100% concealment causes the attack to miss.
    """
    engine = setup_combat
    attacker = DummyCharacter("Attacker", dexterity=16, BAB=5, ac=12)
    defender = DummyCharacter("Defender", dexterity=10, BAB=0, ac=12)
    defender.concealment = 100  # Defender has 100% concealment.
    
    # Set attacker's strength so that its STR modifier is increased
    attacker.strength = 18  # Now (18-10)//2 = +4, which will raise effective bonus

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
    assert result.result_data["hit"] is False, "Attack should miss due to defender's concealment."
    assert result.result_data["concealment_applied"] is True, "Concealment flag should be set."

# ---- SpellResolver Tests ----

def test_spell_resolver(setup_combat: RulesEngine) -> None:
    """
    Test that the spell resolver processes a spell action correctly.
    """
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
    assert result.result_data["spell_name"] == "Magic Missile", "Spell name should be Magic Missile."
    assert "damage" in result.result_data, "Spell result should include damage."

# ---- SkillResolver Tests ----

def test_skill_resolver(setup_combat: RulesEngine) -> None:
    """
    Test that the skill resolver processes a skill check correctly.
    """
    engine = setup_combat
    actor = DummyCharacter("SkillUser", dexterity=14, BAB=0, ac=12)
    class DummySkill:
        pass
    skill_action = DummySkill()
    skill_action.actor = actor
    skill_action.skill_name = "Acrobatics"
    skill_action.dc = 15
    result = engine.skill_resolver.resolve_skill_check(skill_action)
    assert result.action == "skill_check", "Skill check action should be processed."
    assert "roll" in result.result_data and "total" in result.result_data, "Skill check result should include roll and total."
