"""
character.py
------------

This module defines the Character class for our Pathfinder simulation.
It manages attributes such as position, abilities, combat statistics, conditions, resources,
and narrative elements. This version includes methods to serialize to and reconstruct from a dictionary.
"""

from typing import List, Dict, Any
import json
import os
import conditions
from rpg_class import RPGClass  # Ensure RPGClass is imported for type annotations

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

        # Additional ability scores (default 10 if not provided)
        self.strength = 10
        self.constitution = 10
        self.intelligence = 10
        self.wisdom = 10
        self.charisma = 10

        # Saves and combat details.
        self.fortitude_save = 0
        self.reflex_save = 0
        self.will_save = 0
        self.hit_points = 0
        self.experience = 0

        # Identity and narrative.
        self.race = "Unknown"
        self.alignment = "Neutral"
        self.deity = "None"
        self.feats: List[str] = []
        self.inventory: List[Dict[str, Any]] = []
        self.background = ""
        self.goals = ""
        self.relationships: List[Dict[str, str]] = []

    def get_modifier(self, ability: str) -> int:
        ability = ability.upper()
        if ability == "DEX":
            return (self.dexterity - 10) // 2
        if ability == "STR":
            return (self.strength - 10) // 2
        if ability == "CON":
            return (self.constitution - 10) // 2
        if ability == "INT":
            return (self.intelligence - 10) // 2
        if ability == "WIS":
            return (self.wisdom - 10) // 2
        if ability == "CHA":
            return (self.charisma - 10) // 2
        return 0

    def has_condition(self, condition_names: list) -> bool:
        """Return True if the character has any condition in the given list (case-insensitive)."""
        return any(cond.name.lower() in [name.lower() for name in condition_names] for cond in self.conditions)

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
    
    def level_up(self, rpg_class: RPGClass) -> None:
        """
        Increase the character's level in the given RPG class.
        Supports multiclassing: if the character already has levels in that class,
        increment the level; otherwise, initialize it to 1.
        After leveling up, recalculate derived statistics.
        """
        class_name = rpg_class.name.lower()
        if class_name in self.class_levels:
            self.class_levels[class_name] += 1
        else:
            self.class_levels[class_name] = 1
        self.recalc_stats()
        print(f"{self.name} levels up as {rpg_class.name} to level {self.class_levels[class_name]}.")


    def recalc_stats(self) -> None:
        """
        Recalculate derived attributes based on multiclass levels using the new progression data.
        For each class in self.class_levels, load the corresponding level data from the progression JSONs
        and sum the BAB (Base Attack Bonus) from the first value in the "BAB" list.
        
        Raises:
            ValueError: If progression data for a class or a specific level is not found.
        """
        total_bab = 0
        from rpg_class import load_rpg_class_progression
        all_progressions = load_rpg_class_progression()
        # Iterate over each class that the character has levels in.
        for class_name, level in self.class_levels.items():
            # Normalize the class name: strip any whitespace and convert to lowercase.
            key = class_name.strip().lower()
            class_progression = all_progressions.get(key)
            if not class_progression:
                raise ValueError(f"No progression data found for class '{class_name}'.")
            # Levels in the progression data are stored as string keys.
            level_data = class_progression.get(str(level))
            if not level_data:
                raise ValueError(f"No progression data for {class_name} at level {level}.")
            bab_list = level_data.get("BAB")
            if bab_list and isinstance(bab_list, list) and len(bab_list) > 0:
                # Use the first element as the BAB contribution for this level.
                total_bab += bab_list[0]
            else:
                # Fallback: simply add the level if BAB data is missing.
                total_bab += level
        self.BAB = total_bab

    def level_up(self, rpg_class: RPGClass) -> None:
        """
        Increase the character's level in the given RPG class.
        Supports multiclassing: if the character already has levels in that class, increment the level;
        otherwise, initialize it to 1. After leveling up, recalculate derived statistics.
        
        Args:
            rpg_class (RPGClass): The RPG class instance representing the class the character is leveling up in.
        """
        # Normalize the class name from the RPGClass instance.
        class_name = rpg_class.name.strip().lower()
        if class_name in self.class_levels:
            self.class_levels[class_name] += 1
        else:
            self.class_levels[class_name] = 1
        # Recalculate derived stats using the new progression data.
        self.recalc_stats()
        print(f"{self.name} levels up as {rpg_class.name} to level {self.class_levels[class_name]}.")

    def get_ac(self) -> int:
        """
        Computes the character's Armor Class (AC).
        Base AC = 10 + armor_bonus + shield_bonus + natural_armor + deflection_bonus + size_modifier.
        Adds Dexterity mod and dodge_bonus only if the character is not affected by conditions
        that remove them (e.g., blinded, flatfooted, paralyzed, unconscious).
        Then adds any additional modifiers from active conditions.
        """
        base_ac = 10 + self.armor_bonus + self.shield_bonus + self.natural_armor + self.deflection_bonus + self.size_modifier
        if not self.has_condition(["blinded", "flatfooted", "paralyzed", "unconscious"]):
            base_ac += self.get_modifier("DEX") + self.dodge_bonus
        for cond in self.conditions:
            base_ac += cond.get_modifiers(self).get("ac", 0)
        return base_ac

    def get_flatfooted_ac(self) -> int:
        base_ac = 10 + self.armor_bonus + self.shield_bonus + self.natural_armor + self.deflection_bonus + self.size_modifier
        for cond in self.conditions:
            base_ac += cond.get_modifiers(self).get("ac", 0)
        return base_ac

    def get_touch_ac(self) -> int:
        base_ac = 10 + self.size_modifier
        if not self.has_condition(["blinded", "flatfooted", "paralyzed", "unconscious"]):
            base_ac += self.get_modifier("DEX") + self.dodge_bonus
        for cond in self.conditions:
            base_ac += cond.get_modifiers(self).get("ac", 0)
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

    def get_effective_skill_modifier(self, ability: str) -> int:
        """
        Returns the effective modifier for a given ability (e.g., 'DEX' or 'STR') for skill checks,
        factoring in the base ability modifier plus cumulative skill penalties from active conditions.
        """
        base = self.get_modifier(ability)
        penalty = 0
        for cond in self.conditions:
            if ability.upper() in [stat.upper() for stat in getattr(cond, "affected_stats", [])]:
                penalty += cond.skill_penalty
        return base + penalty

    def to_dict(self) -> dict:
        """
        Serialize the Character object into a dictionary.
        """
        return {
            "name": self.name,
            "position": self.position,
            "dexterity": self.dexterity,
            "strength": self.strength,
            "constitution": self.constitution,
            "intelligence": self.intelligence,
            "wisdom": self.wisdom,
            "charisma": self.charisma,
            "armor_bonus": self.armor_bonus,
            "shield_bonus": self.shield_bonus,
            "natural_armor": self.natural_armor,
            "deflection_bonus": self.deflection_bonus,
            "dodge_bonus": self.dodge_bonus,
            "size_modifier": self.size_modifier,
            "BAB": self.BAB,
            "spells": self.spells,
            "conditions": [cond.get_status() for cond in self.conditions],
            "resources": self.resources,
            "reach": self.reach,
            "class_levels": self.class_levels,
            "fortitude_save": self.fortitude_save,
            "reflex_save": self.reflex_save,
            "will_save": self.will_save,
            "hit_points": self.hit_points,
            "experience": self.experience,
            "race": self.race,
            "alignment": self.alignment,
            "deity": self.deity,
            "feats": self.feats,
            "inventory": self.inventory,
            "background": self.background,
            "goals": self.goals,
            "relationships": self.relationships
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Character":
        """
        Reconstruct a Character object from a dictionary.
        """
        char = cls(
            name=data.get("name", "Unnamed"),
            x=data.get("position", [0, 0])[0],
            y=data.get("position", [0, 0])[1],
            dexterity=data.get("dexterity", 10)
        )
        char.strength = data.get("strength", 10)
        char.constitution = data.get("constitution", 10)
        char.intelligence = data.get("intelligence", 10)
        char.wisdom = data.get("wisdom", 10)
        char.charisma = data.get("charisma", 10)
        char.armor_bonus = data.get("armor_bonus", 0)
        char.shield_bonus = data.get("shield_bonus", 0)
        char.natural_armor = data.get("natural_armor", 0)
        char.deflection_bonus = data.get("deflection_bonus", 0)
        char.dodge_bonus = data.get("dodge_bonus", 0)
        char.size_modifier = data.get("size_modifier", 0)
        char.BAB = data.get("BAB", 0)
        char.spells = data.get("spells", [])
        # Reconstruct conditions using our helper function from conditions.py.
        from conditions import condition_from_status_list
        char.conditions = condition_from_status_list(data.get("conditions", []))
        char.resources = data.get("resources", {})
        char.reach = data.get("reach", 1)
        char.class_levels = data.get("class_levels", {})
        char.fortitude_save = data.get("fortitude_save", 0)
        char.reflex_save = data.get("reflex_save", 0)
        char.will_save = data.get("will_save", 0)
        char.hit_points = data.get("hit_points", 0)
        char.experience = data.get("experience", 0)
        char.race = data.get("race", "Unknown")
        char.alignment = data.get("alignment", "Neutral")
        char.deity = data.get("deity", "None")
        char.feats = data.get("feats", [])
        char.inventory = data.get("inventory", [])
        char.background = data.get("background", "")
        char.goals = data.get("goals", "")
        char.relationships = data.get("relationships", [])
        return char

    def __str__(self) -> str:
        class_info = ", ".join([f"{name.title()} (lvl {lvl})" for name, lvl in self.class_levels.items()])
        class_str = f", RPG Classes: {class_info}" if class_info else ""
        return (f"Character: {self.name}{class_str}, Position: {self.position}, AC: {self.get_ac()}, "
                f"Flat-footed AC: {self.get_flatfooted_ac()}, Touch AC: {self.get_touch_ac()}, "
                f"Conditions: {self.get_condition_status()}, Resources: {self.resources}, Reach: {self.reach}")
