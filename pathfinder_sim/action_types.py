# action_types.py
from enum import Enum

class ActionType(Enum):
    STANDARD = "standard"
    MOVE = "move"
    SWIFT = "swift"
    FREE = "free"
    FULL_ROUND = "full_round"
    IMMEDIATE = "immediate"
    READIED = "readied"
    DELAYED = "delayed"
    MANEUVER = "maneuver"  # New: Represents advanced combat maneuvers (bull rush, grapple, etc.)
