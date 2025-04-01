"""
character.py
------------

This module defines the Character class for our Pathfinder simulation.
It manages attributes such as position, abilities, combat statistics, conditions, resources,
and narrative elements. This version includes methods to serialize to and reconstruct from a dictionary.
Enhanced for CD-01 and CD-02: now includes dynamic calculation of saving throws, CMB/CMD, HP,
spell slots, and racial modifier application.
Enhanced for CD-03: Implements resource management with caching, resource consumption,
and full restoration on a long rest.
"""

from typing import List, Dict, Any
import json
import os
import conditions
from rpg_class import RPGClass  # For type annotations

# Global cache for resource configuration to avoid repeated disk I/O.
_RESOURCE_CONFIG_CACHE = None

class Character:
    """
    A simplified character class.
    
    Attributes:
      - name: Character's name.
      - position: Grid coordinates (x, y).
      - dexterity: Used to compute ability modifiers.
      - Other ability scores: strength, constitution, intelligence, wisdom, charisma.
      - Defensive stats: armor_bonus, shield_bonus, natural_armor, deflection_bonus, dodge_bonus, size_modifier.
      - BAB: Base Attack Bonus (calculated from multiclass levels).
      - cmb: Combat Maneuver Bonus.
      - cmd: Combat Maneuver Defense.
      - spells: List of known spells.
      - spell_slots: Dictionary for spell slot data.
      - conditions: List of active conditions.
      - resources: Dictionary tracking limited-use resources.
      - reach: The number of squares this character threatens.
      - class_levels: Dictionary mapping RPG class names to levels (for multiclassing).
      - Saves: fortitude_save, reflex_save, will_save.
      - hit_points: Current hit points.
      - experience: Experience points.
      - Identity and narrative fields: race, alignment, deity, feats, inventory, background, goals, relationships.
    """
    def __init__(self, name: str, x: int, y: int, dexterity: int, reach: int = 1):
        self.name = name
        self.position = (x, y)
        self.climb_state = None  # Track vertical movement progress (e.g., when climbing a ladder)
        self.dexterity = dexterity

        # Defensive stats.
        self.armor_bonus = 0
        self.shield_bonus = 0
        self.natural_armor = 0
        self.deflection_bonus = 0
        self.dodge_bonus = 0
        self.size_modifier = 0

        # Base Attack Bonus (derived from class levels).
        self.BAB = 0

        # Combat Maneuver Bonus and Defense.
        self.cmb = 0
        self.cmd = 10  # Base value before adding modifiers

        self.spells: List[str] = []
        self.spell_slots: Dict[str, Any] = {}  # Spell slot data per class/day

        self.conditions: List[conditions.Condition] = []
        self.resources: Dict[str, Any] = self.load_resources()
        self.reach = reach

        # Multiclass: mapping of RPG class names to levels.
        self.class_levels: Dict[str, int] = {}

        # Ability scores (default 10 if not provided)
        self.strength = 10
        self.constitution = 10
        self.intelligence = 10
        self.wisdom = 10
        self.charisma = 10

        # Saves and combat details.
        self.fortitude_save = 0
        self.reflex_save = 0
        self.will_save = 0
        self.hit_points = 0
        self.experience = 0

        # Identity and narrative.
        self.race = "Unknown"  # This is a string; use initialize_race() to apply a Race object.
        self.alignment = "Neutral"
        self.deity = "None"
        self.feats: List[str] = []
        self.inventory: List[Dict[str, Any]] = []
        self.background = ""
        self.goals = ""
        self.relationships: List[Dict[str, str]] = []

    def get_modifier(self, ability: str) -> int:
        """Return the ability modifier for a given ability score (e.g., DEX, STR)."""
        ability = ability.upper()
        if ability == "DEX":
            return (self.dexterity - 10) // 2
        if ability == "STR":
            return (self.strength - 10) // 2
        if ability == "CON":
            return (self.constitution - 10) // 2
        if ability == "INT":
            return (self.intelligence - 10) // 2
        if ability == "WIS":
            return (self.wisdom - 10) // 2
        if ability == "CHA":
            return (self.charisma - 10) // 2
        return 0

    def has_condition(self, condition_names: list) -> bool:
        """Return True if the character has any condition in the given list (case-insensitive)."""
        return any(cond.name.lower() in [name.lower() for name in condition_names] for cond in self.conditions)

    def add_condition(self, condition: conditions.Condition) -> None:
        """Add a condition to the character."""
        self.conditions.append(condition)
        print(f"{self.name} gains condition: {condition.name} (Duration: {condition.duration} rounds)")

    def remove_condition(self, condition: conditions.Condition) -> None:
        """Remove a specific condition from the character if present."""
        if condition in self.conditions:
            self.conditions.remove(condition)
            print(f"{self.name} loses condition: {condition.name}")

    def update_conditions(self) -> None:
        """Tick down all conditions; remove expired conditions."""
        for condition in self.conditions[:]:
            condition.tick()
            if condition.is_expired():
                self.conditions.remove(condition)
                print(f"{self.name} loses condition: {condition.name}")

    def load_resources(self) -> Dict[str, Any]:
        """Load resource configuration from file with caching."""
        global _RESOURCE_CONFIG_CACHE
        if _RESOURCE_CONFIG_CACHE is None:
            config_path = os.path.join(os.path.dirname(__file__), "config", "resource_config.json")
            with open(config_path, "r") as f:
                _RESOURCE_CONFIG_CACHE = json.load(f)
        resources = {}
        # Initialize each resource to its default maximum.
        for key, data in _RESOURCE_CONFIG_CACHE.items():
            resources[key] = data.get("default_max", 0)
        return resources

    def update_resources(self) -> None:
        """
        Regenerate resources based on configuration.
        For each resource, increase by the regen_rate without exceeding the default maximum.
        """
        global _RESOURCE_CONFIG_CACHE
        if _RESOURCE_CONFIG_CACHE is None:
            self.load_resources()
        for key, data in _RESOURCE_CONFIG_CACHE.items():
            regen_rate = data.get("regen_rate", 0)
            max_value = data.get("default_max", 0)
            self.resources[key] = min(self.resources.get(key, 0) + regen_rate, max_value)

    def long_rest(self) -> None:
        """
        Perform a long rest to fully restore resources that reset "per long rest" or "per day".
        This method resets the value of each applicable resource to its default maximum.
        """
        global _RESOURCE_CONFIG_CACHE
        if _RESOURCE_CONFIG_CACHE is None:
            self.load_resources()
        for key, data in _RESOURCE_CONFIG_CACHE.items():
            reset_period = data.get("reset_period", "")
            if reset_period in ["per long rest", "per day"]:
                self.resources[key] = data.get("default_max", self.resources.get(key, 0))

    def can_spend_resource(self, resource_name: str, amount: int = 1) -> bool:
        """
        Check if the character has at least 'amount' of the specified resource.
        """
        return self.resources.get(resource_name, 0) >= amount

    def spend_resource(self, resource_name: str, amount: int = 1) -> bool:
        """
        Deduct the specified amount of the given resource if available.
        Returns True if the resource was successfully spent, otherwise False.
        """
        if self.can_spend_resource(resource_name, amount):
            self.resources[resource_name] -= amount
            return True
        else:
            return False

    def update_state(self) -> None:
        """Update character state by ticking conditions and regenerating resources."""
        self.update_conditions()
        self.update_resources()

    def get_condition_status(self) -> List[Dict[str, Any]]:
        """Return a summary of all active conditions."""
        return [cond.get_status() for cond in self.conditions]
    
    def level_up(self, rpg_class: RPGClass) -> None:
        """
        Increase the character's level in the given RPG class.
        Supports multiclassing: if the character already has levels in that class, increment the level;
        otherwise, initialize it to 1. After leveling up, recalculate derived statistics.
        """
        class_name = rpg_class.name.strip().lower()
        if class_name in self.class_levels:
            self.class_levels[class_name] += 1
        else:
            self.class_levels[class_name] = 1
        # Recalculate derived stats using progression data.
        self.recalc_stats()
        print(f"{self.name} levels up as {rpg_class.name} to level {self.class_levels[class_name]}.")

    def recalc_stats(self) -> None:
        """
        Recalculate derived attributes based on multiclass levels using the progression data.
        Updates:
          - BAB: Base Attack Bonus.
          - Saves: Fortitude, Reflex, Will (base save from classes plus ability modifiers).
          - CMB and CMD: Calculated from BAB and ability modifiers.
          - Optionally, compute hit points.
        """
        total_bab = 0
        base_fort = 0
        base_ref = 0
        base_will = 0
        from rpg_class import load_rpg_class_progression
        all_progressions = load_rpg_class_progression()
        # Iterate over each class that the character has levels in.
        for class_name, level in self.class_levels.items():
            key = class_name.strip().lower()
            class_progression = all_progressions.get(key)
            if not class_progression:
                raise ValueError(f"No progression data found for class '{class_name}'.")
            level_data = class_progression.get(str(level))
            if not level_data:
                raise ValueError(f"No progression data for {class_name} at level {level}.")
            bab_list = level_data.get("BAB")
            if bab_list and isinstance(bab_list, list) and len(bab_list) > 0:
                total_bab += bab_list[0]
            else:
                total_bab += level
            # Accumulate base saves from progression data.
            base_fort += level_data.get("Fort", 0)
            base_ref += level_data.get("Ref", 0)
            base_will += level_data.get("Will", 0)
        self.BAB = total_bab
        self.fortitude_save = base_fort + self.get_modifier("CON")
        self.reflex_save = base_ref + self.get_modifier("DEX")
        self.will_save = base_will + self.get_modifier("WIS")
        self.compute_cmb_cmd()
        self.compute_hp()

    def compute_cmb_cmd(self) -> None:
        """
        Compute the Combat Maneuver Bonus (CMB) and Combat Maneuver Defense (CMD).
        CMB = BAB + Strength modifier
        CMD = 10 + BAB + Strength modifier + Dexterity modifier + size modifier
        """
        self.cmb = self.BAB + self.get_modifier("STR")
        self.cmd = 10 + self.BAB + self.get_modifier("STR") + self.get_modifier("DEX") + self.size_modifier

    def compute_hp(self) -> None:
        """
        Compute hit points based on class hit dice and Constitution modifier.
        For each class level, add the average of the hit die (rounded down) plus CON modifier.
        """
        total_hp = 0
        from rpg_class import load_rpg_classes_config
        classes_config = load_rpg_classes_config()
        # For each class, get the hit die value and compute HP contribution.
        for class_name, level in self.class_levels.items():
            key = class_name.strip().lower()
            base_data = classes_config.get(key, {})
            hit_die = base_data.get("hit_die", 8)
            # Average hit points per level: (hit_die // 2) + 1
            avg_hp = (hit_die // 2) + 1
            total_hp += level * (avg_hp + self.get_modifier("CON"))
        if self.hit_points == 0:
            self.hit_points = total_hp

    def apply_racial_modifiers(self, race_obj: Any) -> None:
        """
        Apply racial ability modifiers from a Race object to this character's ability scores.
        Then, recalculate derived stats.
        """
        modifiers = getattr(race_obj, "ability_modifiers", {})
        for ability, mod in modifiers.items():
            ability_upper = ability.upper()
            if ability_upper == "STR":
                self.strength += mod
            elif ability_upper == "DEX":
                self.dexterity += mod
            elif ability_upper == "CON":
                self.constitution += mod
            elif ability_upper == "INT":
                self.intelligence += mod
            elif ability_upper == "WIS":
                self.wisdom += mod
            elif ability_upper == "CHA":
                self.charisma += mod
        # Update derived stats after applying racial modifiers.
        self.recalc_stats()

    def initialize_race(self, race_obj: Any) -> None:
        """
        Initialize the character's race by setting the race name and applying racial modifiers.
        """
        self.race = race_obj.name
        self.apply_racial_modifiers(race_obj)

    def get_ac(self) -> int:
        """
        Compute the character's Armor Class (AC).
        Base AC = 10 + armor_bonus + shield_bonus + natural_armor + deflection_bonus + size_modifier.
        Adds Dexterity mod and dodge_bonus if not affected by conditions.
        Additional modifiers from active conditions are added.
        """
        base_ac = 10 + self.armor_bonus + self.shield_bonus + self.natural_armor + self.deflection_bonus + self.size_modifier
        if not self.has_condition(["blinded", "flatfooted", "paralyzed", "unconscious"]):
            base_ac += self.get_modifier("DEX") + self.dodge_bonus
        for cond in self.conditions:
            base_ac += cond.get_modifiers(self).get("ac", 0)
        return base_ac

    def get_flatfooted_ac(self) -> int:
        base_ac = 10 + self.armor_bonus + self.shield_bonus + self.natural_armor + self.deflection_bonus + self.size_modifier
        for cond in self.conditions:
            base_ac += cond.get_modifiers(self).get("ac", 0)
        return base_ac

    def get_touch_ac(self) -> int:
        base_ac = 10 + self.size_modifier
        if not self.has_condition(["blinded", "flatfooted", "paralyzed", "unconscious"]):
            base_ac += self.get_modifier("DEX") + self.dodge_bonus
        for cond in self.conditions:
            base_ac += cond.get_modifiers(self).get("ac", 0)
        return base_ac

    def get_threatened_squares(self) -> set:
        threatened = set()
        x, y = self.position
        for dx in range(-self.reach, self.reach + 1):
            for dy in range(-self.reach, self.reach + 1):
                if dx == 0 and dy == 0:
                    continue
                threatened.add((x + dx, y + dy))
        return threatened

    def get_effective_skill_modifier(self, ability: str) -> int:
        """
        Returns the effective modifier for a given ability for skill checks,
        factoring in the base ability modifier and cumulative penalties from conditions.
        """
        base = self.get_modifier(ability)
        penalty = 0
        for cond in self.conditions:
            if ability.upper() in [stat.upper() for stat in getattr(cond, "affected_stats", [])]:
                penalty += cond.skill_penalty
        return base + penalty

    def to_dict(self) -> dict:
        """
        Serialize the Character object into a dictionary.
        Includes derived stats: cmb, cmd, and spell_slots.
        """
        return {
            "name": self.name,
            "position": self.position,
            "dexterity": self.dexterity,
            "strength": self.strength,
            "constitution": self.constitution,
            "intelligence": self.intelligence,
            "wisdom": self.wisdom,
            "charisma": self.charisma,
            "armor_bonus": self.armor_bonus,
            "shield_bonus": self.shield_bonus,
            "natural_armor": self.natural_armor,
            "deflection_bonus": self.deflection_bonus,
            "dodge_bonus": self.dodge_bonus,
            "size_modifier": self.size_modifier,
            "BAB": self.BAB,
            "cmb": self.cmb,
            "cmd": self.cmd,
            "spells": self.spells,
            "spell_slots": self.spell_slots,
            "conditions": [cond.get_status() for cond in self.conditions],
            "resources": self.resources,
            "reach": self.reach,
            "class_levels": self.class_levels,
            "fortitude_save": self.fortitude_save,
            "reflex_save": self.reflex_save,
            "will_save": self.will_save,
            "hit_points": self.hit_points,
            "experience": self.experience,
            "race": self.race,
            "alignment": self.alignment,
            "deity": self.deity,
            "feats": self.feats,
            "inventory": self.inventory,
            "background": self.background,
            "goals": self.goals,
            "relationships": self.relationships
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Character":
        """
        Reconstruct a Character object from a dictionary.
        """
        char = cls(
            name=data.get("name", "Unnamed"),
            x=data.get("position", [0, 0])[0],
            y=data.get("position", [0, 0])[1],
            dexterity=data.get("dexterity", 10)
        )
        char.strength = data.get("strength", 10)
        char.constitution = data.get("constitution", 10)
        char.intelligence = data.get("intelligence", 10)
        char.wisdom = data.get("wisdom", 10)
        char.charisma = data.get("charisma", 10)
        char.armor_bonus = data.get("armor_bonus", 0)
        char.shield_bonus = data.get("shield_bonus", 0)
        char.natural_armor = data.get("natural_armor", 0)
        char.deflection_bonus = data.get("deflection_bonus", 0)
        char.dodge_bonus = data.get("dodge_bonus", 0)
        char.size_modifier = data.get("size_modifier", 0)
        char.BAB = data.get("BAB", 0)
        char.cmb = data.get("cmb", 0)
        char.cmd = data.get("cmd", 10)
        char.spells = data.get("spells", [])
        char.spell_slots = data.get("spell_slots", {})
        from conditions import condition_from_status_list
        char.conditions = condition_from_status_list(data.get("conditions", []))
        char.resources = data.get("resources", {})
        char.reach = data.get("reach", 1)
        char.class_levels = data.get("class_levels", {})
        char.fortitude_save = data.get("fortitude_save", 0)
        char.reflex_save = data.get("reflex_save", 0)
        char.will_save = data.get("will_save", 0)
        char.hit_points = data.get("hit_points", 0)
        char.experience = data.get("experience", 0)
        char.race = data.get("race", "Unknown")
        char.alignment = data.get("alignment", "Neutral")
        char.deity = data.get("deity", "None")
        char.feats = data.get("feats", [])
        char.inventory = data.get("inventory", [])
        char.background = data.get("background", "")
        char.goals = data.get("goals", "")
        char.relationships = data.get("relationships", [])
        return char

    def __str__(self) -> str:
        class_info = ", ".join([f"{name.title()} (lvl {lvl})" for name, lvl in self.class_levels.items()])
        class_str = f", RPG Classes: {class_info}" if class_info else ""
        return (f"Character: {self.name}{class_str}, Position: {self.position}, AC: {self.get_ac()}, "
                f"Flat-footed AC: {self.get_flatfooted_ac()}, Touch AC: {self.get_touch_ac()}, "
                f"CMB: {self.cmb}, CMD: {self.cmd}, "
                f"Conditions: {self.get_condition_status()}, Resources: {self.resources}, Reach: {self.reach}")
