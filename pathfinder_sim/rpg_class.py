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

# Global cache for RPG class configuration.
_RPG_CLASSES_CONFIG = None
_RPG_CLASSES_PROGRESSION = None

def load_rpg_classes_config() -> Dict[str, Any]:
    global _RPG_CLASSES_CONFIG
    if _RPG_CLASSES_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "rpg_classes.json")
        with open(config_path, "r") as f:
            _RPG_CLASSES_CONFIG = json.load(f)
    return _RPG_CLASSES_CONFIG

def load_rpg_class_progression() -> Dict[str, Any]:
    global _RPG_CLASSES_PROGRESSION
    if _RPG_CLASSES_PROGRESSION is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "rpg_class_progression.json")
        with open(config_path, "r") as f:
            _RPG_CLASSES_PROGRESSION = json.load(f)
    return _RPG_CLASSES_PROGRESSION

class RPGClass:
    """
    Base class for all Pathfinder character classes.
    
    Attributes:
      - name: The class name (e.g., Barbarian, Bard).
      - hit_die: The hit die for the class.
      - base_attack_bonus_progression: Typically "full", "average", or "poor".
      - good_saves: List of saves that are good for the class.
      - class_skills: List of class skills.
      - description: A textual description of the class.
      - special_abilities: List of special abilities granted by the class.
      - skill_per_level: Base number of skill points per level (before adding the Intelligence modifier).
      - progression: A dictionary mapping level numbers to progression data.
    """
    def __init__(self, name: str, hit_die: int, base_attack_bonus_progression: str, good_saves: List[str],
                 class_skills: List[str], description: str, special_abilities: List[str],
                 skill_per_level: int, progression: Dict[str, Any]):
        self.name = name
        self.hit_die = hit_die
        self.base_attack_bonus_progression = base_attack_bonus_progression
        self.good_saves = good_saves
        self.class_skills = class_skills
        self.description = description
        self.special_abilities = special_abilities
        self.skill_per_level = skill_per_level
        self.progression = progression  # Contains progression data for each level.

    def get_progression_at_level(self, level: int) -> Dict[str, Any]:
        """
        Returns the progression data for the given level.
        """
        return self.progression.get(str(level), {})

    def get_skill_points_for_level(self, int_modifier: int) -> int:
        """
        Calculates the total skill points gained at level-up.
        This is determined as:
            skill_points = skill_per_level (from base config) + Intelligence modifier.
        
        Args:
          int_modifier (int): The character's Intelligence modifier.
        
        Returns:
          int: Total skill points available at the level.
        """
        return self.skill_per_level + int_modifier

    def __str__(self) -> str:
        return (f"RPGClass: {self.name}\n"
                f"Hit Die: d{self.hit_die}, BAB Progression: {self.base_attack_bonus_progression}, Good Saves: {', '.join(self.good_saves)}\n"
                f"Class Skills: {', '.join(self.class_skills)}\n"
                f"Skill Points per Level: {self.skill_per_level}\n"
                f"Special Abilities: {', '.join(self.special_abilities)}\n"
                f"Description: {self.description}")

def create_rpg_class(name: str) -> RPGClass:
    """
    Factory function to create an RPGClass instance by name,
    loading its base data from 'config/rpg_classes.json' and its progression data
    from 'config/rpg_class_progression.json'.
    """
    classes_config = load_rpg_classes_config()
    progression_config = load_rpg_class_progression()
    key = name.lower()
    if key not in classes_config:
        raise ValueError(f"RPG class '{name}' is not defined in configuration.")
    base_data = classes_config[key]
    progression_data = progression_config.get(key, {}).get("levels", {})
    return RPGClass(
        name=name,
        hit_die=base_data.get("hit_die"),
        base_attack_bonus_progression=base_data.get("base_attack_bonus_progression"),
        good_saves=base_data.get("good_saves", []),
        class_skills=base_data.get("class_skills", []),
        description=base_data.get("description", ""),
        special_abilities=base_data.get("special_abilities", []),
        skill_per_level=base_data.get("skill_per_level"),
        progression=progression_data
    )
