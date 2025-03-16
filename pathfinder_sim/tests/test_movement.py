# tests/test_movement.py

import pytest
from movement import Map, MovementAction, NORMAL_COST, DIFFICULT_COST, IMPASSABLE_COST

@pytest.fixture
def simple_map():
    m = Map(5, 5)
    return m

def test_calculate_path_normal(simple_map):
    # Horizontal path from (0,0) to (4,0)
    action = MovementAction(simple_map, (0, 0), (4, 0))
    path = action.execute()
    expected = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)]
    assert path == expected, f"Expected {expected}, got {path}"

def test_calculate_path_with_obstacle():
    # 5x5 map with cell (2,0) impassable.
    m = Map(5, 5)
    m.set_terrain(2, 0, "impassable")
    action = MovementAction(m, (0, 0), (4, 0))
    path = action.execute()
    # Ensure (2,0) is not in the path and start/end are correct.
    assert (2, 0) not in path
    assert path[0] == (0, 0) and path[-1] == (4, 0)

def test_calculate_path_no_path():
    # 3x3 map with middle row completely impassable.
    m = Map(3, 3)
    for x in range(3):
        m.set_terrain(x, 1, "impassable")
    action = MovementAction(m, (0, 0), (2, 2))
    path = action.execute()
    assert path == [], "Expected no path due to complete blockage."

def test_diagonal_path():
    # Test a diagonal path in an open map.
    m = Map(5, 5)
    action = MovementAction(m, (0, 0), (4, 4))
    path = action.execute()
    # The exact path may vary; check that start and end are correct.
    assert path[0] == (0, 0) and path[-1] == (4, 4)
