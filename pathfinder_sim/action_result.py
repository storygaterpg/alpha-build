"""
action_result.py

Defines the ActionResult dataclass used to encapsulate the outcome of executing any action
in the Pathfinder simulation. This object includes all relevant audit metadata and details
(such as dice roll values, damage dealt, rule justifications, turn numbers, and action IDs)
to support deterministic debugging and narrative generation.
"""

from dataclasses import dataclass, asdict, field
from typing import Any, Dict, Optional

@dataclass(frozen=True)
class ActionResult:
    # Basic result information
    action: str
    actor_name: str
    target_name: Optional[str] = None

    # A dictionary of detailed result data (e.g., damage, dice rolls, etc.)
    result_data: Dict[str, Any] = field(default_factory=dict)
    
    # The formatted log message for this action
    log: str = ""
    
    # Metadata for turn processing and auditing
    turn_number: Optional[int] = None
    action_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the ActionResult to a dictionary for logging, narrative translation, or testing.
        """
        return asdict(self)
