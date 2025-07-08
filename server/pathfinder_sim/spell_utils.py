"""
spell_utils.py
--------------

Utility functions for spells and abilities in the Pathfinder simulation,
as well as summon‐spell support helpers.

Contents:
  - Distance & LOS functions
  - Area‐of‐effect functions
  - Time & distance conversion functions
  - Spell loading and lookup utilities
  - Summon‐spell creature spawning helper
"""

import math
import json
import os
import re
import string
import time
from typing import Any, Dict, List, Tuple

# =============================================================================
# Geometry & Line‐of‐Sight Helpers
# =============================================================================

def calculate_distance(start: Tuple[int, int], end: Tuple[int, int]) -> float:
    """Euclidean distance between two grid cells."""
    dx, dy = end[0] - start[0], end[1] - start[1]
    return math.hypot(dx, dy)

def bresenham_line(start: Tuple[int, int], end: Tuple[int, int]) -> List[Tuple[int, int]]:
    """
    Compute grid cells along the straight line from `start` to `end`
    using Bresenham's algorithm.
    """
    x0, y0 = start
    x1, y1 = end
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x1 > x0 else -1
    sy = 1 if y1 > y0 else -1
    err = dx - dy

    line = []
    x, y = x0, y0
    while True:
        line.append((x, y))
        if (x, y) == (x1, y1):
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy
    return line

def is_line_clear(start: Tuple[int, int], end: Tuple[int, int], game_map) -> bool:
    """
    Checks if any cell between `start` and `end` blocks movement/vision.
    Assumes `game_map.grid_data[y][x] >= 9999` is impassable.
    """
    for x, y in bresenham_line(start, end)[1:]:
        if game_map.grid_data[y][x] >= 9999:
            return False
    return True

# =============================================================================
# Area‐of‐Effect Helpers
# =============================================================================

def area_circle(center: Tuple[int, int], radius: float) -> List[Tuple[int, int]]:
    """Return all cells within `radius` (in grid units) of `center`."""
    cx, cy = center
    cells = []
    for x in range(int(cx - radius), int(cx + radius) + 1):
        for y in range(int(cy - radius), int(cy + radius) + 1):
            if math.hypot(x - cx, y - cy) <= radius:
                cells.append((x, y))
    return cells

def area_cone(center: Tuple[int, int], direction: float, cone_angle: float, range_: float) -> List[Tuple[int, int]]:
    """
    Return all cells within a cone:
      - `direction` in degrees (0 = east, 90 = north)
      - `cone_angle` in degrees total width
      - `range_` in grid units
    """
    cx, cy = center
    dir_rad = math.radians(direction)
    half = math.radians(cone_angle) / 2
    cells = []
    for x in range(int(cx - range_), int(cx + range_) + 1):
        for y in range(int(cy - range_), int(cy + range_) + 1):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r == 0 or r > range_:
                continue
            angle = math.atan2(dy, dx)
            diff = (angle - dir_rad + math.pi) % (2 * math.pi) - math.pi
            if abs(diff) <= half:
                cells.append((x, y))
    return cells

# =============================================================================
# Time & Distance Conversion Helpers
# =============================================================================

def minutes_to_turns(minutes: float) -> int:
    """Convert game‐minutes to 6‐second turns (1 min = 10 turns)."""
    return int(minutes * 10)

def turns_to_minutes(turns: int) -> float:
    """Convert 6‐second turns back to minutes."""
    return turns / 10.0

def hours_to_turns(hours: float) -> int:
    """Convert hours to 6‐second turns (1 hr = 600 turns)."""
    return int(hours * 600)

def turns_to_hours(turns: int) -> float:
    """Convert 6‐second turns back to hours."""
    return turns / 600.0

def feet_to_cells(feet: float) -> float:
    """Convert real‐world feet to grid cells (1 cell = 5 ft)."""
    return feet / 5.0

def cells_to_feet(cells: float) -> float:
    """Convert grid cells back to real‐world feet."""
    return cells * 5.0

# =============================================================================
# Spell Loader & Lookup
# =============================================================================

# Path to the generated spells.json file
SPELLS_JSON_PATH = os.path.join(os.path.dirname(__file__), "spells.json")

def load_spells() -> List[Dict[str, Any]]:
    """
    Load and return the entire spell list from `spells.json`.
    Raises FileNotFoundError or JSONDecodeError if the file is missing/invalid.
    """
    with open(SPELLS_JSON_PATH, "r") as f:
        return json.load(f)

def get_spell(name: str) -> Dict[str, Any]:
    """
    Fetch a single spell by exact name (case-insensitive).
    Returns the spell dict, or None if not found.
    """
    spells = load_spells()
    key = name.lower()
    for spell in spells:
        if spell.get("name", "").lower() == key:
            return spell
    return None

# =============================================================================
# Summon‐Spell Helpers
# =============================================================================

def is_summon_spell(spell_name: str) -> bool:
    """
    Determine if this is a Summon‐type spell (e.g. 'Summon Monster X').
    """
    return spell_name.lower().startswith("summon ")

def spawn_summoned_creatures(spell_name: str, caster, game_state) -> None:
    """
    For a Summon‐type spell, instantiate each creature under the caster's control.
    
    Args:
        spell_name: Exact spell name (matches the JSON entry).
        caster: The Character object who cast the spell.
        game_state: The central game/combat manager that can spawn creatures 
                    (must implement a `spawn_minion(creature_name, caster)` method).
    """
    spell = get_spell(spell_name)
    if not spell:
        raise ValueError(f"Spell '{spell_name}' not found in spells.json")
    
    creatures = spell.get("creatures", [])
    if not creatures:
        # No creatures array → not a summon spell or missing data
        return
    
    for entry in creatures:
        creature_name = entry.get("name")
        # Game‐state is responsible for mapping name → NPC stats
        try:
            game_state.spawn_minion(creature_name, caster)
        except Exception as e:
            print(f"[ERROR] Failed to spawn '{creature_name}' for '{spell_name}': {e}")

# =============================================================================
# End of Module
# =============================================================================
