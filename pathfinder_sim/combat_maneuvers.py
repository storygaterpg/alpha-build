"""
combat_maneuvers.py

This module defines the combat maneuver actions for our Pathfinder simulation.
Combat maneuvers (such as bull rush, grapple, etc.) are modeled as specialized actions that
inherit from the common GameAction interface. Their resolution is delegated to new methods
in the CombatResolver (in rules_engine.py) that use data‐driven configurations from maneuvers_config.json.

All maneuver actions return an ActionResult (as introduced in R04) for auditability.
"""

from typing import Dict, Any, Optional
from actions import GameAction
from action_types import ActionType
from action_result import ActionResult

class CombatManeuverAction(GameAction):
    """
    Base class for all combat maneuver actions.
    In addition to the usual GameAction properties, a maneuver action includes a maneuver type.
    """
    def __init__(self, actor, defender, maneuver_type: str, parameters: Dict[str, Any] = None):
        # Set the action type to MANEUVER.
        super().__init__(actor, ActionType.MANEUVER, parameters)
        self.defender = defender
        self.maneuver_type = maneuver_type.lower()  # e.g., "bull_rush", "grapple"

    def execute(self) -> ActionResult:
        """
        Execute the combat maneuver.
        This method must be implemented by concrete subclasses.
        """
        raise NotImplementedError("Subclasses must implement execute() for specific maneuvers.")

class BullRushAction(CombatManeuverAction):
    """
    Implements the Bull Rush maneuver.
    In a bull rush, the attacker attempts to push the defender back.
    The resolution compares the attacker's Combat Maneuver Bonus (CMB) with the defender's
    Combat Maneuver Defense (CMD), possibly modified by environmental factors as defined
    in maneuvers_config.json.
    """
    def __init__(self, actor, defender, parameters: Dict[str, Any] = None):
        super().__init__(actor, defender, "bull_rush", parameters)

    def execute(self) -> ActionResult:
        # Delegate to the rules engine's combat resolver for bull rush.
        result = self.rules_engine.combat_resolver.resolve_bull_rush(self)
        return result

class GrappleAction(CombatManeuverAction):
    """
    Implements the Grapple maneuver.
    The attacker attempts to restrain the defender by comparing CMB to CMD.
    May impose penalties on the defender’s actions if successful.
    """
    def __init__(self, actor, defender, parameters: Dict[str, Any] = None):
        super().__init__(actor, defender, "grapple", parameters)

    def execute(self) -> ActionResult:
        # Delegate to the rules engine's combat resolver for grapple.
        result = self.rules_engine.combat_resolver.resolve_grapple(self)
        return result
