# character_sheet.py

import datetime
import json
from typing import Optional
import os
import jsonschema

def load_character_sheet_schema() -> dict:
    schema_path = os.path.join(os.path.dirname(__file__), "config", "character_sheet_schema.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)
    return schema

def validate_character_sheet(sheet: dict) -> None:
    """
    Validate the character sheet dictionary against the JSON schema.
    Raises jsonschema.ValidationError if invalid.
    """
    schema = load_character_sheet_schema()
    jsonschema.validate(instance=sheet, schema=schema)

def create_character_sheet(character, narrative: Optional[str] = None) -> dict:
    """
    Generate a complete character sheet as a dictionary.
    
    The sheet includes:
      - version: Schema version.
      - timestamp: When the sheet was generated.
      - character: A dictionary of character data, including identity, stats, combat information,
        class levels, feats, spells, resources, conditions, inventory, and narrative fields (background, goals, relationships).
      - narrative: Additional DM notes, lore, or story elements.
    """
    abilities = getattr(character, "abilities", {
        "STR": getattr(character, "strength", 10),
        "DEX": getattr(character, "dexterity", 10),
        "CON": getattr(character, "constitution", 10),
        "INT": getattr(character, "intelligence", 10),
        "WIS": getattr(character, "wisdom", 10),
        "CHA": getattr(character, "charisma", 10)
    })
    
    saves = getattr(character, "saves", {
        "Fortitude": getattr(character, "fortitude_save", 0),
        "Reflex": getattr(character, "reflex_save", 0),
        "Will": getattr(character, "will_save", 0)
    })
    
    combat_stats = getattr(character, "combat_stats", {
        "BAB": character.BAB,
        "CMB": getattr(character, "cmb", 0),
        "CMD": getattr(character, "cmd", 10 + character.BAB)
    })
    
    hit_points = getattr(character, "hit_points", 0)
    level = sum(character.class_levels.values())
    identity = {
        "name": character.name,
        "race": getattr(character, "race", "Unknown"),
        "alignment": getattr(character, "alignment", "Neutral"),
        "deity": getattr(character, "deity", "None")
    }
    
    background = getattr(character, "background", "")
    goals = getattr(character, "goals", "")
    relationships = getattr(character, "relationships", [])
    
    sheet = {
        "version": "1.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "character": {
            **identity,
            "position": list(character.position),
            "level": level,
            "experience": getattr(character, "experience", 0),
            "abilities": abilities,
            "ability_modifiers": {
                "STR": (abilities["STR"] - 10) // 2,
                "DEX": (abilities["DEX"] - 10) // 2,
                "CON": (abilities["CON"] - 10) // 2,
                "INT": (abilities["INT"] - 10) // 2,
                "WIS": (abilities["WIS"] - 10) // 2,
                "CHA": (abilities["CHA"] - 10) // 2
            },
            "hit_points": hit_points,
            "saves": saves,
            "combat_stats": combat_stats,
            "cmb": getattr(character, "cmb", 0),
            "cmd": getattr(character, "cmd", 10 + character.BAB),
            "spell_slots": getattr(character, "spell_slots", {}),
            "ac": character.get_ac(),
            "flatfooted_ac": character.get_flatfooted_ac(),
            "touch_ac": character.get_touch_ac(),
            "class_levels": character.class_levels,
            "feats": getattr(character, "feats", []),
            "spells": character.spells,
            "resources": character.resources,
            "conditions": character.get_condition_status(),
            "inventory": getattr(character, "inventory", []),
            "background": background,
            "goals": goals,
            "relationships": relationships
        },
        "narrative": narrative or ""
    }
    # Validate the sheet against the schema.
    validate_character_sheet(sheet)
    return sheet

def save_character_sheet(character, filename: str, narrative: Optional[str] = None) -> None:
    """
    Save the generated character sheet to a JSON file.
    """
    sheet = create_character_sheet(character, narrative)
    with open(filename, "w") as f:
        json.dump(sheet, f, indent=4)

def load_character_sheet(filename: str) -> dict:
    """
    Load a character sheet from a JSON file, validate it, and return it as a dictionary.
    """
    with open(filename, "r") as f:
        sheet = json.load(f)
    validate_character_sheet(sheet)
    return sheet

if __name__ == "__main__":
    from character import Character
    import conditions
    from rpg_class import create_rpg_class

    # Create a sample character.
    hero = Character("TestHero", x=0, y=0, dexterity=16)
    hero.strength = 18
    hero.constitution = 14
    hero.intelligence = 12
    hero.wisdom = 10
    hero.charisma = 8
    hero.fortitude_save = 4
    hero.reflex_save = 2
    hero.will_save = 0
    hero.hit_points = 30
    hero.inventory = [{"name": "Longsword", "quantity": 1}, {"name": "Potion of Healing", "quantity": 3}]
    hero.race = "Human"
    hero.alignment = "Lawful Good"
    hero.deity = "Sarenrae"
    hero.background = "TestHero grew up in a small village and has a troubled past."
    hero.goals = "To become a renowned hero and protect the innocent."
    hero.relationships = [{"name": "Alice", "relation": "Friend"}, {"name": "Bob", "relation": "Rival"}]
    
    # Add some conditions.
    hero.add_condition(conditions.BlindedCondition())
    hero.add_condition(conditions.FatiguedCondition())
    
    fighter = create_rpg_class("fighter")
    hero.level_up(fighter)
    
    # Generate and print the character sheet.
    sheet = create_character_sheet(hero, narrative="This is a test character sheet with DM notes and lore.")
    print(json.dumps(sheet, indent=4))
    
    # Save to file.
    save_character_sheet(hero, "test_character_sheet.json", narrative="Saved test character sheet.")
    
    # Load and print from file.
    loaded_sheet = load_character_sheet("test_character_sheet.json")
    print("Loaded Character Sheet:")
    print(json.dumps(loaded_sheet, indent=4))
