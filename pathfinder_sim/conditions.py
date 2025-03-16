"""
conditions.py
--------------

This module implements the conditions framework for our Pathfinder simulation.
Each condition is defined as a subclass of the base Condition class. Each condition
has a name, duration (in rounds), and a detailed description that covers both its explicit
mechanical effects and its implicit (self‑explanatory) effects.

Currently implemented conditions include:
  - BlindedCondition
  - ConfusedCondition
  - ProneCondition
  - ShakenCondition
  - StunnedCondition

Additional conditions can be added following this pattern.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from character import Character  # Forward reference for type checking

class Condition(ABC):
    """
    Base class for conditions affecting a character.
    
    Each condition has:
      - a name,
      - a duration (in rounds),
      - a detailed description covering both explicit and implicit effects,
      - and a method get_modifiers() that returns any numeric modifiers (e.g., to AC).
    """
    def __init__(self, name: str, duration: int, description: str) -> None:
        self.name = name
        self.duration = duration
        self.description = description

    @abstractmethod
    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        """
        Return a dictionary of numeric modifiers imposed by this condition.
        For conditions primarily affecting non-numeric aspects, return {}.
        """
        pass

    def tick(self) -> None:
        """Reduce the condition's duration by one round."""
        self.duration -= 1

    def is_expired(self) -> bool:
        """Return True if the condition's duration is 0 or less."""
        return self.duration <= 0

    def get_status(self) -> Dict[str, Any]:
        """
        Return a summary of the condition, including its name, remaining duration,
        and its detailed description.
        """
        return {"name": self.name, "duration": self.duration, "description": self.description}

class BlindedCondition(Condition):
    def __init__(self, duration: int) -> None:
        description = (
            "Blinded: The creature cannot see, loses its Dexterity bonus to AC and dodge bonuses, "
            "and takes an additional -2 penalty to AC. It cannot perceive visual cues, impairing its situational awareness."
        )
        super().__init__("Blinded", duration, description)

    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        return {"ac": - character.get_modifier('DEX') - 2}

class ConfusedCondition(Condition):
    def __init__(self, duration: int) -> None:
        description = (
            "Confused: The creature's actions become erratic and unpredictable. It must roll on a confusion table "
            "each round to determine its behavior. No direct numeric modifiers, but its behavior is chaotic."
        )
        super().__init__("Confused", duration, description)

    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        return {}

class ProneCondition(Condition):
    def __init__(self, duration: int) -> None:
        description = (
            "Prone: The creature is lying on the ground, cannot move normally, must crawl to move, "
            "and requires a move action to stand up. It suffers a -4 penalty to AC against melee attacks."
        )
        super().__init__("Prone", duration, description)

    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        return {"ac": -4}

class ShakenCondition(Condition):
    def __init__(self, duration: int) -> None:
        description = (
            "Shaken: The creature is unnerved, taking a -2 penalty on attack rolls, saving throws, "
            "skill checks, and ability checks. AC is not directly affected."
        )
        super().__init__("Shaken", duration, description)

    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        return {}

class StunnedCondition(Condition):
    def __init__(self, duration: int) -> None:
        description = (
            "Stunned: The creature is so disoriented that it can take no actions except free actions, "
            "and it suffers a -2 penalty to AC. It is completely incapacitated during this time."
        )
        super().__init__("Stunned", duration, description)

    def get_modifiers(self, character: "Character") -> Dict[str, int]:
        return {"ac": -2}
