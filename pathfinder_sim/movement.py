"""
movement.py
-----------

This module implements the movement system for our Pathfinder simulation.
It represents the game world as a grid of 5-foot squares, where each cell is assigned
a terrain type and an elevation (height in feet). Each terrain type is defined in TERRAIN_INFO
with a base movement cost and, if applicable, a required skill check.

Terrain Types:
  - "normal": standard cost (1)
  - "difficult": cost 2
  - "impassable": cannot be traversed (non‑traversable cells are marked with a cost of 0)
  - "jumpable": requires a Jump check (DC 10, cost 1)
  - "climbable": requires a Climb check (DC 15, cost 1)
  - "swimmable": requires a Swim check (DC 15, cost 1)
  - "flyable": cost 1; if a creature lacks a fly speed, a check might be required (not enforced here)

Additional terrain types can be added as needed.
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from pathfinding.core.grid import Grid
from pathfinding.finder.a_star import AStarFinder

# Vertical threshold (in feet) for triggering vertical movement options.
VERTICAL_THRESHOLD = 5

# Define terrain information for each type.
# Note: For "impassable", we now set cost to 0 so that the grid marks these cells as unwalkable.
TERRAIN_INFO: Dict[str, Dict[str, Any]] = {
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
    Represents the game world as a grid of cells with both terrain type and elevation.
    """
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        # terrain_map: stores the terrain type (as a string) for each cell.
        self.terrain_map = np.full((height, width), "normal", dtype=object)
        # height_map: stores the elevation (in feet) for each cell.
        self.height_map = np.zeros((height, width), dtype=float)
    
    def set_terrain(self, x: int, y: int, terrain_type: str) -> None:
        """
        Set the terrain type of cell (x, y).
        """
        terrain_type = terrain_type.lower()
        if terrain_type not in TERRAIN_INFO:
            raise ValueError(f"Unknown terrain type: {terrain_type}")
        self.terrain_map[y][x] = terrain_type
    
    def set_height(self, x: int, y: int, height: float) -> None:
        """
        Set the elevation (in feet) of cell (x, y).
        """
        self.height_map[y][x] = height
    
    def get_height(self, x: int, y: int) -> float:
        """
        Get the elevation (in feet) of cell (x, y).
        """
        return self.height_map[y][x]
    
    def get_numeric_grid(self) -> List[List[int]]:
        """
        Convert the terrain_map into a 2D list of numeric movement costs.
        For impassable terrain (where cost is None), assign a cost of 0 to indicate non-traversability.
        """
        matrix: List[List[int]] = []
        for y in range(self.height):
            row: List[int] = []
            for x in range(self.width):
                terrain = self.terrain_map[y][x]
                info = TERRAIN_INFO.get(terrain, {})
                cost = info.get("cost")
                row.append(0 if cost is None else cost)
            matrix.append(row)
        return matrix

    def get_grid(self) -> Grid:
        """
        Return a Grid object (from python-pathfinding) built from the numeric grid.
        """
        matrix = self.get_numeric_grid()
        return Grid(matrix=matrix)
    
    def calculate_path(self, start: Tuple[int, int], end: Tuple[int, int]) -> List[Tuple[int, int]]:
        """
        Calculate an optimal path from start to end using the A* algorithm.
        Returns a list of (x, y) coordinates if a path exists, otherwise an empty list.
        """
        grid = self.get_grid()
        start_node = grid.node(start[0], start[1])
        end_node = grid.node(end[0], end[1])
        finder = AStarFinder(diagonal_movement=False)
        path, _ = finder.find_path(start_node, end_node, grid)
        return [(node.x, node.y) for node in path] if path else []

class MovementAction:
    """
    Represents a standard movement action for a character.
    This action uses the Map's terrain data to calculate an optimal path.
    Vertical movement (such as edges/cliffs) is handled via vertical_movement.py.
    """
    def __init__(self, game_map: Map, actor: Any, start: Tuple[int, int], end: Tuple[int, int]):
        self.game_map = game_map
        self.actor = actor
        self.start = start
        self.end = end

    def _has_vertical_edge(self, path: List[Tuple[int, int]]) -> bool:
        """
        Check the path for any significant vertical differences between consecutive cells.
        Returns True if any adjacent pair has an elevation difference equal or above VERTICAL_THRESHOLD.
        """
        if not path or len(path) < 2:
            return False
        for i in range(1, len(path)):
            prev = path[i - 1]
            curr = path[i]
            height_prev = self.game_map.get_height(prev[0], prev[1])
            height_curr = self.game_map.get_height(curr[0], curr[1])
            if abs(height_prev - height_curr) >= VERTICAL_THRESHOLD:
                return True
        return False

    def execute(self) -> Dict[str, Any]:
        """
        Calculate the optimal path from start to end.
        If a valid path is found, check for significant vertical differences.
        If a vertical edge is detected, delegate the move to the vertical movement subsystem.
        Otherwise, update the actor's position to the final cell and return a result dictionary.
        """
        # Compute horizontal path using A*.
        path = self.game_map.calculate_path(self.start, self.end)
        # Check for vertical edges along the path.
        if path and self._has_vertical_edge(path):
            # If a vertical edge is detected, delegate to CustomMoveAction.
            from vertical_movement import CustomMoveAction
            custom_action = CustomMoveAction(self.actor, self.end, self.game_map)
            return custom_action.execute()
        
        # No significant vertical movement; proceed normally.
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

# For testing purposes.
if __name__ == "__main__":
    # Create a 10x10 map.
    game_map = Map(10, 10)
    for y in range(10):
        for x in range(10):
            game_map.set_height(x, y, 0)
            game_map.set_terrain(x, y, "normal")
    # Create a cliff: column 5 remains at height 0; column 6 is set to -15 ft (representing a drop).
    for y in range(10):
        game_map.set_height(5, y, 0)
        game_map.set_height(6, y, -15)
        game_map.set_terrain(5, y, "normal")
        game_map.set_terrain(6, y, "jumpable")
    
    # Create a dummy actor (for testing).
    class DummyActor:
        def __init__(self):
            self.name = "Dummy"
            self.position = (0, 0)
            self.dexterity = 14
        def get_effective_skill_modifier(self, skill: str) -> int:
            return 2 if skill.lower() in ["acrobatics", "jump"] else 0

    dummy = DummyActor()
    
    # Test movement from (0,0) to (9,9). This should trigger vertical movement if a vertical edge is present.
    action = MovementAction(game_map, actor=dummy, start=(0, 0), end=(9, 9))
    result = action.execute()
    print("Calculated Movement Result:")
    print(result)
