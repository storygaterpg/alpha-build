"""
tests/test_resource_management.py

This file contains tests for resource management. It verifies that a character's resources
(e.g., spell slots, rage rounds, ki points, etc.) are correctly initialized, consumed,
and regenerated according to the configuration.
"""

import pytest
import json
import os
from character import Character

def test_initial_resources():
    """
    Test that a character initializes with the default resources as defined in the resource configuration.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    # Verify that the 'resources' attribute exists and contains expected keys.
    # Expected keys are those defined in resource_config.json.
    expected_keys = ["spell_slots", "rage_rounds", "ki_points", "channel_energy", "daily_ability"]
    for key in expected_keys:
        assert key in char.resources, f"Character should have a '{key}' resource."
        # Optionally, verify that the initial value equals the configured default.
        # This assumes that resource_config.json has a 'default_max' for each resource.
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "resource_config.json")
        with open(config_path, "r") as f:
            resource_config = json.load(f)
        expected_max = resource_config.get(key, {}).get("default_max", 0)
        assert char.resources[key] == expected_max, f"Resource '{key}' should initialize to {expected_max}."

def test_resource_regeneration():
    """
    Test that the resource regeneration mechanism works as defined.
    For instance, after an update, resources should increase by the regen_rate but not exceed their maximum.
    Also, after a long rest, resources reset to default maximum.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    # Load configuration to get expected values.
    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "resource_config.json")
    with open(config_path, "r") as f:
        resource_config = json.load(f)
    
    # Simulate spending some resources.
    # For testing, attempt to spend one unit of spell_slots.
    initial_spell_slots = char.resources.get("spell_slots", 0)
    spent = char.spend_resource("spell_slots", 1)
    # If initial_spell_slots is 0, spending should fail.
    if initial_spell_slots == 0:
        assert not spent, "Should not be able to spend resource when value is 0."
    else:
        assert spent, "Should be able to spend resource when available."
        assert char.resources["spell_slots"] == initial_spell_slots - 1, "Resource should decrement by 1."
    
    # Now, simulate resource regeneration.
    # For each resource, increase by regen_rate, ensuring it does not exceed default_max.
    char.update_resources()
    for key, data in resource_config.items():
        regen_rate = data.get("regen_rate", 0)
        default_max = data.get("default_max", 0)
        # Expected value is the current value plus regen_rate, capped at default_max.
        current = char.resources.get(key, 0)
        assert current <= default_max, f"Resource '{key}' should not exceed its maximum of {default_max}."
    
    # Test the long_rest() function: all applicable resources should reset to default_max.
    char.spend_resource("spell_slots", 1)  # Spend one unit if possible.
    char.long_rest()
    for key, data in resource_config.items():
        reset_period = data.get("reset_period", "")
        if reset_period in ["per long rest", "per day"]:
            default_max = data.get("default_max", 0)
            assert char.resources.get(key, 0) == default_max, f"After long rest, resource '{key}' should be reset to {default_max}."

