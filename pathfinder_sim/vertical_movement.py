"""
vertical_movement.py
--------------------

This module handles vertical movement mechanics for our Pathfinder simulation.
It supports movement across edges and cliffs by offering multiple options:
  - Jump: Requires an Acrobatics (or Jump) check. The DC scales with the vertical difference.
          On failure, fall damage is calculated.
  - Climb Ladder: Uses a Climb check. This process may span multiple move actions,
          with progress tracked via ClimbState.
  - Go Around: Takes extra movement cost but requires no skill check.
  - Climb Up: For ascending edges.

All parameters are data-driven and can be refined later.
"""

import math
import random
from typing import List, Dict, Any, Tuple, Optional

def determine_edge_options(current: Tuple[int, int],
                           target: Tuple[int, int],
                           vertical_diff: float,
                           edge_features: Dict[str, Any],
                           character: Optional[Any] = None) -> List[Dict[str, Any]]:
    """
    Determine available movement options when crossing an edge with a vertical difference.
    
    Parameters:
      - current: (x, y) coordinates of the current cell.
      - target: (x, y) coordinates of the target cell.
      - vertical_diff: Vertical difference in feet between current and target (positive means target is lower).
      - edge_features: Dictionary containing environmental data (e.g., ladder, stairwell, wall_height).
      - character: The character attempting the move.
      
    Returns:
      A list of option dictionaries, each including:
        - action_type: "jump", "climb_ladder", "go_around", or "climb_up"
        - required_skill: The skill required (if any)
        - dc: Difficulty class for the check (if applicable)
        - move_cost: Estimated movement cost (in move actions)
        - description: A textual description of the option.
    """
    options = []
    
    # Option: Jump (for descending edges)
    if vertical_diff > 0:
        base_dc = 15
        extra = max(0, vertical_diff - 10)
        jump_dc = base_dc + math.ceil(extra / 5)
        options.append({
            "action_type": "jump",
            "required_skill": "Acrobatics",
            "dc": jump_dc,
            "move_cost": 1,
            "description": f"Jump across a {vertical_diff}-foot drop. DC {jump_dc}."
        })
    
    # Option: Climb Ladder (if available)
    if "ladder" in edge_features:
        ladder = edge_features["ladder"]
        ladder_height = ladder.get("height", vertical_diff)
        climb_rate = ladder.get("climb_rate", 10)  # feet per move action
        base_dc = 10
        extra = math.ceil(ladder_height / 5)
        climb_dc = base_dc + extra
        move_cost = math.ceil(ladder_height / climb_rate)
        options.append({
            "action_type": "climb_ladder",
            "required_skill": "Climb",
            "dc": climb_dc,
            "move_cost": move_cost,
            "description": f"Climb a ladder of {ladder_height} ft. DC {climb_dc}, costs {move_cost} move actions."
        })
    
    # Option: Go Around (using a stairwell or similar)
    if "stairwell" in edge_features:
        stairwell = edge_features["stairwell"]
        distance_multiplier = stairwell.get("distance_multiplier", 2)
        options.append({
            "action_type": "go_around",
            "required_skill": None,
            "dc": 0,
            "move_cost": distance_multiplier,
            "description": f"Go around the obstacle; extra movement cost multiplier {distance_multiplier}."
        })
    
    # Option: Climb Up (for ascending edges)
    if vertical_diff < 0:
        abs_diff = abs(vertical_diff)
        base_dc = 15
        extra = max(0, abs_diff - 10)
        climb_up_dc = base_dc + math.ceil(extra / 5)
        move_cost = math.ceil(abs_diff / 10)
        options.append({
            "action_type": "climb_up",
            "required_skill": "Climb",
            "dc": climb_up_dc,
            "move_cost": move_cost,
            "description": f"Climb up an edge of {abs_diff} ft difference. DC {climb_up_dc}, costs {move_cost} move actions."
        })
    
    return options

class CustomMoveAction:
    """
    Custom move action that detects vertical edges using the map's height data.
    If an edge is detected, it uses determine_edge_options to present vertical movement options.
    """
    def __init__(self, actor: Any, target: Tuple[int, int], game_map: Any):
        self.actor = actor
        self.target = target
        self.game_map = game_map

    def detect_edge(self, start: Tuple[int, int], end: Tuple[int, int]) -> Tuple[Optional[float], Dict[str, Any]]:
        """
        Detect a vertical edge by comparing the height at the start and end positions.
        
        Returns:
          - vertical_diff: height(start) - height(end). Positive means target is lower.
          - edge_features: a dictionary with the target cell's terrain type and check requirements.
        """
        current_height = self.game_map.get_height(start[0], start[1])
        target_height = self.game_map.get_height(end[0], end[1])
        vertical_diff = current_height - target_height
        if vertical_diff == 0:
            return None, {}
        terrain = self.game_map.grid_data[end[1]][end[0]]
        edge_features = {"vertical_diff": vertical_diff, "terrain": terrain}
        if terrain in TERRAIN_INFO and TERRAIN_INFO[terrain].get("check"):
            edge_features["check"] = TERRAIN_INFO[terrain]["check"]
            # Also include ladder/stairwell info if present in the map or passed separately.
            if terrain in ["jumpable", "climbable"]:
                # For simplicity, assume a ladder exists for climbable.
                edge_features["ladder"] = {"height": abs(vertical_diff), "climb_rate": 10}
        return vertical_diff, edge_features

    def execute(self) -> Dict[str, Any]:
        vertical_diff, edge_features = self.detect_edge(self.actor.position, self.target)
        if vertical_diff is not None:
            options = determine_edge_options(self.actor.position, self.target, vertical_diff, edge_features, character=self.actor)
            if options:
                chosen = options[0]  # For demonstration, automatically choose the first option.
                # For a jump option, simulate a skill check.
                if chosen["action_type"] == "jump":
                    roll = random.randint(1, 20)
                    modifier = self.actor.get_effective_skill_modifier(chosen["required_skill"]) if chosen["required_skill"] else 0
                    total = roll + modifier
                    outcome = "success" if total >= chosen["dc"] else "failure"
                    return {
                        "action": "jump",
                        "description": chosen["description"],
                        "dc": chosen["dc"],
                        "roll": roll,
                        "modifier": modifier,
                        "total": total,
                        "outcome": outcome,
                        "move_cost": chosen["move_cost"]
                    }
                # For other options, simply return the option details.
                return {
                    "action": chosen["action_type"],
                    "description": chosen["description"],
                    "dc": chosen["dc"],
                    "move_cost": chosen["move_cost"]
                }
        # If no edge is detected, perform standard movement.
        from movement import MovementAction
        standard_action = MovementAction(self.game_map, self.actor.position, self.target)
        path = standard_action.execute()
        if path:
            self.actor.position = path[-1]
        return {"action": "move", "path": path, "final_position": self.actor.position}

# Example usage for testing vertical movement (can be removed or integrated into main simulation later):
if __name__ == "__main__":
    # For testing, we assume that the Map class has methods set_height and get_height.
    # Create a dummy map with height data.
    from movement import Map
    game_map = Map(10, 10)
    for y in range(10):
        for x in range(10):
            game_map.set_height(x, y, 0)
            game_map.set_terrain(x, y, "normal")
    # Create a cliff: column 5 has height 0; column 6 has height -15.
    for y in range(10):
        game_map.set_height(5, y, 0)
        game_map.set_height(6, y, -15)
        game_map.set_terrain(5, y, "normal")
        game_map.set_terrain(6, y, "jumpable")
    
    # Create a dummy character with a simple effective skill method.
    class DummyCharacter:
        def __init__(self):
            self.position = (4, 5)
            self.dexterity = 14
        def get_effective_skill_modifier(self, skill: str) -> int:
            # For testing, return a fixed value.
            return 2 if skill.lower() in ["acrobatics", "jump"] else 0
    dummy = DummyCharacter()
    
    # Create a custom move action crossing the cliff.
    move_action = CustomMoveAction(actor=dummy, target=(7, 5), game_map=game_map)
    result = move_action.execute()
    print("Vertical Movement Option Result:")
    print(result)
