"""
rules_engine.py
---------------

This module implements the core rules engine for our simulation.
It includes:
  - Dice: A class for dice rolls with standard dice notation.
  - CombatResolver, SpellResolver, SkillResolver: Simplified resolvers.
  - RulesEngine: Integrates these resolvers.
"""

from typing import List, Dict, Any
import math

class Dice:
    def __init__(self, seed: int = None):
        import random
        self.rng = random.Random(seed)
    
    def roll(self, notation: str) -> int:
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
        total = sum(self.rng.randint(1, die) for _ in range(num_dice))
        return total + mod
    
    def roll_d20(self) -> int:
        return self.rng.randint(1, 20)

class CombatResolver:
    def __init__(self, dice):
        self.dice = dice

    def compute_effective_defense(self, defender, is_touch_attack: bool, target_flat_footed: bool) -> int:
        if is_touch_attack and target_flat_footed:
            return 10
        elif is_touch_attack:
            return defender.get_touch_ac()
        elif target_flat_footed:
            return defender.get_flatfooted_ac()
        else:
            return defender.get_ac()

    def apply_concealment(self, defender) -> bool:
        concealment = getattr(defender, "concealment", 0)
        if concealment > 0:
            roll = self.dice.rng.randint(1, 100)
            if roll <= concealment:
                return True
        return False

    def resolve_attack(self, attack_action) -> Dict[str, Any]:
        natural_roll = self.dice.roll_d20()
        if attack_action.weapon is not None:
            if getattr(attack_action.weapon, "is_ranged", False):
                ability_mod = attack_action.actor.get_modifier("DEX")
            else:
                ability_mod = attack_action.actor.get_modifier("STR")
        else:
            ability_mod = attack_action.actor.get_modifier("DEX")
        bab = getattr(attack_action.actor, "BAB", 0)
        weapon_bonus = attack_action.weapon_bonus if attack_action.weapon is not None else 0
        check_penalty = attack_action.weapon.check_penalty if attack_action.weapon is not None else 0
        total_attack = natural_roll + bab + ability_mod + weapon_bonus - check_penalty
        effective_defense = self.compute_effective_defense(attack_action.defender,
                                                           attack_action.is_touch_attack,
                                                           attack_action.target_flat_footed)
        hit = (total_attack >= effective_defense) or (natural_roll == 20)
        result = {
            "action": "attack",
            "attacker_name": attack_action.actor.name,
            "defender_name": attack_action.defender.name,
            "natural_roll": natural_roll,
            "BAB": bab,
            "ability_mod": ability_mod,
            "weapon_bonus": weapon_bonus,
            "check_penalty": check_penalty,
            "total_attack": total_attack,
            "effective_defense": effective_defense,
            "hit": hit,
            "critical": False,
            "concealment_applied": False
        }
        if hit:
            if self.apply_concealment(attack_action.defender):
                result["hit"] = False
                result["concealment_applied"] = True
                result["justification"] = "Attack missed due to concealment."
                return result
        if hit:
            critical_confirmed = False
            if attack_action.weapon and not attack_action.is_touch_attack:
                threat_range = attack_action.weapon.threat_range
                if natural_roll >= threat_range:
                    confirm_roll = self.dice.roll_d20()
                    confirm_total = confirm_roll + bab + ability_mod + weapon_bonus - check_penalty
                    if confirm_total >= effective_defense:
                        critical_confirmed = True
                    result["critical_confirm_roll"] = confirm_roll
                    result["confirm_total"] = confirm_total
            result["critical"] = critical_confirmed
            if attack_action.weapon:
                base_damage = self.dice.roll(attack_action.weapon.damage_dice)
                if critical_confirmed:
                    total_damage = (base_damage * attack_action.weapon.critical_multiplier) + ability_mod
                    result["critical_multiplier"] = attack_action.weapon.critical_multiplier
                else:
                    total_damage = base_damage + ability_mod
            else:
                base_damage = self.dice.roll("1d8")
                if critical_confirmed:
                    total_damage = (base_damage * 2) + ability_mod
                    result["critical_multiplier"] = 2
                else:
                    total_damage = base_damage + ability_mod
            result["base_damage"] = base_damage
            result["damage"] = total_damage
            result["justification"] = "Attack hit" + (" with a confirmed critical." if critical_confirmed else ".")
        else:
            result["damage"] = 0
            result["justification"] = "Attack missed; total attack did not meet effective defense."
        return result

class SpellResolver:
    def __init__(self, dice):
        self.dice = dice

    def resolve_spell(self, spell_action) -> Dict[str, Any]:
        damage = self.dice.roll("1d4") + 1
        result = {
            "action": "spell",
            "spell_name": spell_action.spell_name,
            "caster_name": spell_action.actor.name,
            "target_name": spell_action.target.name,
            "damage": damage,
            "justification": "Spell cast successfully."
        }
        return result

class SkillResolver:
    def __init__(self, dice):
        self.dice = dice

    def resolve_skill_check(self, skill_action) -> Dict[str, Any]:
        roll = self.dice.roll_d20()
        total = roll + 2
        result = {
            "action": "skill_check",
            "character_name": skill_action.actor.name,
            "skill_name": skill_action.skill_name,
            "roll": roll,
            "total": total,
            "dc": skill_action.dc,
            "justification": "Skill check processed."
        }
        return result

class RulesEngine:
    def __init__(self, dice):
        self.dice = dice
        self.combat_resolver = CombatResolver(dice)
        self.spell_resolver = SpellResolver(dice)
        self.skill_resolver = SkillResolver(dice)

    def process_turn(self, actions: List[Any]) -> List[Any]:
        results = []
        for action in actions:
            results.append(action.execute())
        return results

rules_engine = None
