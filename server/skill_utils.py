# skill_utils.py
import json
import os
import re
from typing import Dict, Any

# Global cache for skills configuration.
_SKILLS_CONFIG = None

def load_skills_config() -> Dict[str, Any]:
    global _SKILLS_CONFIG
    if _SKILLS_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "skills_config.json")
        with open(config_path, "r") as f:
            _SKILLS_CONFIG = json.load(f)
    return _SKILLS_CONFIG

def parse_modifier(mod_str: str) -> int:
    """
    Parse a modifier string (e.g., "+2", "-10", "+5 bonus", etc.) to an integer.
    """
    match = re.search(r"([-+]?\d+)", mod_str)
    if match:
        return int(match.group(1))
    return 0

def get_skill_info(skill_name: str) -> Dict[str, Any]:
    """
    Retrieve the skill information from the skills configuration.
    Skill names are case-insensitive.
    """
    skills = load_skills_config()
    for key, value in skills.items():
        if key.lower() == skill_name.lower():
            return value
    raise ValueError(f"Skill '{skill_name}' is not defined in the skills configuration.")

def get_skill_modifier(character, skill_name: str) -> int:
    """
    Computes the effective modifier for a skill for a given character.
    It uses the base ability modifier from the character (based on the skill's associated stat)
    and then adds any modifiers if the character is affected by conditions that impact that skill.
    The skill's configuration defines condition modifiers in the "conditions_modifiers" field.
    """
    skill_info = get_skill_info(skill_name)
    base_stat = skill_info.get("stat")
    base_mod = character.get_modifier(base_stat)
    
    total_modifier = base_mod
    conditions_modifiers = skill_info.get("conditions_modifiers", [])
    for cm in conditions_modifiers:
        condition_name = cm.get("condition").lower()
        mod_value = parse_modifier(cm.get("modifier"))
        # If the character has this condition (by matching the condition name, case-insensitive), apply its modifier.
        if character.has_condition([condition_name]):
            total_modifier += mod_value
    return total_modifier
