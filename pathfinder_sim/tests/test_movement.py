"""
tests/test_movement.py

This module tests the movement system for our Pathfinder simulation.
It covers:
  - Basic pathfinding on a simple grid.
  - Obstacle avoidance and ensuring impassable cells are not included in the path.
  - Behavior when no path exists.
  - Diagonal path calculations.
  - Vertical movement detection and execution via CustomMoveAction.
  
Detailed comments explain what each test checks and why.
"""

import pytest
from movement import Map, MovementAction
from vertical_movement import CustomMoveAction
from typing import Tuple

# Define a dummy actor class with proper type hints.
class DummyActor:
    def __init__(self, name: str, position: Tuple[int, int]):
        self.name = name
        self.position = position

    def get_effective_skill_modifier(self, skill: str) -> int:
        # For basic horizontal movement, return 0.
        # For vertical movement tests (e.g., jump), this can be overridden.
        return 0

@pytest.fixture
def simple_map() -> Map:
    """
    Provides a simple 5x5 map with every cell set to normal terrain and height 0.
    """
    m = Map(5, 5)
    for y in range(5):
        for x in range(5):
            m.set_terrain(x, y, "normal")
            m.set_height(x, y, 0)
    return m

def test_calculate_path_normal(simple_map: Map):
    """
    Test a simple horizontal path from (0,0) to (4,0) on a map with all normal terrain.
    """
    dummy = DummyActor("TestActor", (0, 0))
    action = MovementAction(simple_map, dummy, (0, 0), (4, 0))
    result = action.execute()
    path = result.get("path", [])
    expected = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)]
    assert path == expected, f"Expected path {expected}, got {path}"

def test_calculate_path_with_obstacle():
    """
    Test that the pathfinder avoids an impassable cell.
    The cell (2,0) is set as impassable; ensure the computed path does not include it.
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
    # Check that the impassable cell is not in the computed path.
    assert (2, 0) not in path, "Path should not include the impassable cell (2,0)."
    if path:
        assert path[0] == (0, 0) and path[-1] == (4, 0), "The path's start and end positions must match the requested coordinates."

def test_calculate_path_no_path():
    """
    Test a scenario where no valid path exists due to complete blockage.
    On a 3x3 grid with the entire middle row impassable, the path should be empty.
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
    Test that the pathfinder computes a diagonal path correctly.
    The start and end positions should be correct even if intermediate cells vary.
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
    assert path[0] == (0, 0) and path[-1] == (4, 4), "Start and end positions must match the requested coordinates."

# --- Tests for Vertical Movement via CustomMoveAction ---

def test_detect_edge():
    """
    Test that CustomMoveAction.detect_edge correctly computes the vertical difference
    and returns the correct edge features.
    
    For an actor at (0,0) with height 0 and a target at (5,5) with height -15 and terrain 'jumpable',
    the vertical difference should be 15.
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
    assert "check" in edge_features, "Expected edge_features to include a 'check' key for jumpable terrain."

def test_custom_move_action_jump():
    """
    Test the CustomMoveAction for a vertical edge that requires a jump.
    A dummy actor with an effective skill modifier for Acrobatics is used.
    The test verifies that the chosen action is 'jump' and that the result contains a roll and total.
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
    # Override get_effective_skill_modifier for jump-related checks.
    dummy.get_effective_skill_modifier = lambda skill: 2 if skill.lower() in ["acrobatics", "jump"] else 0
    custom_action = CustomMoveAction(dummy, (5, 5), m)
    result = custom_action.execute()
    # Since jump option is automatically chosen for demonstration, verify that result indicates a jump.
    assert result["action"] == "jump", f"Expected action 'jump', got {result['action']}"
    assert "roll" in result and "total" in result, "Expected jump result to include 'roll' and 'total' keys."
