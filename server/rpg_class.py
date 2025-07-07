"""
rpg_class.py
------------

This module implements the core RPG class system for our Pathfinder simulation.
We use the term 'RPGClass' to represent the character's archetype (e.g., Barbarian, Bard, etc.).
Class-specific data—including base stats and progression tables—is loaded from external configuration files.
"""

import json
import os
from typing import List, Dict, Any

# Global cache for base RPG class configuration from 'config/rpg_classes.json'.
_RPG_CLASSES_CONFIG = None
# Global cache for RPG class progression data loaded from individual JSON files in 'config/rpg_class_progression'.
_RPG_CLASSES_PROGRESSION = None

def load_rpg_classes_config() -> Dict[str, Any]:
    """
    Load the base configuration for all RPG classes from 'config/rpg_classes.json'.
    Returns:
        A dictionary containing base class data keyed by class name (in lowercase).
    """
    global _RPG_CLASSES_CONFIG
    if _RPG_CLASSES_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "rpg_classes.json")
        with open(config_path, "r") as f:
            _RPG_CLASSES_CONFIG = json.load(f)
    return _RPG_CLASSES_CONFIG

class RPGClass:
    """
    Represents a Pathfinder character class.
    Attributes:
      - name: The name of the class (e.g., Barbarian, Bard).
      - hit_die: The hit die for the class.
      - base_attack_bonus_progression: (Deprecated) Old method for BAB progression.
      - good_saves: List of saves that are good for the class.
      - class_skills: List of class skills.
      - skill_per_level: Number of skill points gained per level.
      - description: A textual description of the class.
      - special_abilities: List of special abilities granted by the class.
      - progression: Level-by-level progression data.
    """
    def __init__(self, name: str, hit_die: int, base_attack_bonus_progression: str, good_saves: List[str],
                 class_skills: List[str], skill_per_level: int, description: str, special_abilities: List[str],
                 progression: Dict[str, Any]):
        self.name = name
        self.hit_die = hit_die
        self.base_attack_bonus_progression = base_attack_bonus_progression
        self.good_saves = good_saves
        self.class_skills = class_skills
        self.skill_per_level = skill_per_level
        self.description = description
        self.special_abilities = special_abilities
        self.progression = progression

    def get_progression_at_level(self, level: int) -> Dict[str, Any]:
        """
        Retrieve the progression data for a given level.
        """
        return self.progression.get(str(level), {})

    def calculate_skill_points_for_level(self, int_modifier: int, is_first_level: bool = False) -> int:
        """
        Calculate the number of skill points gained at a given level.
        """
        base_points = self.skill_per_level + int_modifier
        return max(base_points, 1)

    def __str__(self) -> str:
        """
        Return a formatted string representation of the RPG class.
        """
        return (f"RPGClass: {self.name}\n"
                f"Hit Die: d{self.hit_die}, BAB Progression (deprecated): {self.base_attack_bonus_progression}, "
                f"Good Saves: {', '.join(self.good_saves)}\n"
                f"Class Skills: {', '.join(self.class_skills)}\n"
                f"Skill Points per Level: {self.skill_per_level}\n"
                f"Special Abilities: {', '.join(self.special_abilities)}\n"
                f"Description: {self.description}")

def load_rpg_class_progression() -> Dict[str, Any]:
    """
    Load the progression data for all RPG classes from 'config/rpg_class_progression'.
    Returns:
        A dictionary keyed by class names (in lowercase) with their level progression data.
    """
    global _RPG_CLASSES_PROGRESSION
    if _RPG_CLASSES_PROGRESSION is None:
        # Construct the path to the progression folder.
        progression_dir = os.path.join(os.path.dirname(__file__), "config", "rpg_class_progression")
        _RPG_CLASSES_PROGRESSION = {}
        # Iterate over each JSON file in the progression folder.
        for filename in os.listdir(progression_dir):
            if filename.endswith(".json"):
                # Derive the class key from the filename, e.g., "barbarian_config.json" -> "barbarian".
                class_key = filename.replace("_config.json", "").lower()
                file_path = os.path.join(progression_dir, filename)
                try:
                    with open(file_path, "r") as f:
                        data = json.load(f)
                        # Check if the first key is a digit, which indicates the simplified structure.
                        first_key = next(iter(data))
                        if first_key.isdigit():
                            # Use the entire data as the levels dictionary.
                            levels = data
                        else:
                            # Fallback: try to get the levels dictionary from a nested structure.
                            levels = data.get("levels", {})
                        _RPG_CLASSES_PROGRESSION[class_key] = levels
                except Exception as e:
                    print(f"Error loading {filename}: {e}")
        # Debug output: list all keys loaded.
        print("Progression data keys loaded:", list(_RPG_CLASSES_PROGRESSION.keys()))
    return _RPG_CLASSES_PROGRESSION

def create_rpg_class(name: str) -> 'RPGClass':
    """
    Factory function to create an RPGClass instance by name.
    """
    classes_config = load_rpg_classes_config()
    progression_config = load_rpg_class_progression()
    key = name.lower()
    if key not in classes_config:
        raise ValueError(f"RPG class '{name}' is not defined in configuration.")
    base_data = classes_config[key]
    # Retrieve progression data for the class.
    progression_data = progression_config.get(key, {})
    # Remove redundant keys (e.g., "skill_points") if present.
    for lvl, data in progression_data.items():
        data.pop("skill_points", None)
    return RPGClass(
        name=name,
        hit_die=base_data.get("hit_die"),
        base_attack_bonus_progression=base_data.get("base_attack_bonus_progression"),
        good_saves=base_data.get("good_saves", []),
        class_skills=base_data.get("class_skills", []),
        skill_per_level=base_data.get("skill_per_level"),
        description=base_data.get("description", ""),
        special_abilities=base_data.get("special_abilities", []),
        progression=progression_data
    )
