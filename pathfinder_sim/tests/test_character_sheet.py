"""
tests/test_character_sheet.py

This file contains tests for generating, saving, and loading character sheets.
It ensures that the character sheet output adheres to the JSON schema and that all required
fields (identity, stats, combat info, class levels, feats, spells, resources, conditions,
inventory, background, goals, relationships, narrative, etc.) are correctly generated.
"""

import json
import os
import pytest
import jsonschema
from character import Character
import character_sheet

@pytest.fixture
def sample_character():
    """
    Create and return a sample character with a wide range of attributes for testing.
    """
    char = Character("TestHero", x=0, y=0, dexterity=16)
    # Set abilities explicitly
    char.strength = 18
    char.constitution = 14
    char.intelligence = 12
    char.wisdom = 10
    char.charisma = 8
    # Set combat and progression related attributes.
    char.fortitude_save = 4
    char.reflex_save = 2
    char.will_save = 0
    char.hit_points = 30
    # Class levels, feats, spells, and resources
    char.class_levels = {"fighter": 1}
    char.feats = ["Power Attack", "Cleave"]
    char.spells = ["Magic Missile"]
    # Resources should be loaded from configuration (e.g., spell slots, etc.)
    # For testing, we assume resources are pre-loaded.
    # Set inventory and narrative elements.
    char.inventory = [{"name": "Longsword", "quantity": 1}, {"name": "Potion of Healing", "quantity": 3}]
    char.race = "Human"
    char.alignment = "Lawful Good"
    char.deity = "Sarenrae"
    char.background = "TestHero grew up in a small village and has a troubled past."
    char.goals = "To become a renowned hero and protect the innocent."
    char.relationships = [{"name": "Alice", "relation": "Friend"}, {"name": "Bob", "relation": "Rival"}]
    # Add some conditions.
    from conditions import BlindedCondition, FatiguedCondition
    char.add_condition(BlindedCondition())
    char.add_condition(FatiguedCondition())
    return char

def test_character_sheet_generation(sample_character):
    """
    Test that a character sheet is generated, includes all expected fields,
    and validates against the JSON schema.
    """
    narrative_text = "Test narrative for character sheet generation."
    sheet = character_sheet.create_character_sheet(sample_character, narrative=narrative_text)
    
    # Load the JSON schema.
    schema = character_sheet.load_character_sheet_schema()
    
    # Validate the generated sheet.
    jsonschema.validate(instance=sheet, schema=schema)
    
    # Check for top-level keys.
    expected_top_keys = {"version", "timestamp", "character", "narrative"}
    assert expected_top_keys.issubset(sheet.keys()), f"Sheet should contain keys: {expected_top_keys}"
    
    # Verify the version and narrative.
    assert sheet["version"] == "1.0", "Character sheet version should be '1.0'."
    assert sheet["narrative"] == narrative_text, "Narrative field should match the provided text."
    
    # Verify that character subfields are present.
    char_keys = sheet["character"].keys()
    expected_char_keys = {
        "name", "race", "alignment", "deity", "position", "level", "experience",
        "abilities", "ability_modifiers", "hit_points", "saves", "combat_stats",
        "ac", "flatfooted_ac", "touch_ac", "class_levels", "feats", "spells",
        "resources", "conditions", "inventory", "background", "goals", "relationships"
    }
    missing_keys = expected_char_keys - set(char_keys)
    assert not missing_keys, f"Character sheet is missing keys: {missing_keys}"

def test_character_sheet_save_and_load(tmp_path, sample_character):
    """
    Test that saving a character sheet to file and loading it back produces
    an equivalent valid sheet.
    """
    filename = tmp_path / "test_character_sheet.json"
    narrative_text = "Saving and loading test narrative."
    
    # Save the character sheet.
    character_sheet.save_character_sheet(sample_character, str(filename), narrative=narrative_text)
    
    # Load the character sheet.
    loaded_sheet = character_sheet.load_character_sheet(str(filename))
    
    # Validate that key fields match.
    assert loaded_sheet["version"] == "1.0"
    assert loaded_sheet["narrative"] == narrative_text
    # Check that the character's name and race match.
    character_data = loaded_sheet["character"]
    assert character_data["name"] == sample_character.name
    assert character_data["race"] == sample_character.race

def test_invalid_character_sheet_raises_error(sample_character):
    """
    Test that modifying a generated character sheet to be invalid will cause
    jsonschema.ValidationError during validation.
    """
    # Generate a valid sheet first.
    sheet = character_sheet.create_character_sheet(sample_character)
    # Remove a required key, for example "name" from character data.
    del sheet["character"]["name"]
    with pytest.raises(jsonschema.ValidationError):
        character_sheet.validate_character_sheet(sheet)
