"""
vertical_movement.py
--------------------

This module handles vertical movement mechanics for our Pathfinder simulation.
It supports movement across edges and cliffs by offering multiple options:
  - Jump: Requires an Acrobatics (or Jump) check. The DC scales with the vertical difference.
          On failure, fall damage is calculated based on the vertical distance plus extra
          damage from the margin of failure.
  - Climb (Ladder/Wall): Uses a Climb check. This process may span multiple move actions,
          and progress is tracked by a ClimbState object.
  - Go Around: Takes extra movement cost but requires no skill check.

The system is data-driven so that parameters (base DCs, movement cost, climb rate, etc.) can be adjusted.
"""

import math
import random
from typing import List, Dict, Any, Tuple, Optional

# For simplicity, we set some base constants.
MAX_FALL_DICE = 20  # Maximum of 20d6 damage for falling.

# --- FALL DAMAGE CALCULATION ---
def roll_d6() -> int:
    return random.randint(1, 6)

def calculate_fall_damage(vertical_distance: float, margin_of_failure: int) -> int:
    """
    Calculate falling damage in Pathfinder 1e.
    Standard rule: 1d6 per 10 feet fallen (minimum 1d6).
    The margin_of_failure (an integer) may be added as extra feet fallen (e.g., each point adds 1 extra foot).
    
    Parameters:
      - vertical_distance: The intended vertical distance (in feet) to clear.
      - margin_of_failure: How many feet the check was short (if any).
    
    Returns the total fall damage (sum of d6 rolls).
    """
    total_fall = vertical_distance + margin_of_failure
    # Ensure at least 10 feet fall damage is applied.
    total_fall = max(total_fall, 10)
    num_dice = math.ceil(total_fall / 10)
    num_dice = min(num_dice, MAX_FALL_DICE)
    damage = sum(roll_d6() for _ in range(num_dice))
    return damage

# --- CLIMB STATE TRACKING ---
class ClimbState:
    """
    Tracks the state of a character's climb (or descent) over a vertical obstacle.
    """
    def __init__(self, ladder_height: float):
        self.ladder_height = ladder_height  # Total height (in feet) of the climbable surface.
        self.current_progress = 0.0         # Current vertical progress in feet.

    def advance(self, progress: float) -> bool:
        """
        Advance the climb by a given progress (in feet).
        Returns True if the climb is complete.
        """
        self.current_progress += progress
        return self.current_progress >= self.ladder_height

    def get_remaining(self) -> float:
        """
        Return the remaining vertical distance to complete the climb.
        """
        remaining = self.ladder_height - self.current_progress
        return max(0.0, remaining)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ladder_height": self.ladder_height,
            "current_progress": self.current_progress
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ClimbState":
        state = cls(data.get("ladder_height", 0))
        state.current_progress = data.get("current_progress", 0)
        return state

# --- VERTICAL MOVEMENT OPTIONS ---
def determine_edge_options(current: Tuple[int, int],
                           target: Tuple[int, int],
                           vertical_diff: float,
                           edge_features: Dict[str, Any],
                           character: Optional[Any] = None) -> List[Dict[str, Any]]:
    """
    Determine available movement options when an edge is encountered.
    
    Parameters:
      - current: (x, y) of current cell.
      - target: (x, y) of target cell.
      - vertical_diff: Vertical difference in feet (positive means target is lower).
      - edge_features: Dictionary with keys like "ladder", "stairwell", "wall_height".
      - character: The character attempting the movement.
    
    Returns a list of option dictionaries.
    """
    options = []
    
    # Option: Jump (only applicable for descending edges)
    if vertical_diff > 0:
        # DC calculation: Base DC 15 for up to 10 ft; add +1 for each extra 5 ft.
        base_dc = 15
        extra = max(0, vertical_diff - 10)
        jump_dc = base_dc + math.ceil(extra / 5)
        option_jump = {
            "action_type": "jump",
            "required_skill": "Acrobatics",  # or "Jump"
            "dc": jump_dc,
            "move_cost": 1,  # One move action to attempt jump.
            "description": f"Attempt to jump across a {vertical_diff}-foot drop. DC {jump_dc}."
        }
        options.append(option_jump)
    
    # Option: Climb Ladder
    if "ladder" in edge_features:
        ladder = edge_features["ladder"]
        ladder_height = ladder.get("height", vertical_diff)
        climb_rate = ladder.get("climb_rate", 10)  # Feet per move action.
        base_dc = 10
        extra = math.ceil(ladder_height / 5)
        climb_dc = base_dc + extra
        move_cost = math.ceil(ladder_height / climb_rate)
        option_ladder = {
            "action_type": "climb_ladder",
            "required_skill": "Climb",
            "dc": climb_dc,
            "move_cost": move_cost,
            "description": f"Climb a ladder of {ladder_height} ft height. DC {climb_dc}, takes {move_cost} move actions."
        }
        options.append(option_ladder)
    
    # Option: Go Around (stairwell)
    if "stairwell" in edge_features:
        stairwell = edge_features["stairwell"]
        distance_multiplier = stairwell.get("distance_multiplier", 2)
        option_stairs = {
            "action_type": "go_around",
            "required_skill": None,
            "dc": 0,
            "move_cost": distance_multiplier,
            "description": f"Go around the obstacle; costs extra movement (multiplier {distance_multiplier})."
        }
        options.append(option_stairs)
    
    # Option: Climb Up (for ascending edges)
    if vertical_diff < 0:
        abs_diff = abs(vertical_diff)
        base_dc = 15
        extra = max(0, abs_diff - 10)
        climb_up_dc = base_dc + math.ceil(extra / 5)
        move_cost = math.ceil(abs_diff / 10)
        option_climb_up = {
            "action_type": "climb_up",
            "required_skill": "Climb",
            "dc": climb_up_dc,
            "move_cost": move_cost,
            "description": f"Climb up an edge of {abs_diff} ft difference. DC {climb_up_dc}, costs {move_cost} move actions."
        }
        options.append(option_climb_up)
    
    return options

def attempt_jump(character: Optional[Any], vertical_diff: float) -> Tuple[bool, int, int]:
    """
    Simulate a jump attempt.
    Returns a tuple:
      (success: bool, horizontal_advance: int, fall_damage: int)
    
    The character must make an Acrobatics check against a DC computed from vertical_diff.
    On success, horizontal_advance is computed based on the margin of success.
    On failure, fall damage is calculated using the vertical difference plus extra from margin.
    """
    base_dc = 15
    extra = max(0, vertical_diff - 10)
    dc = base_dc + math.ceil(extra / 5)
    roll = random.randint(1, 20)
    # Assume character.get_effective_skill_modifier("Acrobatics") returns a modifier.
    modifier = character.get_effective_skill_modifier("Acrobatics") if character else 0
    total = roll + modifier
    margin = dc - total if total < dc else total - dc
    if total >= dc:
        # Successful jump: horizontal advance equals base 3 squares plus one extra per 2 points above DC.
        extra_squares = (total - dc) // 2
        horizontal_advance = 3 + extra_squares
        return (True, horizontal_advance, 0)
    else:
        # Failed jump: compute fall damage.
        fall_damage = calculate_fall_damage(vertical_diff, margin)
        return (False, 0, fall_damage)

# Example usage for jump attempt:
if __name__ == "__main__":
    # Create a dummy character with a basic get_effective_skill_modifier.
    class DummyCharacter:
        def __init__(self):
            self.skills = {"Acrobatics": 2}
        def get_effective_skill_modifier(self, skill: str) -> int:
            return self.skills.get(skill, 0)
    dummy = DummyCharacter()
    
    # Test a jump attempt from a 15 ft drop.
    success, advance, damage = attempt_jump(dummy, vertical_diff=15)
    print(f"Jump attempt: success={success}, horizontal advance={advance}, fall damage={damage}")

    # Test edge options.
    current_pos = (5, 5)
    target_pos = (10, 5)
    vertical_diff = 15  # descending
    edge_features = {
        "ladder": {"height": 15, "climb_rate": 10},
        "stairwell": {"distance_multiplier": 3},
        "wall_height": 15
    }
    options = determine_edge_options(current_pos, target_pos, vertical_diff, edge_features, character=dummy)
    for opt in options:
        print(opt)
