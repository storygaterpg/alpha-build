"""
feat_manager.py

This module manages feats for our Pathfinder simulation.
Feats are stored as JSON files (one per category) in the config/feat_config/ directory.
The module builds an index of available categories and supports lazy loading of feat definitions.
It also provides helper functions to retrieve feats and check prerequisites.
"""

import os
import json
from typing import Dict, Any, Optional, List
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
        self.prerequisites = prerequisites  # Example: {"Special": "Spell recall class feature", "Skill": {"Spellcraft": 5}}
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
    version = data.get("version")
    
    feats: Dict[str, Feat] = {}
    # Each key in the JSON (except "version") corresponds to a feat.
    for feat_name, feat_data in data.items():
        # Skip the version key if present.
        if feat_name.lower() == "version":
            continue
        feat = Feat.from_dict(feat_name, feat_data, category, version)
        feats[feat_name.lower()] = feat

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
    Currently supports:
      - "Special": a string that should be in character.special_features.
      - "Skill": a dictionary mapping skill names to required minimum values.
    Additional prerequisite types (ability scores, other feats, class levels) can be added.
    """
    prerequisites = feat.prerequisites
    # Check "Special" prerequisites.
    special_req = prerequisites.get("Special")
    if special_req:
        if not hasattr(character, "special_features") or special_req not in character.special_features:
            return False

    # Check "Skill" prerequisites.
    skill_reqs = prerequisites.get("Skill", {})
    for skill, required in skill_reqs.items():
        # Assume character has a method get_skill_value(skill) or use effective_skill_modifier.
        if hasattr(character, "get_skill_value"):
            current_value = character.get_skill_value(skill)
        else:
            current_value = character.get_effective_skill_modifier(skill)
        if current_value < required:
            return False

    return True

if __name__ == "__main__":
    # Example usage: Retrieve the feat "Disruptive Recall" from the "general_feats" category.
    feat = get_feat("Disruptive Recall", category="general_feats")
    if feat:
        print("Feat found:", feat.to_dict())
    else:
        print("Feat 'Disruptive Recall' not found in category 'general_feats'.")
