# conditions.py

from abc import ABC, abstractmethod
from typing import Dict, Any
# Ensure that the Character class is imported correctly from your main simulation module.
from pathfinder_sim import Character

class Condition(ABC):
    """
    Base class for conditions affecting a character.
    
    Each condition has:
      - a name,
      - a duration (in rounds),
      - a detailed description that explicitly states both its explicit mechanical effects 
        and any implicit, self-explanatory effects (such as movement restrictions or sensory deficits),
      - and an abstract method get_modifiers() that returns numeric modifiers (e.g., to AC).
    """
    def __init__(self, name: str, duration: int, description: str) -> None:
        self.name = name
        self.duration = duration  # Duration in rounds.
        self.description = description

    @abstractmethod
    def get_modifiers(self, character: Character) -> Dict[str, int]:
        """
        Return a dictionary of numeric modifiers imposed by this condition.
        For example, {"ac": -4} for a prone creature.
        Conditions primarily affecting non-numeric aspects should return {}.
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
        Return a dictionary summarizing the condition, including its name, 
        remaining duration, and a full description of both explicit and implicit effects.
        """
        return {"name": self.name, "duration": self.duration, "description": self.description}

# ---------------------------------------------------------------------------
# Implemented Conditions
# ---------------------------------------------------------------------------

class BlindedCondition(Condition):
    """
    Blinded: The creature cannot see.
    
    Explicit effects:
      - Loses its Dexterity bonus to AC and any dodge bonuses.
      - Takes an extra -2 penalty to AC.
    Implicit effects:
      - Cannot perceive visual details; must rely on other senses for navigation and combat.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Blinded: The creature cannot see, loses its Dexterity bonus to AC and dodge bonuses, "
            "and takes an additional -2 penalty to AC. It cannot perceive visual cues, affecting its situational awareness."
        )
        super().__init__("Blinded", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {"ac": - character.get_modifier('DEX') - 2}

class CharmedCondition(Condition):
    """
    Charmed: The creature regards the charmer as a trusted ally.
    
    Explicit effects:
      - The creature will not attack the charmer and may act in their interest.
    Implicit effects:
      - Its independent decision-making is impaired.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Charmed: The creature treats the charmer as a trusted ally and is influenced to act in their interest. "
            "Its independent judgment is compromised. No direct numeric modifiers apply."
        )
        super().__init__("Charmed", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class ConfusedCondition(Condition):
    """
    Confused: The creature acts unpredictably.
    
    Explicit effects:
      - The creature must roll on a confusion table each round to determine its actions.
    Implicit effects:
      - Its behavior is erratic and unpredictable, potentially harming allies or itself.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Confused: The creature's actions become erratic and unpredictable. It must roll on a confusion table "
            "each round to determine its behavior. No direct numerical modifiers are applied, but its actions may be chaotic."
        )
        super().__init__("Confused", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class DazedCondition(Condition):
    """
    Dazed: The creature is disoriented.
    
    Explicit effects:
      - Can take only a single move or standard action each round.
    Implicit effects:
      - Its overall responsiveness is severely limited.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Dazed: The creature is disoriented and can take only a single move or standard action per round, "
            "instead of a full round of actions. No direct numeric AC modifier is applied."
        )
        super().__init__("Dazed", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class DeafenedCondition(Condition):
    """
    Deafened: The creature cannot hear.
    
    Explicit effects:
      - Suffers a -4 penalty on Perception checks that rely on hearing.
    Implicit effects:
      - Lacks auditory cues, affecting its awareness and responsiveness.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Deafened: The creature cannot hear, suffering a -4 penalty on Perception checks reliant on sound. "
            "It may miss important auditory signals in combat and its environment."
        )
        super().__init__("Deafened", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class DyingCondition(Condition):
    """
    Dying: The creature's hit points have dropped below 0.
    
    Explicit effects:
      - Loses 1 hit point per round until stabilized.
      - Is unconscious and helpless.
    Implicit effects:
      - Represents a critical state requiring immediate aid.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Dying: The creature's hit points are below 0. It loses 1 hit point per round until stabilized, is unconscious and helpless, "
            "and is at risk of death if not rescued."
        )
        super().__init__("Dying", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class FatiguedCondition(Condition):
    """
    Fatigued: The creature is exhausted.
    
    Explicit effects:
      - Suffers a -2 penalty on Strength and Dexterity-based checks.
      - Cannot run or charge.
    Implicit effects:
      - Represents severe physical wear and limits overall performance.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Fatigued: The creature is exhausted, taking a -2 penalty on Strength and Dexterity-based checks, "
            "and is unable to run or charge. Its physical performance is significantly diminished."
        )
        super().__init__("Fatigued", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class FlatfootedCondition(Condition):
    """
    Flat-footed: The creature is caught off-guard.
    
    Explicit effects:
      - Loses its Dexterity bonus to AC and any dodge bonuses.
    Implicit effects:
      - Reflects a temporary vulnerability before the creature has acted.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Flat-footed: The creature is caught off-guard, losing its Dexterity bonus to AC and dodge bonuses. "
            "It is highly vulnerable until it acts."
        )
        super().__init__("Flat-footed", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {"ac": - (character.get_modifier('DEX') + getattr(character, "dodge_bonus", 0))}

class FrightenedCondition(Condition):
    """
    Frightened: The creature is overwhelmed by fear.
    
    Explicit effects:
      - Takes a -2 penalty on attack rolls, saving throws, skill checks, and ability checks.
    Implicit effects:
      - May flee from the source of fear.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Frightened: The creature is overwhelmed by fear, suffering a -2 penalty on attack rolls, saving throws, "
            "and skill checks. It may be compelled to flee from the source of its fear."
        )
        super().__init__("Frightened", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class GrappledCondition(Condition):
    """
    Grappled: The creature is restrained by an opponent.
    
    Explicit effects:
      - Suffers a -4 penalty on Dexterity-based checks.
    Implicit effects:
      - Cannot move freely, making it difficult to escape or reposition.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Grappled: The creature is restrained by an opponent, suffering a -4 penalty on Dexterity-based checks and unable to move freely."
        )
        super().__init__("Grappled", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class ImmobilizedCondition(Condition):
    """
    Immobilized: The creature cannot move from its current position.
    
    Explicit effects:
      - The creature is unable to move.
    Implicit effects:
      - Its tactical repositioning is severely restricted.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Immobilized: The creature is stuck in place and cannot move, restricting its ability to reposition or escape."
        )
        super().__init__("Immobilized", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class ParalyzedCondition(Condition):
    """
    Paralyzed: The creature is completely unable to act.
    
    Explicit effects:
      - Cannot move or take actions and loses its Dexterity bonus to AC.
    Implicit effects:
      - It is rendered helpless and vulnerable.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Paralyzed: The creature is frozen in place, unable to move or take actions, and loses its Dexterity bonus to AC, rendering it helpless."
        )
        super().__init__("Paralyzed", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {"ac": - character.get_modifier('DEX')}

class PetrifiedCondition(Condition):
    """
    Petrified: The creature is turned to stone.
    
    Explicit effects:
      - Becomes immobile and inanimate.
    Implicit effects:
      - It cannot act or be affected by most conditions.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Petrified: The creature is turned to stone, becoming immobile and inanimate. It is removed from combat and cannot act."
        )
        super().__init__("Petrified", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class SickenedCondition(Condition):
    """
    Sickened: The creature is overcome by nausea.
    
    Explicit effects:
      - Takes a -2 penalty on most ability and skill checks.
    Implicit effects:
      - Its overall performance is impaired.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Sickened: The creature is overcome by nausea, suffering a -2 penalty on most ability and skill checks, reflecting its diminished capacity."
        )
        super().__init__("Sickened", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class StaggeredCondition(Condition):
    """
    Staggered: The creature can take only a single move or standard action each round.
    
    Explicit effects:
      - Limits the creature's actions each round.
    Implicit effects:
      - The creature is severely restricted in its activity.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Staggered: The creature is limited to only a single move or standard action per round, greatly restricting its ability to act."
        )
        super().__init__("Staggered", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class StunnedCondition(Condition):
    """
    Stunned: The creature is unable to act except for free actions.
    
    Explicit effects:
      - Cannot take any actions (except free actions) and suffers a -2 penalty to AC.
    Implicit effects:
      - The creature is completely incapacitated during the condition.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Stunned: The creature is so disoriented that it can take no actions except free actions, and it suffers a -2 penalty to AC."
        )
        super().__init__("Stunned", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {"ac": -2}

class UnconsciousCondition(Condition):
    """
    Unconscious: The creature is knocked out.
    
    Explicit effects:
      - Loses its Dexterity bonus to AC, is flat-footed, and is helpless.
    Implicit effects:
      - The creature is unable to act and is extremely vulnerable.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Unconscious: The creature is knocked out, losing its Dexterity bonus to AC and is considered helpless."
        )
        super().__init__("Unconscious", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {"ac": - character.get_modifier('DEX')}

class EnfeebledCondition(Condition):
    """
    Enfeebled: The creature's Strength is reduced.
    
    Explicit effects:
      - Its melee attacks and damage rolls are impaired.
    Implicit effects:
      - Reflects a temporary weakening of physical power.
      (No direct AC modifier, but may affect combat performance.)
    """
    def __init__(self, duration: int, reduction: int) -> None:
        description = (
            f"Enfeebled: The creature's Strength is temporarily reduced by {reduction}, affecting its melee attack and damage rolls."
        )
        super().__init__("Enfeebled", duration, description)
        self.reduction = reduction

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class DazzledCondition(Condition):
    """
    Dazzled: The creature is affected by bright light.
    
    Explicit effects:
      - Takes a -1 penalty on attack rolls and Perception checks relying on sight.
    Implicit effects:
      - Visual clarity is reduced, impairing its ability to accurately target or perceive details.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Dazzled: The creature is affected by bright light, suffering a -1 penalty on attack rolls and Perception checks that rely on sight."
        )
        super().__init__("Dazzled", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

class EntangledCondition(Condition):
    """
    Entangled: The creature is caught in a restraining substance (e.g., webs).
    
    Explicit effects:
      - Suffers penalties on attack rolls and Dexterity-based checks.
    Implicit effects:
      - Its movement is severely restricted.
    """
    def __init__(self, duration: int) -> None:
        description = (
            "Entangled: The creature is caught in a restraining substance, such as webs or vines. It suffers penalties on attack rolls "
            "and Dexterity-based checks, and its movement is significantly restricted."
        )
        super().__init__("Entangled", duration, description)

    def get_modifiers(self, character: Character) -> Dict[str, int]:
        return {}

# End of conditions.py
