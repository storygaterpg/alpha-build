"""
rpg_race.py
-----------

This module manages race configuration for our Pathfinder simulation.
Race data is stored in a configuration file (config/races_config.json) that now contains
a flat mapping of race keys to race definitions (ability modifiers, size, speed, languages,
senses, racial traits, bonus feats, and description).
"""

import json
import os
from typing import Dict, Any, List

# Global cache for the races configuration.
_RACES_CONFIG: Dict[str, Any] = {}

def load_races_config() -> Dict[str, Any]:
    """
    Loads and caches the races configuration from 'config/races_config.json'.
    Returns:
        A dictionary mapping race keys (e.g., "catfolk") to their definitions.
    Raises:
        FileNotFoundError: If the configuration file is not found.
        json.JSONDecodeError: If the file is not valid JSON.
    """
    global _RACES_CONFIG
    if not _RACES_CONFIG:
        config_path = os.path.join(os.path.dirname(__file__), "config", "races_config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Races configuration file not found at: {config_path}")
        with open(config_path, "r") as f:
            _RACES_CONFIG = json.load(f)
    return _RACES_CONFIG

class Race:
    """
    Represents a playable race in Pathfinder.
    
    Attributes:
      - name: The name of the race.
      - ability_modifiers: A dict mapping ability names (e.g., "Con", "Wis") to modifiers.
      - size: The size category (e.g., Small, Medium).
      - creature_type: Typically 'Humanoid'.
      - subtype: Specific subtype (e.g., dwarf, elf).
      - speed: Base speed in feet.
      - languages: List of starting languages.
      - senses: Dict of sensory abilities (e.g., darkvision range).
      - racial_traits: List of dicts, each with "name" and "description".
      - bonus_feats: List of bonus feats the race grants.
      - description: A brief textual description.
    """
    def __init__(self,
                 name: str,
                 ability_modifiers: Dict[str, int],
                 size: str,
                 creature_type: str,
                 subtype: str,
                 speed: int,
                 languages: List[str],
                 senses: Dict[str, Any],
                 racial_traits: List[Dict[str, str]],
                 bonus_feats: List[str],
                 description: str) -> None:
        self.name = name
        self.ability_modifiers = ability_modifiers
        self.size = size
        self.creature_type = creature_type
        self.subtype = subtype
        self.speed = speed
        self.languages = languages
        self.senses = senses
        self.racial_traits = racial_traits
        self.bonus_feats = bonus_feats
        self.description = description

    def __str__(self) -> str:
        traits_str = "\n".join([f" - {trait['name']}: {trait['description']}" for trait in self.racial_traits])
        return (f"Race: {self.name}\n"
                f"Size: {self.size}, Speed: {self.speed} ft.\n"
                f"Type: {self.creature_type} ({self.subtype})\n"
                f"Ability Modifiers: {self.ability_modifiers}\n"
                f"Languages: {', '.join(self.languages)}\n"
                f"Senses: {self.senses}\n"
                f"Racial Traits:\n{traits_str}\n"
                f"Bonus Feats: {', '.join(self.bonus_feats)}\n"
                f"Description: {self.description}")

def create_race(race_name: str) -> Race:
    """
    Factory function to create a Race object from the configuration.
    
    Args:
        race_name (str): The name of the race (case-insensitive).
    
    Returns:
        Race: An instance representing the race.
    
    Raises:
        ValueError: If the race is not found in the configuration.
    """
    config = load_races_config()  # Now expects a flat mapping of race definitions.
    key = race_name.lower()
    if key not in config:
        raise ValueError(f"Race '{race_name}' is not defined in the configuration.")
    race_data = config[key]
    return Race(
        name=race_data.get("name", race_name),
        ability_modifiers=race_data.get("ability_modifiers", {}),
        size=race_data.get("size", "Medium"),
        creature_type=race_data.get("type", "Humanoid"),
        subtype=race_data.get("subtype", ""),
        speed=race_data.get("speed", 30),
        languages=race_data.get("languages", []),
        senses=race_data.get("senses", {}),
        racial_traits=race_data.get("racial_traits", []),
        bonus_feats=race_data.get("bonus_feats", []),
        description=race_data.get("description", "")
    )

if __name__ == '__main__':
    # Example usage: Print all races from the configuration.
    try:
        config = load_races_config()
        for race_key in config:
            race_obj = create_race(race_key)
            print(race_obj)
            print("-" * 50)
    except Exception as e:
        print(f"Error loading races configuration: {e}")
