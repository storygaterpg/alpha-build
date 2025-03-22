"""
tests/test_spell_utils.py

This file tests the spell utility functions to ensure that distance calculations,
Bresenham's line algorithm, area-of-effect computations, and conversion functions
work as expected.
"""

import math
import pytest
import spell_utils

def test_calculate_distance():
    # The distance between (0,0) and (3,4) should be exactly 5.
    assert math.isclose(spell_utils.calculate_distance((0, 0), (3, 4)), 5.0)

def test_bresenham_line_horizontal():
    line = spell_utils.bresenham_line((0, 0), (5, 0))
    expected = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (5, 0)]
    assert line == expected, f"Expected {expected}, got {line}"

def test_bresenham_line_diagonal():
    line = spell_utils.bresenham_line((0, 0), (3, 3))
    expected = [(0, 0), (1, 1), (2, 2), (3, 3)]
    assert line == expected, f"Expected {expected}, got {line}"

def test_area_circle_includes_center():
    area = spell_utils.area_circle((5, 5), 1)
    assert (5, 5) in area, "Center of circle should be included in the area."

def test_area_cone_includes_expected():
    # For a cone from (5,5) directed right (0 degrees), with a 90° cone angle and range 2.
    area = spell_utils.area_cone((5, 5), 0, 90, 2)
    # Expect (6,5) to be included.
    assert (6, 5) in area, "Expected cell (6,5) to be in the cone area."
    # (5,6) is less likely to be included.
    assert (5, 6) not in area, "Cell (5,6) should not be in the cone area."

def test_time_conversions():
    # Verify conversion functions for time and distance.
    assert spell_utils.minutes_to_turns(2) == 20, "2 minutes should equal 20 turns."
    assert math.isclose(spell_utils.turns_to_minutes(20), 2.0), "20 turns should equal 2 minutes."
    assert spell_utils.hours_to_turns(1) == 600, "1 hour should equal 600 turns."
    assert math.isclose(spell_utils.turns_to_hours(600), 1.0), "600 turns should equal 1 hour."
    assert spell_utils.feet_to_cells(25) == 5.0, "25 feet should convert to 5 cells."
    assert spell_utils.cells_to_feet(5) == 25.0, "5 cells should convert to 25 feet."
