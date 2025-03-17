"""
character.py
------------

This module defines the Character class for our Pathfinder simulation.
It manages attributes such as position, dexterity, equipment bonuses, conditions, resources,
and now also multiclass progression via class_levels. Derived attributes (e.g., BAB) are recalculated
based on levels in different RPG classes.
"""

from typing import List, Dict, Any
import conditions
import json
import os

class Character:
    """
    A simplified character class.
    
    Attributes:
      - name: Character's name.
      - position: Grid coordinates (x, y).
      - dexterity: Used to compute ability modifiers.
      - Defensive bonuses (armor, shield, etc.).
      - BAB: Base Attack Bonus (calculated from multiclass levels).
      - spells: List of known spells.
      - conditions: List of active conditions.
      - resources: Dictionary tracking limited-use resources.
      - reach: The number of squares this character threatens.
      - class_levels: Dictionary mapping RPG class names to levels (for multiclassing).
    """
    def __init__(self, name: str, x: int, y: int, dexterity: int, reach: int = 1):
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

        # Base Attack Bonus (derived from class levels).
        self.BAB = 0

        self.spells: List[str] = []
        self.conditions: List[conditions.Condition] = []
        self.resources: Dict[str, Any] = self.load_resources()
        self.reach = reach

        # Multiclass: dictionary mapping RPG class names to levels.
        self.class_levels: Dict[str, int] = {}

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

    def load_resources(self) -> Dict[str, Any]:
        config_path = os.path.join(os.path.dirname(__file__), "config", "resource_config.json")
        with open(config_path, "r") as f:
            resource_config = json.load(f)
        resources = {}
        for key, data in resource_config.items():
            resources[key] = data.get("default_max", 0)
        return resources

    def update_resources(self) -> None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "resource_config.json")
        with open(config_path, "r") as f:
            resource_config = json.load(f)
        for key, data in resource_config.items():
            regen_rate = data.get("regen_rate", 0)
            max_value = data.get("default_max", 0)
            self.resources[key] = min(self.resources.get(key, 0) + regen_rate, max_value)

    def update_state(self) -> None:
        self.update_conditions()
        self.update_resources()

    def get_condition_status(self) -> List[Dict[str, Any]]:
        return [cond.get_status() for cond in self.conditions]

    def recalc_stats(self) -> None:
        """
        Recalculate derived attributes based on multiclass levels.
        Currently, we update the Base Attack Bonus (BAB) based on the sum of contributions
        from each class. Using the following simplified progression:
          - Full: +1 per level.
          - Average: floor(0.75 * level).
          - Poor: floor(0.5 * level).
        The RPGClass data is assumed to be provided by our rpg_class.py configuration.
        """
        total_bab = 0
        # For each class, determine the contribution.
        # We assume each class level contributes based on its progression type.
        for class_name, level in self.class_levels.items():
            # Load class data from the configuration.
            # For efficiency, we can use create_rpg_class from rpg_class.py.
            from rpg_class import create_rpg_class
            rpg_class = create_rpg_class(class_name)
            progression = rpg_class.base_attack_bonus_progression.lower()
            if progression == "full":
                total_bab += level  # +1 per level.
            elif progression == "average":
                total_bab += int(0.75 * level)
            elif progression == "poor":
                total_bab += int(0.5 * level)
            else:
                total_bab += level  # Default to full progression.
        self.BAB = total_bab

    def level_up(self, rpg_class: "RPGClass") -> None:
        """
        Increases the character's level in the given RPG class.
        Supports multiclassing: if the character already has levels in that class,
        increment the level; otherwise, set it to 1.
        After leveling up, recalculate derived statistics.
        """
        class_name = rpg_class.name.lower()
        if class_name in self.class_levels:
            self.class_levels[class_name] += 1
        else:
            self.class_levels[class_name] = 1
        self.recalc_stats()
        print(f"{self.name} levels up as {rpg_class.name} to level {self.class_levels[class_name]}.")

    def get_ac(self) -> int:
        base_ac = (10 + self.armor_bonus + self.shield_bonus + self.natural_armor +
                   self.deflection_bonus + self.dodge_bonus + self.get_modifier("DEX") + self.size_modifier)
        for cond in self.conditions:
            modifiers = cond.get_modifiers(self)
            base_ac += modifiers.get("ac", 0)
        return base_ac

    def get_flatfooted_ac(self) -> int:
        base_ac = 10 + self.armor_bonus + self.shield_bonus + self.natural_armor + self.deflection_bonus + self.size_modifier
        for cond in self.conditions:
            modifiers = cond.get_modifiers(self)
            base_ac += modifiers.get("ac", 0)
        return base_ac

    def get_touch_ac(self) -> int:
        base_ac = 10 + self.get_modifier("DEX") + self.dodge_bonus + self.size_modifier
        for cond in self.conditions:
            modifiers = cond.get_modifiers(self)
            base_ac += modifiers.get("ac", 0)
        return base_ac

    def get_threatened_squares(self) -> set:
        threatened = set()
        x, y = self.position
        for dx in range(-self.reach, self.reach + 1):
            for dy in range(-self.reach, self.reach + 1):
                if dx == 0 and dy == 0:
                    continue
                threatened.add((x + dx, y + dy))
        return threatened

    def __str__(self) -> str:
        class_info = ", ".join([f"{name.title()} (lvl {lvl})" for name, lvl in self.class_levels.items()])
        class_str = f", RPG Classes: {class_info}" if class_info else ""
        return (f"Character: {self.name}{class_str}, Position: {self.position}, AC: {self.get_ac()}, "
                f"Flat-footed AC: {self.get_flatfooted_ac()}, Touch AC: {self.get_touch_ac()}, "
                f"Conditions: {self.get_condition_status()}, Resources: {self.resources}, Reach: {self.reach}")
