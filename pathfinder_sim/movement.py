"""
movement.py
-----------

This module implements the movement system for our Pathfinder simulation.
It represents the game world as a grid of 5-foot squares, where each cell is assigned
a terrain type. Each terrain type is defined in TERRAIN_INFO with a base movement cost
and, if applicable, a required skill check.
 
Terrain Types:
  - "normal": standard cost (1)
  - "difficult": cost 2
  - "impassable": cannot be traversed
  - "jumpable": requires a Jump check (DC 10, cost 1)
  - "climbable": requires a Climb check (DC 15, cost 1)
  - "swimmable": requires a Swim check (DC 15, cost 1)
  - "flyable": cost 1; if a creature lacks a fly speed, a check might be required (not enforced here)

Additional types can be added as needed.
"""

import numpy as np
from typing import List, Tuple
from pathfinding.core.grid import Grid
from pathfinding.finder.a_star import AStarFinder

# Define terrain information for each type.
TERRAIN_INFO = {
    "normal": {"cost": 1, "check": None},
    "difficult": {"cost": 2, "check": None},
    "impassable": {"cost": None, "check": None},
    "jumpable": {"cost": 1, "check": {"skill": "Jump", "dc": 10}},
    "climbable": {"cost": 1, "check": {"skill": "Climb", "dc": 15}},
    "swimmable": {"cost": 1, "check": {"skill": "Swim", "dc": 15}},
    "flyable": {"cost": 1, "check": None}  # Assuming creatures with fly speed bypass checks.
}

class Map:
    """
    Represents the game world as a grid of cells, each with a terrain type.
    """
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        # Initialize grid_data with default terrain type "normal"
        self.grid_data = np.full((height, width), "normal", dtype=object)
    
    def set_terrain(self, x: int, y: int, terrain_type: str) -> None:
        terrain_type = terrain_type.lower()
        if terrain_type not in TERRAIN_INFO:
            raise ValueError(f"Unknown terrain type: {terrain_type}")
        self.grid_data[y][x] = terrain_type
    
    def get_numeric_grid(self) -> List[List[int]]:
        """
        Convert the internal grid (terrain types) into a 2D list of numeric movement costs.
        For impassable terrain, assign a very high cost (or mark as non-traversable).
        """
        matrix = []
        for row in self.grid_data:
            matrix_row = []
            for cell in row:
                info = TERRAIN_INFO.get(cell)
                if info is None or info["cost"] is None:
                    # Use a very high cost to represent impassability.
                    matrix_row.append(9999)
                else:
                    matrix_row.append(info["cost"])
            matrix.append(matrix_row)
        return matrix

    def get_grid(self) -> Grid:
        """
        Return a Grid object for pathfinding, using the numeric grid.
        """
        matrix = self.get_numeric_grid()
        return Grid(matrix=matrix)
    
    def calculate_path(self, start: Tuple[int, int], end: Tuple[int, int]) -> List[Tuple[int, int]]:
        grid = self.get_grid()
        start_node = grid.node(start[0], start[1])
        end_node = grid.node(end[0], end[1])
        finder = AStarFinder(diagonal_movement=False)
        path, runs = finder.find_path(start_node, end_node, grid)
        # Convert each GridNode in the path to a tuple (x, y)
        tuple_path = [(node.x, node.y) for node in path] if path else []
        return tuple_path

class MovementAction:
    """
    Represents a movement action for a character.
    Uses the Map's terrain data to calculate an optimal path.
    If a terrain cell requires a skill check (e.g., jumpable), then additional logic (outside this module)
    must handle the check before or after pathfinding.
    """
    def __init__(self, game_map: Map, start: Tuple[int, int], end: Tuple[int, int]):
        self.game_map = game_map
        self.start = start
        self.end = end

    def execute(self) -> Dict[str, Any]:
        # Determine if movement crosses an edge with vertical difference.
        # For simplicity, assume we have edge detection logic that computes vertical_diff and edge_features.
        vertical_diff, edge_features = self.detect_edge(self.actor.position, self.target)
        if vertical_diff is not None and abs(vertical_diff) > 0:
            from vertical_movement import determine_edge_options
            options = determine_edge_options(self.actor.position, self.target, vertical_diff, edge_features, character=self.actor)
            # For this example, we choose the first available option.
            chosen_option = options[0] if options else None
            if chosen_option:
                # Log the chosen option; further logic to perform the check would be added here.
                result = {
                    "action": chosen_option["action_type"],
                    "description": chosen_option["description"],
                    "dc": chosen_option["dc"],
                    "move_cost": chosen_option["move_cost"]
                }
                # In a full system, here we would integrate with the rules engine to perform the skill check.
                return result
        # If no edge, or if edge not applicable, fall back to standard pathfinding.
        from movement import MovementAction
        movement_action = MovementAction(self.game_map, self.actor.position, self.target)
        start_pos = self.actor.position
        path = movement_action.execute()
        if path:
            self.actor.position = path[-1]
        result = {
            "action": "move",
            "actor": self.actor.name,
            "path": path,
            "final_position": self.actor.position,
            "justification": "Standard movement action executed."
        }
        return result

    def detect_edge(self, start: Tuple[int, int], end: Tuple[int, int]) -> Tuple[Optional[float], Dict[str, Any]]:
        """
        Dummy edge detection function. In a real implementation, this would use map data to
        determine if there is a vertical difference between start and end.
        Returns a tuple: (vertical_diff in feet, edge_features dictionary)
        """
        # For demonstration, if moving horizontally, assume a vertical drop of 15 ft.
        # In practice, this function would be much more sophisticated.
        vertical_diff = 15  # Example: target is 15 ft lower.
        edge_features = {
            "ladder": {"height": 15, "climb_rate": 10},
            "stairwell": {"distance_multiplier": 3},
            "wall_height": 15
        }
        return vertical_diff, edge_features


# Example usage for testing:
if __name__ == "__main__":
    # Create a 10x10 map.
    game_map = Map(10, 10)
    # Set some terrain:
    # Column 3, rows 3-5 become "difficult"
    for y in range(3, 6):
        game_map.set_terrain(3, y, "difficult")
    # Set cell (5,5) as impassable.
    game_map.set_terrain(5, 5, "impassable")
    # Set cell (2,2) as jumpable.
    game_map.set_terrain(2, 2, "jumpable")
    # Set cell (4,4) as climbable.
    game_map.set_terrain(4, 4, "climbable")
    # Set cell (6,6) as swimmable.
    game_map.set_terrain(6, 6, "swimmable")
    # Set cell (8,8) as flyable.
    game_map.set_terrain(8, 8, "flyable")
    
    movement_action = MovementAction(game_map, (0, 0), (9, 9))
    path = movement_action.execute()
    print("Calculated Path:", path)
