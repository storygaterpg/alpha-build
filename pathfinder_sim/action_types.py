from enum import Enum

class ActionType(Enum):
    STANDARD = "standard"
    MOVE = "move"
    SWIFT = "swift"
    FREE = "free"
    FULL_ROUND = "full_round"
    IMMEDIATE = "immediate"  # Previously added for immediate actions
    READIED = "readied"      # New: for actions readied to be triggered later
    DELAYED = "delayed"      # New: for delaying a character's turn
