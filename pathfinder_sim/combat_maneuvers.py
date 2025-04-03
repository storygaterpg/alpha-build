"""
combat_maneuvers.py
--------------------
This module defines combat maneuver actions for our Pathfinder simulation.
Maneuvers such as bull rush and grapple inherit from CombatManeuverAction,
which in turn extends the common GameAction interface.
Their resolution is delegated to specialized methods in the CombatResolver.
All maneuver actions return an ActionResult for auditability.
"""

from typing import Dict, Any
from actions import GameAction
from action_types import ActionType
from action_result import ActionResult

class CombatManeuverAction(GameAction):
    """
    Base class for combat maneuver actions.
    In addition to standard GameAction properties, a maneuver action includes a maneuver type.
    """
    def __init__(self, actor: Any, defender: Any, maneuver_type: str, parameters: Dict[str, Any] = None) -> None:
        super().__init__(actor, ActionType.MANEUVER, parameters)
        self.defender = defender
        self.maneuver_type = maneuver_type.lower()  # e.g., "bull_rush", "grapple"

    def execute(self) -> ActionResult:
        """
        Execute the combat maneuver.
        Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement execute() for specific maneuvers.")

class BullRushAction(CombatManeuverAction):
    """
    Implements the Bull Rush maneuver.
    The attacker attempts to push the defender back.
    Resolution is delegated to the combat resolver's resolve_bull_rush method.
    """
    def __init__(self, actor: Any, defender: Any, parameters: Dict[str, Any] = None) -> None:
        super().__init__(actor, defender, "bull_rush", parameters)

    def execute(self) -> ActionResult:
        return self.rules_engine.combat_resolver.resolve_bull_rush(self)

class GrappleAction(CombatManeuverAction):
    """
    Implements the Grapple maneuver.
    The attacker attempts to restrain the defender.
    Resolution is delegated to the combat resolver's resolve_grapple method.
    """
    def __init__(self, actor: Any, defender: Any, parameters: Dict[str, Any] = None) -> None:
        super().__init__(actor, defender, "grapple", parameters)

    def execute(self) -> ActionResult:
        return self.rules_engine.combat_resolver.resolve_grapple(self)
