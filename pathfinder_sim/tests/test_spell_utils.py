# tests/test_spell_utils.py

import math
import pytest
import spell_utils

def test_calculate_distance():
    # Distance between (0,0) and (3,4) should be 5.
    assert math.isclose(spell_utils.calculate_distance((0, 0), (3, 4)), 5.0)

def test_bresenham_line_horizontal():
    line = spell_utils.bresenham_line((0, 0), (5, 0))
    expected = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (5, 0)]
    assert line == expected

def test_bresenham_line_diagonal():
    line = spell_utils.bresenham_line((0, 0), (3, 3))
    expected = [(0, 0), (1, 1), (2, 2), (3, 3)]
    assert line == expected

def test_area_circle_includes_center():
    area = spell_utils.area_circle((5, 5), 1)
    assert (5, 5) in area

def test_area_cone_includes_expected():
    # For a cone from (5,5) directed right (0 degrees), with 90° angle and range 2.
    area = spell_utils.area_cone((5, 5), 0, 90, 2)
    # Expect (6,5) to be included and (5,6) likely not.
    assert (6, 5) in area
    assert (5, 6) not in area

def test_time_conversions():
    assert spell_utils.minutes_to_turns(2) == 20
    assert math.isclose(spell_utils.turns_to_minutes(20), 2.0)
    assert spell_utils.hours_to_turns(1) == 600
    assert math.isclose(spell_utils.turns_to_hours(600), 1.0)
    assert spell_utils.feet_to_cells(25) == 5.0
    assert spell_utils.cells_to_feet(5) == 25.0
