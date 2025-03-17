"""
conditions.py
--------------

This module implements the conditions framework for our Pathfinder simulation using a data-driven approach.
Condition definitions are loaded from an external JSON configuration file, allowing for flexibility and easy adjustments.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
import json
import os

# Global variable to cache the conditions configuration.
_CONDITIONS_CONFIG = None

def load_conditions_config() -> Dict[str, Any]:
    """
    Loads condition definitions from 'config/conditions_config.json' and caches the result.
    """
    global _CONDITIONS_CONFIG
    if _CONDITIONS_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "conditions_config.json")
        with open(config_path, "r") as f:
            _CONDITIONS_CONFIG = json.load(f)
    return _CONDITIONS_CONFIG

class Condition(ABC):
    """
    Abstract base class for conditions affecting a character.
    """
    def __init__(self, name: str, duration: int, description: str) -> None:
        self.name = name
        self.duration = duration
        self.description = description

    @abstractmethod
    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        pass

    def tick(self) -> None:
        """Reduce the condition's duration by one round."""
        self.duration -= 1

    def is_expired(self) -> bool:
        """Return True if the condition's duration is 0 or less."""
        return self.duration <= 0

    def get_status(self) -> Dict[str, Any]:
        """
        Return a summary of the condition, including its name, remaining duration, and description.
        """
        return {"name": self.name, "duration": self.duration, "description": self.description}

class DataCondition(Condition):
    """
    A condition defined by data from the configuration file.
    """
    def __init__(self, name: str, duration: int, description: str, modifiers: Dict[str, int]):
        super().__init__(name, duration, description)
        self.modifiers = modifiers

    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        return self.modifiers

def create_condition(name: str, duration: int = None) -> DataCondition:
    """
    Factory function to create a condition instance by looking up its definition in the configuration.
    If duration is not provided, uses the default_duration from the config.
    """
    config = load_conditions_config()
    key = name.lower()
    if key not in config:
        raise ValueError(f"Condition '{name}' is not defined in the configuration.")
    condition_data = config[key]
    default_duration = condition_data.get("default_duration", 1)
    final_duration = duration if duration is not None else default_duration
    description = condition_data.get("description", f"{name} condition.")
    modifiers = condition_data.get("modifiers", {})
    return DataCondition(name, final_duration, description, modifiers)
