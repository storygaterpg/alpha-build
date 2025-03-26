"""
tests/test_movement.py

This file contains tests for the movement system. It verifies that pathfinding works correctly
in simple scenarios, handles obstacles appropriately, and returns expected results in both normal and edge cases.
Additionally, tests for vertical movement conditions (via CustomMoveAction) are included.
"""

import pytest
from movement import Map, MovementAction
from vertical_movement import CustomMoveAction

# Define a dummy actor for testing MovementAction.
class DummyActor:
    def __init__(self, name, position):
        self.name = name
        self.position = position

    def get_effective_skill_modifier(self, skill: str) -> int:
        # For testing, simply return 0 unless testing vertical movement.
        return 0

@pytest.fixture
def simple_map():
    """
    Provides a simple 5x5 map with all cells set to normal terrain and height 0.
    """
    m = Map(5, 5)
    for y in range(5):
        for x in range(5):
            m.set_terrain(x, y, "normal")
            m.set_height(x, y, 0)
    return m

def test_calculate_path_normal(simple_map):
    """
    Test a simple horizontal path from (0,0) to (4,0) on a map with all normal terrain.
    """
    dummy = DummyActor("TestActor", (0, 0))
    action = MovementAction(simple_map, dummy, (0, 0), (4, 0))
    result = action.execute()
    path = result.get("path", [])
    expected = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)]
    assert path == expected, f"Expected {expected}, got {path}"

def test_calculate_path_with_obstacle():
    """
    Test that a path avoids an impassable obstacle.
    The cell (2,0) is set as impassable, so no valid path should pass through it.
    """
    m = Map(5, 5)
    for y in range(5):
        for x in range(5):
            m.set_terrain(x, y, "normal")
            m.set_height(x, y, 0)
    m.set_terrain(2, 0, "impassable")
    dummy = DummyActor("TestActor", (0, 0))
    action = MovementAction(m, dummy, (0, 0), (4, 0))
    result = action.execute()
    path = result.get("path", [])
    # Since an alternative route might be found, we check that the impassable cell is not used.
    assert (2, 0) not in path, "Path should not include the impassable cell (2,0)."
    # Additionally, ensure the start and end are correct.
    if path:
        assert path[0] == (0, 0) and path[-1] == (4, 0), "Start and end positions must match."

def test_calculate_path_no_path():
    """
    Test a scenario where no path exists due to complete blockage.
    A 3x3 map with the middle row set to impassable should return an empty path.
    """
    m = Map(3, 3)
    for y in range(3):
        for x in range(3):
            m.set_terrain(x, y, "normal")
            m.set_height(x, y, 0)
    for x in range(3):
        m.set_terrain(x, 1, "impassable")
    dummy = DummyActor("TestActor", (0, 0))
    action = MovementAction(m, dummy, (0, 0), (2, 2))
    result = action.execute()
    path = result.get("path", [])
    assert path == [], "Expected no path due to complete blockage."

def test_diagonal_path():
    """
    Test that a diagonal path in an open map returns a path with correct start and end points.
    The exact intermediate path may vary.
    """
    m = Map(5, 5)
    for y in range(5):
        for x in range(5):
            m.set_terrain(x, y, "normal")
            m.set_height(x, y, 0)
    dummy = DummyActor("TestActor", (0, 0))
    action = MovementAction(m, dummy, (0, 0), (4, 4))
    result = action.execute()
    path = result.get("path", [])
    assert path[0] == (0, 0) and path[-1] == (4, 4), "Start and end positions must match."

# Tests for vertical movement using CustomMoveAction

def test_detect_edge():
    """
    Test that detect_edge correctly computes the vertical difference and returns appropriate edge features.
    In this test, the actor is at (0,0) at height 0 and the target cell (5,5) is set to height -15
    with terrain "jumpable". The vertical difference should be 15.
    """
    m = Map(10, 10)
    for y in range(10):
        for x in range(10):
            m.set_height(x, y, 0)
            m.set_terrain(x, y, "normal")
    m.set_height(5, 5, -15)
    m.set_terrain(5, 5, "jumpable")
    dummy = DummyActor("VerticalTester", (0, 0))
    custom_action = CustomMoveAction(dummy, (5, 5), m)
    vertical_diff, edge_features = custom_action.detect_edge(dummy.position, (5, 5))
    assert vertical_diff == 15, f"Expected vertical difference 15, got {vertical_diff}"
    assert edge_features.get("terrain") == "jumpable", f"Expected terrain 'jumpable', got {edge_features.get('terrain')}"
    assert "check" in edge_features, "Expected edge_features to include 'check' for jumpable terrain."

def test_custom_move_action_jump():
    """
    Test the CustomMoveAction when a vertical edge exists that requires a jump.
    A dummy actor with an effective skill modifier for Acrobatics is used.
    """
    m = Map(10, 10)
    for y in range(10):
        for x in range(10):
            m.set_height(x, y, 0)
            m.set_terrain(x, y, "normal")
    # Set target cell with a height drop and jumpable terrain.
    m.set_height(5, 5, -15)
    m.set_terrain(5, 5, "jumpable")
    dummy = DummyActor("VerticalTester", (0, 0))
    # Define an effective skill modifier for Acrobatics (used for jump checks) that returns 2.
    dummy.get_effective_skill_modifier = lambda skill: 2 if skill.lower() in ["acrobatics", "jump"] else 0
    custom_action = CustomMoveAction(dummy, (5, 5), m)
    result = custom_action.execute()
    # Since jump option is chosen automatically, expect a jump result with outcome.
    assert result["action"] == "jump", f"Expected action 'jump', got {result['action']}"
    assert "roll" in result and "total" in result, "Expected jump result to include roll and total."
