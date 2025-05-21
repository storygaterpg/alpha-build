"""
feat_manager.py

This module manages feats for our Pathfinder simulation.
Feats are stored as JSON files (one per category) in the config/feat_config/ directory.
The module builds an index of available categories and supports lazy loading of feat definitions.
It also provides helper functions to retrieve feats and check prerequisites,
including support for various prerequisite types such as Skill, Stat, BAB, Level, Caster Level, Feat, Race, Alignment, and Class.
"""

import os
import json
from typing import Dict, Any, Optional, List, Union
import glob

# Global cache for feats: maps category (lowercase) to a dictionary mapping feat names to Feat objects.
_FEATS_CACHE: Dict[str, Dict[str, "Feat"]] = {}

# Global index: maps category (lowercase) to its file path.
_CATEGORY_INDEX: Dict[str, str] = {}

def build_category_index(feats_folder: str = "config/feat_config") -> None:
    """
    Build an index mapping each feat category (derived from file name) to its file path.
    For file names that end with '_feats.json', an alias (with '_feats' removed) is also added.
    """
    global _CATEGORY_INDEX
    _CATEGORY_INDEX = {}
    
    # Compute the absolute path to the feat configuration folder.
    base_dir = os.path.dirname(os.path.abspath(__file__))
    folder_path = os.path.join(base_dir, feats_folder)
    print(f"Looking for feat files in: {folder_path}")
    
    if not os.path.isdir(folder_path):
        print("Folder not found!")
        return
    else:
        files = os.listdir(folder_path)
        print(f"Found files: {files}")
    
    pattern = os.path.join(folder_path, "*.json")
    for filepath in glob.glob(pattern):
        base_name = os.path.splitext(os.path.basename(filepath))[0].lower()
        _CATEGORY_INDEX[base_name] = filepath
        # Also add an alias if the filename ends with '_feats'
        if base_name.endswith("_feats"):
            alias = base_name.replace("_feats", "")
            if alias not in _CATEGORY_INDEX:
                _CATEGORY_INDEX[alias] = filepath

    print(f"Category index: {_CATEGORY_INDEX}")

# Build the category index on module import.
build_category_index()

class Feat:
    """
    Represents a feat with its properties.
    """
    def __init__(self, name: str, prerequisites: Dict[str, Any], benefit: str, category: str, version: Optional[str] = None):
        self.name = name
        self.prerequisites = prerequisites  # e.g., {"Special": "Hex class feature", "Skill": {"Spellcraft": 5}, "Stat": {"CON": 13}}
        self.benefit = benefit
        self.category = category
        self.version = version

    @classmethod
    def from_dict(cls, name: str, data: Dict[str, Any], category: str, version: Optional[str] = None) -> "Feat":
        prerequisites = data.get("prerequisites", {})
        benefit = data.get("benefit", "")
        return cls(name=name, prerequisites=prerequisites, benefit=benefit, category=category, version=version)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "prerequisites": self.prerequisites,
            "benefit": self.benefit,
            "category": self.category,
            "version": self.version
        }
    
    # Optional stub for applying passive effects.
    def apply_effects(self, character) -> None:
        """
        Apply the passive effects of the feat to the given character.
        By default, this does nothing.
        Override this method in subclasses or extend this function to support
        active/passive effect integration.
        """
        pass

def load_feats_for_category(category: str) -> Dict[str, Feat]:
    """
    Load all feats for a given category from its JSON file and cache them.
    If the category is not found, log a warning and return an empty dictionary.
    """
    global _FEATS_CACHE
    category = category.lower()
    if category in _FEATS_CACHE:
        return _FEATS_CACHE[category]
    
    # Check if we have the file in our index.
    if category not in _CATEGORY_INDEX:
        print(f"Warning: Category '{category}' not found in feat configuration.")
        _FEATS_CACHE[category] = {}
        return _FEATS_CACHE[category]
    
    filepath = _CATEGORY_INDEX[category]
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading feats from {filepath}: {e}")
        _FEATS_CACHE[category] = {}
        return _FEATS_CACHE[category]
    
    # Optionally, if the file includes a version, extract it.
    version = data.get("version") if isinstance(data, dict) else None
    
    feats: Dict[str, Feat] = {}
    if isinstance(data, dict):
        # Each key in the JSON (except "version") corresponds to a feat.
        for feat_name, feat_data in data.items():
            if feat_name.lower() == "version":
                continue
            feat = Feat.from_dict(feat_name, feat_data, category, version)
            feats[feat_name.lower()] = feat
    elif isinstance(data, list):
        # If data is a list, each element is a feat definition.
        for feat_obj in data:
            # Assume the feat name is provided under a key "Feat" (adjust if your JSON uses a different key).
            feat_name = feat_obj.get("Feat")
            if not feat_name:
                print("Warning: A feat entry in the list is missing a 'Feat' key.")
                continue
            feat = Feat.from_dict(feat_name, feat_obj, category, version)
            feats[feat_name.lower()] = feat
    else:
        print(f"Unexpected data format in {filepath}.")
    
    _FEATS_CACHE[category] = feats
    return feats

def get_feat(feat_name: str, category: Optional[str] = None) -> Optional[Feat]:
    """
    Retrieve a Feat object by name.
    If category is specified, only search within that category.
    Otherwise, search through all categories.
    Feat names are matched case-insensitively.
    """
    feat_name = feat_name.lower()
    if category:
        feats = load_feats_for_category(category)
        return feats.get(feat_name)
    else:
        # Search through all categories.
        for cat in _CATEGORY_INDEX.keys():
            feats = load_feats_for_category(cat)
            if feat_name in feats:
                return feats[feat_name]
    return None

def get_all_feats(category: Optional[str] = None) -> List[Feat]:
    """
    Return a list of all Feat objects.
    If a category is specified, return feats only in that category.
    """
    feats_list: List[Feat] = []
    if category:
        feats = load_feats_for_category(category)
        feats_list = list(feats.values())
    else:
        for cat in _CATEGORY_INDEX.keys():
            feats = load_feats_for_category(cat)
            feats_list.extend(feats.values())
    return feats_list

def check_prerequisites(character, feat: Feat) -> bool:
    """
    Check if the given character meets the prerequisites for the feat.
    Supports multiple prerequisite types:
      - "Special": Checks for required special features.
      - "Skill": Checks required skill values using effective skill modifiers.
      - "Stat": Checks that an ability score meets a minimum value.
      - "BAB": Checks if the character’s Base Attack Bonus meets the requirement.
      - "Level": Checks total character level.
      - "Caster Level": Checks caster level (or approximates from spellcasting class levels).
      - "Feat": Checks that the character already has a required feat (or feats).
      - "Race": Checks that the character’s race matches.
      - "Alignment": Checks that the character’s alignment matches.
      - "Class": Checks that the character has a minimum level in a specified class.
      - "Alternative": Supports an alternative prerequisite clause where at least one alternative set is satisfied.
    
    Returns True if all specified prerequisites are met; otherwise, returns False.
    """
    prerequisites = feat.prerequisites

    # Define helper functions for each prerequisite type.

    def check_special(req: Union[str, List[str]]) -> bool:
        # req may be a string or a list of strings.
        if isinstance(req, str):
            return hasattr(character, "special_features") and req in character.special_features
        elif isinstance(req, list):
            return all(check_special(item) for item in req)
        return False

    def check_skill(req: Dict[str, int]) -> bool:
        # req is a dict mapping skill names to required values.
        for skill, required in req.items():
            if hasattr(character, "get_skill_value"):
                current = character.get_skill_value(skill)
            else:
                current = character.get_effective_skill_modifier(skill)
            if current < required:
                return False
        return True

    def check_stat(req: Dict[str, int]) -> bool:
        # Map common ability abbreviations to attribute names.
        ability_mapping = {
            "STR": "strength",
            "DEX": "dexterity",
            "CON": "constitution",
            "INT": "intelligence",
            "WIS": "wisdom",
            "CHA": "charisma"
        }
        for stat, minimum in req.items():
            stat_upper = stat.upper()
            attr_name = ability_mapping.get(stat_upper, stat.lower())
            value = getattr(character, attr_name, None)
            if value is None or value < minimum:
                return False
        return True

    def check_bab(required: int) -> bool:
        return getattr(character, "BAB", 0) >= required

    def check_level(required: int) -> bool:
        # Total character level is the sum of levels in all classes.
        total_level = sum(character.class_levels.values())
        return total_level >= required

    def check_caster_level(required: int) -> bool:
        # If the character has a 'caster_level' attribute, use it; otherwise, approximate from spellcasting classes.
        if hasattr(character, "caster_level"):
            return character.caster_level >= required
        # Approximate: use the highest level among common spellcasting classes.
        spellcasting_classes = ["wizard", "sorcerer", "cleric", "druid", "bard"]
        levels = [lvl for cls, lvl in character.class_levels.items() if cls.lower() in spellcasting_classes]
        if levels:
            return max(levels) >= required
        return False

    def check_feat(req: Union[str, List[str]]) -> bool:
        # req may be a string or a list of feat names.
        if isinstance(req, str):
            return req in character.feats
        elif isinstance(req, list):
            return all(feat_name in character.feats for feat_name in req)
        return False

    def check_race(req: Union[str, List[str]]) -> bool:
        if isinstance(req, str):
            return character.race.lower() == req.lower()
        elif isinstance(req, list):
            return character.race.lower() in [r.lower() for r in req]
        return False

    def check_alignment(req: Union[str, List[str]]) -> bool:
        if isinstance(req, str):
            return character.alignment.lower() == req.lower()
        elif isinstance(req, list):
            return character.alignment.lower() in [a.lower() for a in req]
        return False

    def check_class(req: Dict[str, int]) -> bool:
        # req is a dict mapping class names to minimum levels.
        for cls, minimum in req.items():
            if character.class_levels.get(cls.lower(), 0) < minimum:
                return False
        return True

    # Mapping of prerequisite keys to their corresponding check functions.
    prerequisite_checks = {
        "Special": check_special,
        "Skill": check_skill,
        "Stat": check_stat,
        "BAB": check_bab,
        "Level": check_level,
        "Caster Level": check_caster_level,
        "Feat": check_feat,
        "Race": check_race,
        "Alignment": check_alignment,
        "Class": check_class,
    }

    # First, handle the "Alternative" key if present.
    if "Alternative" in prerequisites:
        alternatives = prerequisites["Alternative"]
        # alternatives should be a list of alternative prerequisite sets.
        alternative_passed = False
        if isinstance(alternatives, list):
            for alt_req in alternatives:
                # For each alternative set, all keys in that set must be satisfied.
                if all(prerequisite_checks.get(key, lambda x: True)(alt_req.get(key)) for key in alt_req):
                    alternative_passed = True
                    break
        elif isinstance(alternatives, dict):
            # Single alternative set.
            alternative_passed = all(prerequisite_checks.get(key, lambda x: True)(alternatives.get(key)) for key in alternatives)
        if not alternative_passed:
            return False

    # Now, check all other prerequisites.
    for key, req in prerequisites.items():
        if key == "Alternative":
            continue
        check_func = prerequisite_checks.get(key)
        if check_func and not check_func(req):
            return False
    return True

if __name__ == "__main__":
    # Example usage: Retrieve the feat "Disruptive Recall" from the "general_feats" category.
    feat = get_feat("Disruptive Recall", category="general_feats")
    if feat:
        print("Feat found:", feat.to_dict())
    else:
        print("Feat 'Disruptive Recall' not found in category 'general_feats'.")
