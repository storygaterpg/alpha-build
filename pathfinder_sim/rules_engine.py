"""
rules_engine.py
---------------
This module implements the core rules engine for our simulation.
It provides the Dice class for rolling dice with standard notation,
and resolvers for combat, spellcasting, skill checks, and now advanced maneuvers.
All resolvers return an ActionResult (defined in action_result.py) that includes detailed debug information,
enabling complete auditability and reproducibility of action outcomes.
"""

from typing import List, Dict, Any
import math
import json
import os
from skill_utils import get_skill_modifier
from action_result import ActionResult

class Dice:
    """
    A Dice class for rolling dice using standard notation (e.g., "1d20+5").
    Supports seeding for deterministic results.
    """
    def __init__(self, seed: int = None):
        import random
        self.rng = random.Random(seed)
    
    def roll(self, notation: str) -> int:
        """
        Roll dice based on the given notation.
        Example: "2d6+3" rolls two 6-sided dice and adds 3.
        Returns the total.
        """
        parts = notation.lower().split("d")
        num_dice = int(parts[0])
        remainder = parts[1]
        mod = 0
        if '+' in remainder:
            die, mod_str = remainder.split('+')
            mod = int(mod_str)
        elif '-' in remainder:
            die, mod_str = remainder.split('-')
            mod = -int(mod_str)
        else:
            die = remainder
        die = int(die)
        rolls = [self.rng.randint(1, die) for _ in range(num_dice)]
        total = sum(rolls) + mod
        # For debugging, we could log individual rolls if needed.
        return total

    def roll_d20(self) -> int:
        """Roll a 20-sided die."""
        return self.rng.randint(1, 20)

# --------------------------
# Bonus Configuration Handling
# --------------------------
_BONUS_CONFIG = None

def load_bonus_config() -> Dict[str, Any]:
    """
    Load bonus configuration from 'config/bonus_config.json'.
    Determines which bonus types stack.
    """
    global _BONUS_CONFIG
    if _BONUS_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "bonus_config.json")
        with open(config_path, "r") as f:
            _BONUS_CONFIG = json.load(f)
    return _BONUS_CONFIG

def stack_bonuses(bonus_list: List[tuple]) -> int:
    """
    Calculate the total bonus from a list of (value, type) tuples using stacking rules.
    """
    config = load_bonus_config()
    bonus_rules = config.get("bonus_types", {})
    stacking_total = 0
    non_stacking = {}
    for value, btype in bonus_list:
        btype_lower = btype.lower()
        rule = bonus_rules.get(btype_lower, {"stacks": False})
        if rule["stacks"]:
            stacking_total += value
        else:
            if btype_lower in non_stacking:
                if value >= 0 and non_stacking[btype_lower] < value:
                    non_stacking[btype_lower] = value
                elif value < 0 and non_stacking[btype_lower] > value:
                    non_stacking[btype_lower] = value
            else:
                non_stacking[btype_lower] = value
    return stacking_total + sum(non_stacking.values())

# --------------------------
# Weapons Configuration Loader
# --------------------------
_WEAPONS_CONFIG = None

def load_weapons_config() -> Dict[str, Any]:
    """
    Load the weapons configuration from 'config/weapons_config.json'.
    Contains damage dice, critical hit parameters, etc.
    """
    global _WEAPONS_CONFIG
    if _WEAPONS_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "weapons_config.json")
        with open(config_path, "r") as f:
            _WEAPONS_CONFIG = json.load(f)
    return _WEAPONS_CONFIG

def get_weapon_critical_parameters(weapon: Any) -> Dict[str, Any]:
    """
    Retrieve critical hit parameters for the given weapon from configuration.
    Returns default values if the weapon is not found.
    """
    if weapon is not None and hasattr(weapon, "name"):
        wname = weapon.name.lower()
        weapons_config = load_weapons_config()
        if wname in weapons_config:
            return weapons_config[wname].get("critical", {"threat_range": 19, "multiplier": 2})
    return {"threat_range": 19, "multiplier": 2}

# --------------------------
# Extended CombatResolver with Maneuver Debug Logging
# --------------------------
class CombatResolver:
    """
    Resolves combat (attack) actions and advanced combat maneuvers.
    Provides detailed debug information to ensure auditability.
    """
    def __init__(self, dice):
        self.dice = dice
        # Load maneuvers configuration.
        self._maneuvers_config = None

    def load_maneuvers_config(self) -> Dict[str, Any]:
        if self._maneuvers_config is None:
            config_path = os.path.join(os.path.dirname(__file__), "config", "maneuvers_config.json")
            with open(config_path, "r") as f:
                self._maneuvers_config = json.load(f)
        return self._maneuvers_config

    def compute_effective_defense(self, defender, is_touch_attack: bool, target_flat_footed: bool) -> int:
        """
        Compute the defender's effective defense based on whether the attack is touch or if the defender is flat-footed.
        """
        if is_touch_attack and target_flat_footed:
            return 10
        elif is_touch_attack:
            return defender.get_touch_ac()
        elif target_flat_footed:
            return defender.get_flatfooted_ac()
        else:
            return defender.get_ac()

    def apply_concealment(self, defender) -> bool:
        """
        Determine if the defender's concealment causes the attack to miss.
        """
        concealment = getattr(defender, "concealment", 0)
        if concealment > 0:
            roll = self.dice.rng.randint(1, 100)
            if roll <= concealment:
                return True
        return False

    def resolve_attack(self, attack_action) -> ActionResult:
        debug_info = {}
        natural_roll = self.dice.roll_d20()
        debug_info["natural_roll"] = natural_roll
        if attack_action.weapon is not None:
            if getattr(attack_action.weapon, "is_ranged", False):
                ability_mod = attack_action.actor.get_modifier("DEX")
            else:
                ability_mod = attack_action.actor.get_modifier("STR")
        else:
            ability_mod = attack_action.actor.get_modifier("DEX")
        debug_info["ability_mod"] = ability_mod
        bab = getattr(attack_action.actor, "BAB", 0)
        weapon_bonus = attack_action.weapon_bonus if attack_action.weapon is not None else 0
        check_penalty = attack_action.weapon.check_penalty if attack_action.weapon is not None else 0
        bonus_list = [
            (bab, "BAB"),
            (ability_mod, "ability"),
            (weapon_bonus, "weapon"),
            (-check_penalty, "penalty")
        ]
        effective_bonus = stack_bonuses(bonus_list)
        debug_info["effective_bonus"] = effective_bonus
        total_attack = natural_roll + effective_bonus
        debug_info["total_attack"] = total_attack

        effective_defense = self.compute_effective_defense(attack_action.defender,
                                                           attack_action.is_touch_attack,
                                                           attack_action.target_flat_footed)
        debug_info["effective_defense"] = effective_defense

        hit = (total_attack >= effective_defense) or (natural_roll == 20)
        result_data = {
            "attacker_name": attack_action.actor.name,
            "defender_name": attack_action.defender.name,
            "natural_roll": natural_roll,
            "effective_bonus": effective_bonus,
            "total_attack": total_attack,
            "effective_defense": effective_defense,
            "hit": hit,
            "critical": False,
            "concealment_applied": False
        }
        # Check concealment.
        if hit:
            if self.apply_concealment(attack_action.defender):
                result_data["hit"] = False
                result_data["concealment_applied"] = True
                result_data["justification"] = "Attack missed due to concealment."
                return ActionResult(
                    action="attack",
                    actor_name=attack_action.actor.name,
                    target_name=attack_action.defender.name,
                    result_data=result_data,
                    log="",
                    debug=debug_info
                )
        # Proceed with hit resolution.
        if hit:
            critical_confirmed = False
            if attack_action.weapon and not attack_action.is_touch_attack:
                crit_params = get_weapon_critical_parameters(attack_action.weapon)
                threat_range = crit_params.get("threat_range", 19)
                crit_multiplier = crit_params.get("multiplier", 2)
                if natural_roll >= threat_range:
                    confirm_roll = self.dice.roll_d20()
                    debug_info["critical_confirm_roll"] = confirm_roll
                    confirm_total = confirm_roll + effective_bonus
                    debug_info["confirm_total"] = confirm_total
                    if confirm_total >= effective_defense:
                        critical_confirmed = True
            result_data["critical"] = critical_confirmed
            if attack_action.weapon:
                base_damage = self.dice.roll(attack_action.weapon.damage_dice)
                debug_info["base_damage"] = base_damage
                if critical_confirmed:
                    total_damage = (base_damage * crit_multiplier) + ability_mod
                    result_data["critical_multiplier"] = crit_multiplier
                else:
                    total_damage = base_damage + ability_mod
            else:
                base_damage = self.dice.roll("1d8")
                debug_info["base_damage"] = base_damage
                if critical_confirmed:
                    total_damage = (base_damage * 2) + ability_mod
                    result_data["critical_multiplier"] = 2
                else:
                    total_damage = base_damage + ability_mod
            result_data["damage"] = total_damage
            result_data["justification"] = "Attack hit" + (" with a confirmed critical." if critical_confirmed else ".")
        else:
            result_data["damage"] = 0
            result_data["justification"] = "Attack missed; total attack did not meet effective defense."
        return ActionResult(
            action="attack",
            actor_name=attack_action.actor.name,
            target_name=attack_action.defender.name,
            result_data=result_data,
            log="",  # The log will be formatted by the logger module.
            debug=debug_info
        )

    def resolve_bull_rush(self, maneuver_action) -> ActionResult:
        """
        Resolve a bull rush maneuver.
        Compare attacker's CMB with defender's CMD using data from maneuvers_config.json.
        Record debug details for audit.
        """
        maneuvers_config = self.load_maneuvers_config()
        bull_rush_conf = maneuvers_config.get("bull_rush", {})
        # Basic calculation: effective CMB vs. defender's CMD.
        attacker_cmb = maneuver_action.actor.BAB + maneuver_action.actor.get_modifier("STR")
        defender_cmd = maneuver_action.defender.cmd
        debug_info = {
            "attacker_cmb": attacker_cmb,
            "defender_cmd": defender_cmd
        }
        success = attacker_cmb >= defender_cmd
        push_distance = bull_rush_conf.get("push_distance_default", 1) if success else 0
        justification = (f"Bull Rush: Attacker's CMB {attacker_cmb} vs Defender's CMD {defender_cmd}. "
                         f"Default push distance: {push_distance} square(s).")
        result_data = {
            "attacker_name": maneuver_action.actor.name,
            "defender_name": maneuver_action.defender.name,
            "attacker_cmb": attacker_cmb,
            "defender_cmd": defender_cmd,
            "success": success,
            "push_distance": push_distance,
            "justification": justification
        }
        debug_info["maneuver"] = "bull_rush"
        return ActionResult(
            action="maneuver",
            actor_name=maneuver_action.actor.name,
            target_name=maneuver_action.defender.name,
            result_data=result_data,
            log="",
            debug=debug_info
        )

    def resolve_grapple(self, maneuver_action) -> ActionResult:
        """
        Resolve a grapple maneuver.
        Compare attacker's CMB with defender's CMD.
        Record debug details for audit.
        """
        attacker_cmb = maneuver_action.actor.BAB + maneuver_action.actor.get_modifier("STR")
        defender_cmd = maneuver_action.defender.cmd
        debug_info = {
            "attacker_cmb": attacker_cmb,
            "defender_cmd": defender_cmd,
            "maneuver": "grapple"
        }
        success = attacker_cmb >= defender_cmd
        justification = f"Grapple: Attacker's CMB {attacker_cmb} vs Defender's CMD {defender_cmd}."
        result_data = {
            "attacker_name": maneuver_action.actor.name,
            "defender_name": maneuver_action.defender.name,
            "attacker_cmb": attacker_cmb,
            "defender_cmd": defender_cmd,
            "success": success,
            "justification": justification
        }
        return ActionResult(
            action="maneuver",
            actor_name=maneuver_action.actor.name,
            target_name=maneuver_action.defender.name,
            result_data=result_data,
            log="",
            debug=debug_info
        )

class SpellResolver:
    """
    Resolves spellcasting actions.
    Uses a simple damage roll to simulate a spell effect.
    Returns an ActionResult containing spell outcome data.
    """
    def __init__(self, dice):
        self.dice = dice

    def resolve_spell(self, spell_action) -> ActionResult:
        debug_info = {}
        damage = self.dice.roll("1d4") + 1
        debug_info["damage_roll"] = damage
        result_data = {
            "spell_name": spell_action.spell_name,
            "caster_name": spell_action.actor.name,
            "target_name": spell_action.target.name,
            "damage": damage,
            "justification": "Spell cast successfully."
        }
        return ActionResult(
            action="spell",
            actor_name=spell_action.actor.name,
            target_name=spell_action.target.name,
            result_data=result_data,
            log="",
            debug=debug_info
        )

class SkillResolver:
    """
    Resolves skill check actions using the character's effective modifiers.
    Returns an ActionResult containing the outcome of the skill check.
    """
    def __init__(self, dice):
        self.dice = dice

    def resolve_skill_check(self, skill_action) -> ActionResult:
        debug_info = {}
        roll = self.dice.roll_d20()
        # Use the new skill_utils function to get the effective modifier.
        debug_info["roll"] = roll
        modifier = get_skill_modifier(skill_action.actor, skill_action.skill_name)
        debug_info["modifier"] = modifier
        total = roll + modifier
        debug_info["total"] = total
        result_data = {
            "character_name": skill_action.actor.name,
            "skill_name": skill_action.skill_name,
            "roll": roll,
            "total": total,
            "dc": skill_action.dc,
            "justification": f"Skill check: base modifier {modifier} (roll {roll} + modifier = {total})."
        }
        return ActionResult(
            action="skill_check",
            actor_name=skill_action.actor.name,
            result_data=result_data,
            log="",
            debug=debug_info
        )

class RulesEngine:
    """
    Integrates the combat, spell, and skill resolvers into a unified engine.
    """
    def __init__(self, dice):
        self.dice = dice
        self.combat_resolver = CombatResolver(dice)
        self.spell_resolver = SpellResolver(dice)
        self.skill_resolver = SkillResolver(dice)

    def process_turn(self, actions: List[Any]) -> List[Dict[str, Any]]:
        results = []
        for action in actions:
            # Each action returns an ActionResult; we convert it to a dict.
            results.append(action.execute().to_dict())
        return results

rules_engine = None
