"""
tests/test_resource_management.py

This module tests the resource management system for our Pathfinder simulation.
It verifies that:
  - A character initializes with the default resources as defined in the resource configuration.
  - Spending a resource reduces its value appropriately.
  - Regeneration via update_resources() increases the resource value without exceeding its maximum.
  - The long_rest() method resets resources (with reset period per long rest or per day) to their default maximums.
  
Comments and clear assertions explain the purpose and expected behavior of each test.
"""

import pytest
import json
import os
from character import Character
from config_manager import load_config  # Use centralized configuration management for consistency

def test_initial_resources():
    """
    Test that a new character initializes with the default resource values.
    Expected resource keys are those defined in the resource configuration.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    # Use the centralized config manager to load the resource configuration.
    resource_config = load_config("resource_config.json")
    expected_keys = list(resource_config.keys())
    for key in expected_keys:
        assert key in char.resources, f"Character should have a '{key}' resource."
        expected_max = resource_config.get(key, {}).get("default_max", 0)
        assert char.resources[key] == expected_max, f"Resource '{key}' should initialize to {expected_max}."

def test_resource_spending_and_regeneration():
    """
    Test that spending a resource decreases its value and that update_resources() regenerates it,
    capping at the configured maximum.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    # For testing, use 'spell_slots' as an example resource.
    initial_spell_slots = char.resources.get("spell_slots", 0)
    # Attempt to spend one spell slot if available.
    if initial_spell_slots > 0:
        assert char.spend_resource("spell_slots", 1), "Should be able to spend a spell slot when available."
        assert char.resources["spell_slots"] == initial_spell_slots - 1, "Spell slots should decrement by 1 after spending."
    else:
        assert not char.spend_resource("spell_slots", 1), "Spending should fail when resource is 0."

    # Load resource configuration for spell_slots using config_manager.
    resource_config = load_config("resource_config.json")
    regen_rate = resource_config.get("spell_slots", {}).get("regen_rate", 0)
    default_max = resource_config.get("spell_slots", {}).get("default_max", 0)
    current = char.resources.get("spell_slots", 0)
    char.update_resources()
    expected = min(current + regen_rate, default_max)
    assert char.resources["spell_slots"] == expected, "Spell slots should regenerate correctly and not exceed maximum."

def test_long_rest_resource_reset():
    """
    Test that the long_rest() method resets resources (with reset period 'per long rest' or 'per day')
    back to their default maximum values.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    # Spend one unit from each resource to simulate usage.
    for key in char.resources:
        # Only attempt spending if resource is greater than zero.
        if char.resources[key] > 0:
            char.spend_resource(key, 1)
    # Perform a long rest.
    char.long_rest()
    # Load resource configuration to compare defaults.
    resource_config = load_config("resource_config.json")
    for key, data in resource_config.items():
        reset_period = data.get("reset_period", "")
        if reset_period in ["per long rest", "per day"]:
            expected_max = data.get("default_max", 0)
            assert char.resources.get(key, 0) == expected_max, (
                f"After long rest, resource '{key}' should be reset to {expected_max}."
            )
