"""
tests/test_movement.py

This file contains tests for the movement system. It verifies that pathfinding works correctly
in simple scenarios, handles obstacles appropriately, and returns expected results in both normal and edge cases.
"""

import pytest
from movement import Map, MovementAction, NORMAL_COST, DIFFICULT_COST, IMPASSABLE_COST

@pytest.fixture
def simple_map():
    """
    Provides a simple 5x5 map with all cells set to normal terrain.
    """
    m = Map(5, 5)
    return m

def test_calculate_path_normal(simple_map):
    """
    Test a simple horizontal path from (0,0) to (4,0) on a map with all normal terrain.
    """
    action = MovementAction(simple_map, (0, 0), (4, 0))
    path = action.execute()
    expected = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)]
    assert path == expected, f"Expected {expected}, got {path}"

def test_calculate_path_with_obstacle():
    """
    Test that a path avoids an impassable obstacle.
    The cell (2,0) is set as impassable, so the path should not include it.
    """
    m = Map(5, 5)
    m.set_terrain(2, 0, "impassable")
    action = MovementAction(m, (0, 0), (4, 0))
    path = action.execute()
    assert (2, 0) not in path, "Path should not include the impassable cell (2,0)."
    assert path[0] == (0, 0) and path[-1] == (4, 0), "Start and end positions should be correct."

def test_calculate_path_no_path():
    """
    Test a scenario where no path exists due to complete blockage.
    A 3x3 map with the middle row set to impassable should return an empty path.
    """
    m = Map(3, 3)
    for x in range(3):
        m.set_terrain(x, 1, "impassable")
    action = MovementAction(m, (0, 0), (2, 2))
    path = action.execute()
    assert path == [], "Expected no path due to complete blockage."

def test_diagonal_path():
    """
    Test that a diagonal path in an open map returns a path with correct start and end points.
    The exact intermediate path may vary.
    """
    m = Map(5, 5)
    action = MovementAction(m, (0, 0), (4, 4))
    path = action.execute()
    assert path[0] == (0, 0) and path[-1] == (4, 4), "Start and end positions must match."
