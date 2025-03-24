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
from typing import Dict, List, Tuple, Any, Optional
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
        # Create a height map: a 2D array (height x width) of floats representing elevation.
        self.height_map = np.zeros((height, width), dtype=float)
    
    def set_terrain(self, x: int, y: int, terrain_type: str) -> None:
        terrain_type = terrain_type.lower()
        if terrain_type not in TERRAIN_INFO:
            raise ValueError(f"Unknown terrain type: {terrain_type}")
        self.grid_data[y][x] = terrain_type

    def set_height(self, x: int, y: int, height: float) -> None:
        self.height_map[y][x] = height
    
    def get_height(self, x: int, y: int) -> float:
        return self.height_map[y][x]
    
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
        tuple_path = [(node.x, node.y) for node in path] if path else []
        return tuple_path

class MovementAction:
    """
    Represents a standard movement action for a character.
    Uses the Map's terrain data to calculate an optimal path.
    If a terrain cell requires a skill check (e.g., jumpable), additional logic (in vertical_movement.py)
    must be applied.
    """
    def __init__(self, game_map: Map, actor: Any, start: Tuple[int, int], end: Tuple[int, int]):
        self.game_map = game_map
        self.actor = actor
        self.start = start
        self.end = end

    def execute(self) -> Dict[str, Any]:
        # For standard movement, simply calculate the path.
        path = self.game_map.calculate_path(self.start, self.end)
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
        A dummy edge detection function. In a mature implementation, this would use map height data.
        For demonstration, we assume that if moving horizontally, the target is 15 ft lower.
        """
        vertical_diff = 15  # Example: target is 15 ft lower.
        edge_features = {
            "ladder": {"height": 15, "climb_rate": 10},
            "stairwell": {"distance_multiplier": 3},
            "wall_height": 15
        }
        return vertical_diff, edge_features

# The vertical movement logic is now encapsulated in vertical_movement.py.
# For vertical movement, we use the CustomMoveAction defined there.

if __name__ == "__main__":
    # Example usage for testing.
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
    
    # Create a dummy actor with basic attributes.
    class DummyActor:
        def __init__(self):
            self.name = "TestActor"
            self.position = (0, 0)
            self.dexterity = 14
        def get_effective_skill_modifier(self, skill: str) -> int:
            # For testing, return a fixed modifier for Acrobatics/Jump.
            return 2 if skill.lower() in ["acrobatics", "jump"] else 0
    actor = DummyActor()
    
    # Test standard movement.
    standard_action = MovementAction(game_map, actor, (0, 0), (9, 9))
    result_standard = standard_action.execute()
    print("Standard Movement Result:")
    print(result_standard)
    
    # Test edge detection via a dummy vertical movement.
    # For demonstration, override actor.position to a known value.
    actor.position = (0, 0)
    # Create a CustomMoveAction (from vertical_movement.py) to test edge options.
    from vertical_movement import CustomMoveAction
    vertical_action = CustomMoveAction(actor, (7, 0), game_map)
    result_vertical = vertical_action.execute()
    print("Vertical Movement Option Result:")
    print(result_vertical)
