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
    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "resource_config.json")
    with open(config_path, "r") as f:
        resource_config = json.load(f)
    for key in expected_keys:
        assert key in char.resources, f"Character should have a '{key}' resource."
        expected_max = resource_config.get(key, {}).get("default_max", 0)
        assert char.resources[key] == expected_max, f"Resource '{key}' should initialize to {expected_max}."

def test_resource_spending_and_regeneration():
    """
    Test that spending a resource decreases its value and that update_resources increases it,
    without exceeding the configured maximum.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    initial_spell_slots = char.resources.get("spell_slots", 0)
    if initial_spell_slots > 0:
        assert char.spend_resource("spell_slots", 1), "Should be able to spend a spell slot."
        assert char.resources["spell_slots"] == initial_spell_slots - 1, "Spell slots should decrement by 1."
    else:
        assert not char.spend_resource("spell_slots", 1), "Spending should fail when resource is 0."

    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "resource_config.json")
    with open(config_path, "r") as f:
        resource_config = json.load(f)
    regen_rate = resource_config.get("spell_slots", {}).get("regen_rate", 0)
    default_max = resource_config.get("spell_slots", {}).get("default_max", 0)
    current = char.resources.get("spell_slots", 0)
    char.update_resources()
    expected = min(current + regen_rate, default_max)
    assert char.resources["spell_slots"] == expected, "Spell slots should regenerate correctly, capped at maximum."

def test_long_rest_resource_reset():
    """
    Test that the long_rest() method resets resources (those with reset period per long rest or per day)
    to their default maximum values.
    """
    char = Character("ResourceTester", x=0, y=0, dexterity=14)
    for key in char.resources:
        char.spend_resource(key, 1)
    char.long_rest()
    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "resource_config.json")
    with open(config_path, "r") as f:
        resource_config = json.load(f)
    for key, data in resource_config.items():
        reset_period = data.get("reset_period", "")
        if reset_period in ["per long rest", "per day"]:
            expected_max = data.get("default_max", 0)
            assert char.resources.get(key, 0) == expected_max, f"After long rest, resource '{key}' should be {expected_max}."
