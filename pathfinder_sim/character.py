"""
character.py
------------

This module defines the Character class for our Pathfinder simulation.
It manages attributes such as position, dexterity, equipment bonuses, known spells, and active conditions.
Additionally, it provides methods to compute defense statistics (full AC, flat-footed AC, touch AC)
as required by combat resolution.
"""

from typing import List, Dict, Any
import conditions

class Character:
    """
    A simplified character class.

    Attributes:
      - name: Character's name.
      - position: Grid coordinates (x, y).
      - dexterity: Used to compute ability modifiers.
      - armor_bonus, shield_bonus, natural_armor, deflection_bonus, dodge_bonus, size_modifier: Defensive bonuses.
      - BAB: Base Attack Bonus.
      - spells: List of known spells.
      - conditions: List of active conditions.
    """
    def __init__(self, name: str, x: int, y: int, dexterity: int):
        self.name = name
        self.position = (x, y)
        self.dexterity = dexterity
        
        # Defensive stats.
        self.armor_bonus = 0
        self.shield_bonus = 0
        self.natural_armor = 0
        self.deflection_bonus = 0
        self.dodge_bonus = 0
        self.size_modifier = 0

        # Base Attack Bonus.
        self.BAB = 0

        self.spells: List[str] = []
        self.conditions: List[conditions.Condition] = []

    def get_modifier(self, ability: str) -> int:
        if ability.upper() == "DEX":
            return (self.dexterity - 10) // 2
        return 0

    def add_condition(self, condition: conditions.Condition) -> None:
        self.conditions.append(condition)
        print(f"{self.name} gains condition: {condition.name} (Duration: {condition.duration} rounds)")

    def update_conditions(self) -> None:
        for condition in self.conditions[:]:
            condition.tick()
            if condition.is_expired():
                self.conditions.remove(condition)
                print(f"{self.name} loses condition: {condition.name}")

    def get_condition_status(self) -> List[Dict[str, Any]]:
        return [cond.get_status() for cond in self.conditions]

    def get_ac(self) -> int:
        """
        Compute full Armor Class (AC):
          AC = 10 + armor_bonus + shield_bonus + natural_armor + deflection_bonus + dodge_bonus + Dex mod + size_modifier
        Condition modifiers (if any) are added.
        """
        base_ac = (10 + self.armor_bonus + self.shield_bonus + self.natural_armor +
                   self.deflection_bonus + self.dodge_bonus + self.get_modifier("DEX") + self.size_modifier)
        for cond in self.conditions:
            modifiers = cond.get_modifiers(self)
            base_ac += modifiers.get("ac", 0)
        return base_ac

    def get_flatfooted_ac(self) -> int:
        """
        Compute flat-footed AC (no Dex mod or dodge bonus).
        """
        base_ac = 10 + self.armor_bonus + self.shield_bonus + self.natural_armor + self.deflection_bonus + self.size_modifier
        for cond in self.conditions:
            modifiers = cond.get_modifiers(self)
            base_ac += modifiers.get("ac", 0)
        return base_ac

    def get_touch_ac(self) -> int:
        """
        Compute touch AC (ignores armor, shield, natural, and deflection bonuses).
          Touch AC = 10 + Dex mod + dodge_bonus + size_modifier, plus condition modifiers.
        """
        base_ac = 10 + self.get_modifier("DEX") + self.dodge_bonus + self.size_modifier
        for cond in self.conditions:
            modifiers = cond.get_modifiers(self)
            base_ac += modifiers.get("ac", 0)
        return base_ac

    def __str__(self) -> str:
        return (f"Character: {self.name}, Position: {self.position}, AC: {self.get_ac()}, "
                f"Flat-footed AC: {self.get_flatfooted_ac()}, Touch AC: {self.get_touch_ac()}, "
                f"Conditions: {self.get_condition_status()}")
