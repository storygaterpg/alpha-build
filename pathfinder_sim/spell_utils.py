"""
spell_utils.py
--------------

This module provides utility functions for spells and abilities in the Pathfinder simulation.
It includes:
  - Distance and line-of-sight functions (calculate_distance, bresenham_line, is_line_clear).
  - Area-of-effect functions (area_circle, area_cone).
  - Time conversion functions (minutes_to_turns, turns_to_minutes, hours_to_turns, turns_to_hours).
  - Distance conversion functions (feet_to_cells, cells_to_feet).

Assumptions:
  - Each grid cell represents 5 feet.
  - One round equals 6 seconds (thus, 1 minute = 10 rounds, 1 hour = 600 rounds).
"""

import math
from typing import List, Tuple

def calculate_distance(start: Tuple[int, int], end: Tuple[int, int]) -> float:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    return math.sqrt(dx**2 + dy**2)

def bresenham_line(start: Tuple[int, int], end: Tuple[int, int]) -> List[Tuple[int, int]]:
    x0, y0 = start
    x1, y1 = end
    cells = []
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    x, y = x0, y0
    sx = -1 if x0 > x1 else 1
    sy = -1 if y0 > y1 else 1
    if dx > dy:
        err = dx / 2.0
        while x != x1:
            cells.append((x, y))
            err -= dy
            if err < 0:
                y += sy
                err += dx
            x += sx
    else:
        err = dy / 2.0
        while y != y1:
            cells.append((x, y))
            err -= dx
            if err < 0:
                x += sx
                err += dy
            y += sy
    cells.append((x1, y1))
    return cells

def is_line_clear(start: Tuple[int, int], end: Tuple[int, int], game_map) -> bool:
    line = bresenham_line(start, end)
    for (x, y) in line[1:]:
        if game_map.grid_data[y][x] >= 9999:
            return False
    return True

def area_circle(center: Tuple[int, int], radius: float) -> List[Tuple[int, int]]:
    cells = []
    cx, cy = center
    for x in range(int(cx - radius), int(cx + radius) + 1):
        for y in range(int(cy - radius), int(cy + radius) + 1):
            if math.sqrt((x - cx)**2 + (y - cy)**2) <= radius:
                cells.append((x, y))
    return cells

def area_cone(center: Tuple[int, int], direction: float, cone_angle: float, range_: float) -> List[Tuple[int, int]]:
    cells = []
    cx, cy = center
    direction_rad = math.radians(direction)
    half_cone = math.radians(cone_angle) / 2.0
    for x in range(int(cx - range_), int(cx + range_) + 1):
        for y in range(int(cy - range_), int(cy + range_) + 1):
            dx = x - cx
            dy = y - cy
            distance = math.sqrt(dx**2 + dy**2)
            if distance > range_ or distance == 0:
                continue
            angle = math.atan2(dy, dx)
            angle_diff = (angle - direction_rad + math.pi) % (2*math.pi) - math.pi
            if abs(angle_diff) <= half_cone:
                cells.append((x, y))
    return cells

def minutes_to_turns(minutes: float) -> int:
    return int(minutes * 10)

def turns_to_minutes(turns: int) -> float:
    return turns / 10.0

def hours_to_turns(hours: float) -> int:
    return int(hours * 600)

def turns_to_hours(turns: int) -> float:
    return turns / 600.0

def feet_to_cells(feet: float) -> float:
    return feet / 5.0

def cells_to_feet(cells: float) -> float:
    return cells * 5.0
