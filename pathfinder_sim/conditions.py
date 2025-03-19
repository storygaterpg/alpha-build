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
    return DataCondition(name.capitalize(), final_duration, description, modifiers)

# Specific condition subclasses using create_condition from config

class BlindedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("blinded", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class CharmedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("charmed", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class ConfusedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("confused", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class DazedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("dazed", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class DeafenedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("deafened", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class DyingCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("dying", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class FatiguedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("fatigued", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class FlatfootedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("flatfooted", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class FrightenedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("frightened", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class GrappledCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("grappled", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class ImmobilizedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("immobilized", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class ParalyzedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("paralyzed", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class PetrifiedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("petrified", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class SickenedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("sickened", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class StaggeredCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("staggered", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class StunnedCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("stunned", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class UnconsciousCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("unconscious", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class EnfeebledCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("enfeebled", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class DazzledCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("dazzled", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

class EntangledCondition(DataCondition):
    def __init__(self, duration: int = None):
        cond = create_condition("entangled", duration)
        super().__init__(cond.name, cond.duration, cond.description, cond.modifiers)

# For conditions not defined in config, define defaults:
class ProneCondition(DataCondition):
    def __init__(self, duration: int = None):
        description = "Prone: The creature falls prone, incurring a -4 penalty to AC."
        modifiers = {"ac": -4}
        default_duration = duration if duration is not None else 1
        super().__init__("Prone", default_duration, description, modifiers)

class ShakenCondition(DataCondition):
    def __init__(self, duration: int = None):
        description = "Shaken: The creature is unnerved; no direct AC penalty."
        modifiers = {}
        default_duration = duration if duration is not None else 1
        super().__init__("Shaken", default_duration, description, modifiers)
