"""
tests/test_character_sheet.py

This module tests the functionality for generating, saving, and loading character sheets.
It validates that:
  - All required fields are present in the generated sheet.
  - The sheet conforms to the JSON schema.
  - Saving and re-loading the sheet preserves the data.
  - An invalid sheet (e.g., missing required fields) fails validation.
  
Each test is documented to explain what is being verified.
"""

import json
import os
import pytest
import jsonschema
from character import Character
import character_sheet

@pytest.fixture
def sample_character() -> Character:
    """
    Creates and returns a sample Character instance with a wide range of attributes.
    This character is used to verify that the character sheet generator correctly includes all necessary fields.
    """
    char = Character("TestHero", x=0, y=0, dexterity=16)
    # Set ability scores explicitly.
    char.strength = 18
    char.constitution = 14
    char.intelligence = 12
    char.wisdom = 10
    char.charisma = 8
    
    # Set combat-related stats.
    char.fortitude_save = 4
    char.reflex_save = 2
    char.will_save = 0
    char.hit_points = 30
    
    # Set class levels, feats, spells, and other resources.
    char.class_levels = {"fighter": 1}
    char.feats = ["Power Attack", "Cleave"]
    char.spells = ["Magic Missile"]
    
    # Assume resources are loaded from the configuration.
    # Set inventory and narrative elements.
    char.inventory = [{"name": "Longsword", "quantity": 1}, {"name": "Potion of Healing", "quantity": 3}]
    char.race = "Human"
    char.alignment = "Lawful Good"
    char.deity = "Sarenrae"
    char.background = "TestHero grew up in a small village and has a troubled past."
    char.goals = "To become a renowned hero and protect the innocent."
    char.relationships = [{"name": "Alice", "relation": "Friend"}, {"name": "Bob", "relation": "Rival"}]
    
    # Add conditions that affect the character's state.
    from conditions import BlindedCondition, FatiguedCondition
    char.add_condition(BlindedCondition())
    char.add_condition(FatiguedCondition())
    return char

def test_character_sheet_generation(sample_character: Character) -> None:
    """
    Test that the character sheet is generated correctly:
      - It includes all required top-level keys (version, timestamp, character, narrative).
      - The character sub-dictionary contains all required fields (identity, stats, combat info, etc.).
      - The generated sheet validates against the JSON schema.
    """
    narrative_text = "Test narrative for character sheet generation."
    sheet = character_sheet.create_character_sheet(sample_character, narrative=narrative_text)
    
    # Load the JSON schema from the configuration.
    schema = character_sheet.load_character_sheet_schema()
    
    # Validate the generated sheet against the schema.
    jsonschema.validate(instance=sheet, schema=schema)
    
    # Verify top-level keys.
    expected_top_keys = {"version", "timestamp", "character", "narrative"}
    assert expected_top_keys.issubset(sheet.keys()), f"Sheet should contain keys: {expected_top_keys}"
    
    # Verify that version and narrative match expectations.
    assert sheet["version"] == "1.0", "Character sheet version should be '1.0'."
    assert sheet["narrative"] == narrative_text, "Narrative field should match the provided text."
    
    # Verify that the character sub-dictionary includes all required fields.
    char_keys = set(sheet["character"].keys())
    expected_char_keys = {
        "name", "race", "alignment", "deity", "position", "level", "experience",
        "abilities", "ability_modifiers", "hit_points", "saves", "combat_stats",
        "ac", "flatfooted_ac", "touch_ac", "class_levels", "feats", "spells",
        "resources", "conditions", "inventory", "background", "goals", "relationships",
        "cmb", "cmd", "spell_slots"
    }
    missing_keys = expected_char_keys - char_keys
    assert not missing_keys, f"Character sheet is missing keys: {missing_keys}"

def test_character_sheet_save_and_load(tmp_path: pytest.Path) -> None:
    """
    Test that the character sheet can be saved to a file and then loaded back,
    with the data remaining consistent.
    """
    filename = tmp_path / "test_character_sheet.json"
    narrative_text = "Saving and loading test narrative."
    
    # Save the character sheet.
    character_sheet.save_character_sheet(sample_character(), str(filename), narrative=narrative_text)
    
    # Load the character sheet from file.
    loaded_sheet = character_sheet.load_character_sheet(str(filename))
    
    # Verify that key fields are preserved.
    assert loaded_sheet["version"] == "1.0", "Version should be '1.0' after loading."
    assert loaded_sheet["narrative"] == narrative_text, "Narrative text should match after loading."
    
    character_data = loaded_sheet["character"]
    assert character_data["name"] == sample_character().name, "Character name should remain consistent after loading."
    assert character_data["race"] == sample_character().race, "Character race should remain consistent after loading."

def test_invalid_character_sheet_raises_error(sample_character: Character) -> None:
    """
    Test that if a generated character sheet is modified to be invalid (e.g., by removing a required field),
    the validation function raises a jsonschema.ValidationError.
    """
    sheet = character_sheet.create_character_sheet(sample_character)
    # Remove a required field (e.g., 'name' from the character dictionary).
    del sheet["character"]["name"]
    
    with pytest.raises(jsonschema.ValidationError):
        character_sheet.validate_character_sheet(sheet)
