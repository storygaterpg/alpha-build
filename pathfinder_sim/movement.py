"""
movement.py
-----------

This module implements the movement system for our Pathfinder simulation.
It provides:
  - A Map class that represents the game world as a grid of 5-foot squares with terrain costs.
  - A MovementAction class that calculates optimal movement paths using the python-pathfinding library.

Terrain Types:
  - "normal": cost 1
  - "difficult": cost 2
  - "impassable": cost 9999 (effectively blocking movement)

The Map class stores its grid as a NumPy array for efficiency.
"""

import numpy as np
from typing import List, Tuple
from pathfinding.core.grid import Grid
from pathfinding.finder.a_star import AStarFinder

# Terrain movement cost constants.
NORMAL_COST = 1
DIFFICULT_COST = 2
IMPASSABLE_COST = 9999

class Map:
    """
    Represents the game world as a grid with terrain movement costs.
    
    Methods:
      - set_terrain(x, y, terrain_type): Sets the movement cost of a cell.
      - get_grid(): Converts the internal NumPy grid to a Grid object for pathfinding.
      - calculate_path(start, end): Uses A* to compute an optimal path between cells.
    """
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.grid_data = np.full((height, width), NORMAL_COST, dtype=np.int32)
    
    def set_terrain(self, x: int, y: int, terrain_type: str) -> None:
        terrain_type = terrain_type.lower()
        if terrain_type == "normal":
            self.grid_data[y][x] = NORMAL_COST
        elif terrain_type == "difficult":
            self.grid_data[y][x] = DIFFICULT_COST
        elif terrain_type == "impassable":
            self.grid_data[y][x] = IMPASSABLE_COST
        else:
            raise ValueError("Unknown terrain type: " + terrain_type)
    
    def get_grid(self) -> Grid:
        matrix = self.grid_data.tolist()
        return Grid(matrix=matrix)
    
    def calculate_path(self, start: Tuple[int, int], end: Tuple[int, int]) -> List[Tuple[int, int]]:
        grid = self.get_grid()
        start_node = grid.node(start[0], start[1])
        end_node = grid.node(end[0], end[1])
        finder = AStarFinder(diagonal_movement=False)
        path, runs = finder.find_path(start_node, end_node, grid)
        return path

class MovementAction:
    """
    Represents a movement action for a character.
    
    Uses the Map's terrain data to calculate an optimal path.
    """
    def __init__(self, game_map: Map, start: Tuple[int, int], end: Tuple[int, int]):
        self.game_map = game_map
        self.start = start
        self.end = end

    def execute(self) -> List[Tuple[int, int]]:
        return self.game_map.calculate_path(self.start, self.end)

# Example usage for testing:
if __name__ == "__main__":
    game_map = Map(10, 10)
    # Set some terrain.
    for y in range(3, 6):
        game_map.set_terrain(3, y, "difficult")
    game_map.set_terrain(5, 5, "impassable")
    movement_action = MovementAction(game_map, (0, 0), (9, 9))
    path = movement_action.execute()
    print("Calculated Path:", path)
