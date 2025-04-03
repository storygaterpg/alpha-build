"""
action_result.py

Defines the ActionResult class used throughout the simulation to encapsulate the outcome
of every action executed. This includes basic outcome data, a formatted log message,
turn and action IDs, audit metadata (actor ID, target ID, RNG seed), and a debug dictionary
with additional intermediate data for auditability.
"""

from typing import Dict, Any

class ActionResult:
    def __init__(self, action: str, actor_name: str, target_name: str = "",
                 result_data: Dict[str, Any] = None, log: str = "", turn_number: int = 0,
                 action_id: int = 0, debug: Dict[str, Any] = None,
                 actor_id: int = None, target_id: int = None, rng_seed: int = None):
        """
        Initialize an ActionResult.
        
        Parameters:
          - action: The type of action (e.g., "attack", "spell", "maneuver", etc.).
          - actor_name: Name of the actor performing the action.
          - target_name: Name of the target (if applicable).
          - result_data: Dictionary with computed outcomes (damage, hit/miss, etc.).
          - log: Formatted log message.
          - turn_number: The turn in which the action was executed.
          - action_id: Unique ID for the action.
          - debug: Dictionary with additional debugging information (e.g., intermediate dice rolls).
          - actor_id: Unique identifier for the actor (for audit).
          - target_id: Unique identifier for the target (for audit).
          - rng_seed: The RNG seed used when processing this action.
        """
        self.action = action
        self.actor_name = actor_name
        self.target_name = target_name
        self.result_data = result_data if result_data is not None else {}
        self.log = log
        self.turn_number = turn_number
        self.action_id = action_id
        self.debug = debug if debug is not None else {}
        self.actor_id = actor_id
        self.target_id = target_id
        self.rng_seed = rng_seed

    def to_dict(self) -> Dict[str, Any]:
        """
        Serialize the ActionResult to a dictionary for logging or output.
        """
        return {
            "action": self.action,
            "actor_name": self.actor_name,
            "target_name": self.target_name,
            "result_data": self.result_data,
            "log": self.log,
            "turn_number": self.turn_number,
            "action_id": self.action_id,
            "debug": self.debug,
            "actor_id": self.actor_id,
            "target_id": self.target_id,
            "rng_seed": self.rng_seed
        }
