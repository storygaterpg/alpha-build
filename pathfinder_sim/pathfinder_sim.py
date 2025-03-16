"""
pathfinder_sim.py
-----------------

A professional prototype simulation engine for Pathfinder 1st Edition tabletop mechanics.
This version focuses on:
  - A complete character sheet including six ability scores, HP calculation,
    saving throws, BAB, CMB/CMD, skills, feats, inventory, money, spells, and initiative.
  - A turn-based simulation with a TurnManager, RulesEngine, and domain actions.
  - Deterministic dice rolling via a seeded Dice utility.
  - Detailed logging via LogManager for auditing and DM justification.
  - Translating action outcomes into narrative text via ResultsTranslator.

Tested on Windows using Python 3.x.
"""

import random
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime

# -----------------------------------------------------------------------------
# Logging Configuration and LogManager
# -----------------------------------------------------------------------------
# Configure the logging to output to both console and a file.
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("simulation.log", mode="w", encoding="utf-8"),
        logging.StreamHandler()
    ]
)

class LogManager:
    """
    LogManager handles writing structured log entries.
    It writes all action results and simulation events to a log file.
    """
    @staticmethod
    def log(message: str):
        logging.info(message)
    
    @staticmethod
    def log_json(data: dict):
        # Log a JSON-formatted string
        logging.info(json.dumps(data, indent=2))

# -----------------------------------------------------------------------------
# ResultsTranslator: Converts ActionResult details into narrative text.
# -----------------------------------------------------------------------------
class ResultsTranslator:
    """
    Converts detailed action results into plain language narrative text.
    This is used to justify outcomes to players and AI agents.
    """
    @staticmethod
    def translate(result: dict) -> str:
        # Basic translation based on keys in result.
        if result.get('hit'):
            narrative = (f"{result.get('attacker_name')} attacked {result.get('defender_name')} and rolled a {result.get('attack_roll')} "
                         f"(total attack: {result.get('total_attack')}) against AC {result.get('defender_ac')}. "
                         f"The attack hit, dealing {result.get('damage')} damage. "
                         f"({result.get('justification')})")
        else:
            narrative = (f"{result.get('attacker_name')} attacked {result.get('defender_name')} and rolled a {result.get('attack_roll')} "
                         f"(total attack: {result.get('total_attack')}) against AC {result.get('defender_ac')}. "
                         f"The attack missed. ({result.get('justification')})")
        return narrative

# -----------------------------------------------------------------------------
# Dice Utility Class
# -----------------------------------------------------------------------------
class Dice:
    """
    Dice utility for simulating dice rolls with deterministic behavior.
    Supports generic dice notation (e.g., "1d20+5").
    """
    def __init__(self, seed=None):
        self.rng = random.Random(seed)
    
    def roll(self, notation: str) -> int:
        """
        Roll dice using a notation string like "NdX+Y".
        For example, "1d8" rolls one 8-sided die; "2d6+3" rolls two 6-sided dice and adds 3.
        """
        try:
            parts = notation.lower().split("d")
            num_dice = int(parts[0])
            remainder = parts[1]
            if '+' in remainder:
                die, mod = remainder.split('+')
                mod = int(mod)
            elif '-' in remainder:
                die, mod = remainder.split('-')
                mod = -int(mod)
            else:
                die = remainder
                mod = 0
            die = int(die)
            total = 0
            rolls = []
            for _ in range(num_dice):
                r = self.rng.randint(1, die)
                rolls.append(r)
                total += r
            # Debug: Uncomment the next line to see individual dice results.
            # logging.debug(f"Dice roll {notation}: rolls={rolls}, modifier={mod}, total={total+mod}")
            return total + mod
        except Exception as e:
            raise ValueError(f"Invalid dice notation '{notation}'") from e

    def roll_d20(self) -> int:
        """
        Roll a standard d20.
        Returns an integer between 1 and 20.
        """
        return self.rng.randint(1, 20)

# -----------------------------------------------------------------------------
# Domain Entities & Complete Character Sheet
# -----------------------------------------------------------------------------
class Entity:
    """
    Base class for all game entities.
    Each entity has a unique ID and a name.
    """
    _id_counter = 1

    def __init__(self, name: str):
        self.id = Entity._id_counter
        Entity._id_counter += 1
        self.name = name

    def update(self):
        """
        Update the entity's state.
        """
        pass

class Character(Entity):
    """
    Represents a Pathfinder character with a complete character sheet.
    
    Attributes:
      - ability_scores: Dict with STR, DEX, CON, INT, WIS, CHA.
      - hit_die: Die used for HP calculation (e.g., 10 for fighter, 4 for wizard).
      - hp: Level 1 HP calculated as max hit die + CON modifier.
      - ac: Armor Class = 10 + DEX modifier + other bonuses.
      - bab: Base Attack Bonus.
      - saving_throws: Dict with 'Fortitude', 'Reflex', 'Will' (base + ability modifiers).
      - cmb: Combat Maneuver Bonus = BAB + STR mod + size mod.
      - cmd: Combat Maneuver Defense = 10 + BAB + STR mod + DEX mod + size mod.
      - skills: Dict of skills.
      - feats: List of feats.
      - inventory: List of items.
      - money: Gold pieces.
      - spells: List of spells.
      - initiative: Typically DEX modifier.
    """
    # Default class-based stats for level 1 (simplified)
    DEFAULT_CLASS_STATS = {
        'fighter': {'BAB': 1, 'Fortitude': 2, 'Reflex': 0, 'Will': 0},
        'wizard':  {'BAB': 0, 'Fortitude': 0, 'Reflex': 0, 'Will': 2},
    }
    
    def __init__(self, name: str, character_class: str,
                 strength: int, dexterity: int, constitution: int,
                 intelligence: int, wisdom: int, charisma: int,
                 hit_die: int, money: int = 0):
        super().__init__(name)
        self.ability_scores = {
            'STR': strength,
            'DEX': dexterity,
            'CON': constitution,
            'INT': intelligence,
            'WIS': wisdom,
            'CHA': charisma,
        }
        self.character_class = character_class.lower()
        self.hit_die = hit_die
        # Level 1 HP: max hit die value + CON modifier.
        self.hp = hit_die + self.get_modifier('CON')
        # Calculate AC: base 10 + DEX modifier + placeholders for additional bonuses.
        self.armor_bonus = 0
        self.shield_bonus = 0
        self.natural_armor = 0
        self.deflection_bonus = 0
        self.dodge_bonus = 0
        self.size_modifier = 0  # Assume medium size.
        self.ac = 10 + self.get_modifier('DEX') + self.armor_bonus + \
                  self.shield_bonus + self.natural_armor + \
                  self.deflection_bonus + self.dodge_bonus + self.size_modifier

        # Get class-based stats.
        class_stats = Character.DEFAULT_CLASS_STATS.get(self.character_class, 
                                                        {'BAB': 0, 'Fortitude': 0, 'Reflex': 0, 'Will': 0})
        self.bab = class_stats['BAB']
        self.saving_throws = {
            'Fortitude': class_stats['Fortitude'] + self.get_modifier('CON'),
            'Reflex': class_stats['Reflex'] + self.get_modifier('DEX'),
            'Will': class_stats['Will'] + self.get_modifier('WIS')
        }
        self.cmb = self.bab + self.get_modifier('STR') + self.size_modifier
        self.cmd = 10 + self.bab + self.get_modifier('STR') + self.get_modifier('DEX') + self.size_modifier

        self.skills = {}   # e.g., {"Acrobatics": {"ranks": 1, "ability": "DEX", "total": ...}}
        self.feats = []    # List of feats (for now, simple strings)
        self.inventory = []  # List of items (each item as a dict or object)
        self.money = money  # Gold pieces
        self.spells = []   # List of spells (as strings or objects)
        # Initiative is typically equal to DEX modifier (plus other bonuses)
        self.initiative = self.get_modifier('DEX')

    def get_modifier(self, ability: str) -> int:
        """
        Calculate the ability modifier: (score - 10) // 2.
        """
        score = self.ability_scores.get(ability, 10)
        return (score - 10) // 2

    def receive_damage(self, damage: int):
        """
        Apply damage and print a summary.
        """
        self.hp -= damage
        logging.info(f"{self.name} receives {damage} damage, remaining HP: {self.hp}")

    def add_skill(self, skill_name: str, ranks: int, associated_ability: str):
        """
        Add or update a skill.
        """
        mod = self.get_modifier(associated_ability)
        self.skills[skill_name] = {'ranks': ranks, 'ability': associated_ability, 'total': ranks + mod}

    def add_feat(self, feat: str):
        """
        Add a feat.
        """
        self.feats.append(feat)

    def add_item(self, item: dict):
        """
        Add an item to the inventory.
        """
        self.inventory.append(item)

    def learn_spell(self, spell: str):
        """
        Add a spell to the list of known/prepared spells.
        """
        self.spells.append(spell)

    def update(self):
        """
        Update character state (e.g., process conditions).
        """
        pass

# -----------------------------------------------------------------------------
# Action Interfaces and Implementations
# -----------------------------------------------------------------------------
class IAction(ABC):
    """
    Abstract base class for all actions.
    Every action must implement the execute method.
    """
    @abstractmethod
    def execute(self, rules_engine):
        pass

class AttackAction(IAction):
    """
    Represents an attack action.
    """
    def __init__(self, attacker: Character, defender: Character, weapon_bonus: int = 0):
        self.attacker = attacker
        self.defender = defender
        self.weapon_bonus = weapon_bonus

    def execute(self, rules_engine):
        """
        Delegate attack processing to the combat resolver.
        """
        return rules_engine.combat_resolver.resolve_attack(self)

# -----------------------------------------------------------------------------
# ActionResult and Logging (unchanged)
# -----------------------------------------------------------------------------
class ActionResult:
    """
    Represents the result of an action.
    """
    def __init__(self, success: bool, details: dict):
        self.success = success
        self.details = details

    def to_json(self) -> str:
        """
        Convert the ActionResult to a JSON string.
        """
        return json.dumps({
            'success': self.success,
            'details': self.details
        }, indent=2)

# -----------------------------------------------------------------------------
# Combat Resolver
# -----------------------------------------------------------------------------
class CombatResolver:
    """
    Processes attack actions using Pathfinder 1e rules.
    """
    def __init__(self, dice: Dice):
        self.dice = dice

    def resolve_attack(self, attack_action: AttackAction) -> ActionResult:
        """
        Resolve an attack:
          1. Roll a d20 and compute total attack = roll + STR modifier + weapon bonus.
          2. Compare against defender's AC.
          3. If hit (or natural 20), roll damage using "1d8" + STR modifier.
          4. Update defender's HP.
        Returns an ActionResult with a detailed log.
        """
        attack_roll = self.dice.roll_d20()
        attacker_modifier = attack_action.attacker.get_modifier('STR')
        total_attack = attack_roll + attacker_modifier + attack_action.weapon_bonus

        result = {
            'timestamp': datetime.now().isoformat(),
            'attacker_name': attack_action.attacker.name,
            'defender_name': attack_action.defender.name,
            'attack_roll': attack_roll,
            'attacker_modifier': attacker_modifier,
            'weapon_bonus': attack_action.weapon_bonus,
            'total_attack': total_attack,
            'defender_ac': attack_action.defender.ac
        }

        if total_attack >= attack_action.defender.ac or attack_roll == 20:
            damage = self.dice.roll("1d8") + attacker_modifier
            attack_action.defender.receive_damage(damage)
            result.update({
                'hit': True,
                'damage': damage,
                'justification': "Attack hit: total_attack >= defender_ac or natural 20 rolled"
            })
        else:
            result.update({
                'hit': False,
                'damage': 0,
                'justification': "Attack missed: total_attack < defender_ac"
            })
        # Log the detailed result
        LogManager.log_json(result)
        return ActionResult(True, result)

# -----------------------------------------------------------------------------
# Rules Engine
# -----------------------------------------------------------------------------
class RulesEngine:
    """
    Central processor for turn actions.
    Delegates actions to specific resolvers.
    """
    def __init__(self, dice: Dice):
        self.dice = dice
        self.combat_resolver = CombatResolver(dice)

    def process_turn(self, actions: list) -> list:
        """
        Process a list of IAction objects and return a list of ActionResult objects.
        """
        results = []
        for action in actions:
            try:
                result = action.execute(self)
                results.append(result)
            except Exception as e:
                results.append(ActionResult(False, {'error': str(e)}))
        return results

# -----------------------------------------------------------------------------
# Turn Manager
# -----------------------------------------------------------------------------
class TurnManager:
    """
    Manages a turn: converts JSON input into actions, processes them, and translates results.
    """
    def __init__(self, rules_engine: RulesEngine):
        self.rules_engine = rules_engine

    def execute_turn(self, json_actions: list) -> list:
        """
        Convert JSON actions into IAction objects, process them through the RulesEngine,
        and use the ResultsTranslator to produce narrative text.
        """
        actions = []
        for j_action in json_actions:
            action_type = j_action.get('type')
            if action_type == 'attack':
                # In production, character lookup would be based on IDs.
                attacker = j_action.get('attacker')
                defender = j_action.get('defender')
                weapon_bonus = j_action.get('weapon_bonus', 0)
                actions.append(AttackAction(attacker, defender, weapon_bonus))
            else:
                raise ValueError("Unknown action type in JSON input")
        
        results = self.rules_engine.process_turn(actions)
        # Translate each result into narrative text.
        for res in results:
            narrative = ResultsTranslator.translate(res.details)
            logging.info("Narrative: " + narrative)
        return results

# -----------------------------------------------------------------------------
# ResultsTranslator
# -----------------------------------------------------------------------------
class ResultsTranslator:
    """
    Translates ActionResult details into plain language narratives.
    """
    @staticmethod
    def translate(details: dict) -> str:
        if details.get('hit'):
            return (f"{details.get('attacker_name')} attacked {details.get('defender_name')} and rolled a {details.get('attack_roll')} "
                    f"(total: {details.get('total_attack')}) against AC {details.get('defender_ac')}. The attack hit, dealing "
                    f"{details.get('damage')} damage. ({details.get('justification')})")
        else:
            return (f"{details.get('attacker_name')} attacked {details.get('defender_name')} and rolled a {details.get('attack_roll')} "
                    f"(total: {details.get('total_attack')}) against AC {details.get('defender_ac')}. The attack missed. "
                    f"({details.get('justification')})")

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------
def main():
    """
    Main function to initialize simulation and execute a sample turn.
    """
    # Create Dice with a fixed seed for determinism.
    dice = Dice(seed=42)
    
    # Initialize RulesEngine and TurnManager.
    rules_engine = RulesEngine(dice)
    turn_manager = TurnManager(rules_engine)

    # Create example characters.
    # For a level 1 fighter: hit_die = 10; for a wizard: hit_die = 4.
    alice = Character("Alice", character_class="fighter",
                      strength=16, dexterity=14, constitution=12,
                      intelligence=10, wisdom=10, charisma=8,
                      hit_die=10, money=100)
    bob = Character("Bob", character_class="wizard",
                    strength=10, dexterity=12, constitution=12,
                    intelligence=16, wisdom=14, charisma=10,
                    hit_die=4, money=50)

    # Add skills, feats, and inventory as examples.
    alice.add_skill("Acrobatics", ranks=1, associated_ability="DEX")
    alice.add_skill("Climb", ranks=2, associated_ability="STR")
    alice.add_feat("Power Attack")
    alice.add_item({"name": "Longsword", "weight": 4, "cost": 15})
    bob.learn_spell("Magic Missile")
    
    # Display initial character sheets.
    logging.info(f"Alice's Sheet: HP={alice.hp}, AC={alice.ac}, BAB={alice.bab}, "
                 f"Saves={alice.saving_throws}, CMB={alice.cmb}, CMD={alice.cmd}, "
                 f"Skills={alice.skills}, Feats={alice.feats}, Money={alice.money}, "
                 f"Initiative={alice.initiative}")
    logging.info(f"Bob's Sheet: HP={bob.hp}, AC={bob.ac}, BAB={bob.bab}, "
                 f"Saves={bob.saving_throws}, CMB={bob.cmb}, CMD={bob.cmd}, "
                 f"Money={bob.money}, Initiative={bob.initiative}")
    
    # Sample JSON input for an attack action: Alice attacks Bob with a weapon bonus of 2.
    json_actions = [{
        'type': 'attack',
        'attacker': alice,      # Direct object reference for prototype purposes.
        'defender': bob,
        'weapon_bonus': 2
    }]

    # Execute the turn.
    turn_manager.execute_turn(json_actions)

if __name__ == "__main__":
    main()
