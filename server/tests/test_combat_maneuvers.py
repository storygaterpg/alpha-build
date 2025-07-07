"""
tests/test_combat_maneuvers.py

This file tests combat maneuver actions such as bull rush and grapple.
It verifies that the CombatResolver correctly computes the outcome based on
the attacker’s Combat Maneuver Bonus (CMB) and the defender’s Combat Maneuver Defense (CMD).
"""

import pytest
from rules_engine import Dice, RulesEngine
from character import Character
from combat_maneuvers import BullRushAction, GrappleAction
from action_result import ActionResult

# Create a dummy character subclass with minimal additional attributes.
class DummyCharacter(Character):
    def __init__(self, name, x, y, dexterity, strength, bab, cmd):
        super().__init__(name, x, y, dexterity)
        self.strength = strength
        self.BAB = bab
        # For testing, we manually set CMD.
        self.cmd = cmd


@pytest.fixture
def combat_engine():
    dice = Dice(seed=1)
    return RulesEngine(dice)

def test_bull_rush_success(combat_engine):
    # Setup attacker with higher CMB and defender with a lower CMD.
    # Attacker: BAB=5 and strength=20 -> STR mod = 5, so CMB = 5 + 5 = 10.
    # Defender: set CMD = 9.
    attacker = DummyCharacter("Attacker", x=0, y=0, dexterity=14, strength=20, bab=5, cmd=0)
    defender = DummyCharacter("Defender", x=1, y=0, dexterity=12, strength=12, bab=0, cmd=9)
    action = BullRushAction(actor=attacker, defender=defender)
    action.rules_engine = combat_engine
    result = action.execute()
    assert result.result_data.get("success") is True, "Bull Rush should succeed if attacker's CMB >= defender's CMD."


def test_grapple_failure(combat_engine):
    # Setup attacker with low strength; expect grapple to fail.
    attacker = DummyCharacter("Attacker", 0, 0, dexterity=14, strength=10, bab=3, cmd=0)
    defender = DummyCharacter("Defender", 1, 0, dexterity=12, strength=16, bab=0, cmd=18)
    action = GrappleAction(actor=attacker, defender=defender)
    action.rules_engine = combat_engine
    result = action.execute()
    assert result.result_data.get("success") is False, "Grapple should fail if attacker's CMB < defender's CMD."
