"""
main.py
-------

This is the main simulation engine for our Pathfinder 1st Edition game.
This updated version creates a more complex simulation environment that tests multiple aspects:
  - A larger game map with varied terrain.
  - Multiple characters with multiclass progression.
  - Conditions affecting AC and skills.
  - A multi-turn loop that processes diverse actions (movement, attack, spell, skill check).
  - Logging and state updates for DM justification.
"""

from movement import Map, MovementAction
from character import Character
from turn_manager import TurnManager, AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction
from rules_engine import Dice, RulesEngine, rules_engine
from rpg_class import create_rpg_class
import conditions
from action_types import ActionType
import spell_utils
import json
from movement import Map
from vertical_movement import determine_edge_options
from turn_manager import TurnManager, MoveAction  # existing actions for horizontal movement


def setup_game_environment():
    # Create a larger map (15x15) with varied terrain.
    game_map = Map(15, 15)
    # Set some columns/rows to be difficult terrain.
    for y in range(5, 10):
        game_map.set_terrain(7, y, "difficult")
    # Set a few impassable cells to simulate obstacles.
    game_map.set_terrain(3, 3, "impassable")
    game_map.set_terrain(4, 3, "impassable")
    game_map.set_terrain(5, 3, "impassable")
    
    # Initialize dice and rules engine.
    dice = Dice(seed=42)
    global rules_engine
    rules_engine = RulesEngine(dice)
    
    # Create characters.
    # Alice: A fighter with high DEX (16) and some Barbarian levels.
    alice = Character("Alice", x=0, y=0, dexterity=16)
    fighter_class = create_rpg_class("fighter")
    barbarian_class = create_rpg_class("barbarian")
    alice.level_up(fighter_class)
    alice.level_up(barbarian_class)
    
    # Bob: A wizard with moderate stats (DEX 14) and a touch of Cleric.
    bob = Character("Bob", x=14, y=14, dexterity=14)
    wizard_class = create_rpg_class("wizard")
    cleric_class = create_rpg_class("cleric")
    bob.level_up(wizard_class)
    bob.level_up(cleric_class)
    # Bob knows Magic Missile.
    bob.spells.append("Magic Missile")
    
    # Charlie: A charismatic bard (CHA 18) with a single level.
    charlie = Character("Charlie", x=7, y=0, dexterity=12)
    bard_class = create_rpg_class("bard")
    charlie.level_up(bard_class)
    
    # Apply some conditions:
    # Bob is blinded (losing Dex bonus and -5 on DEX/STR-based skills)
    bob.add_condition(conditions.BlindedCondition())
    # Alice is fatigued (-2 penalty on DEX/STR-based skills)
    alice.add_condition(conditions.FatiguedCondition())
    # Charlie is confused (no direct numeric penalty but may affect behavior)
    charlie.add_condition(conditions.ConfusedCondition())
    
    # Return a dictionary of characters and the map.
    characters = {"Alice": alice, "Bob": bob, "Charlie": charlie}
    return game_map, characters

def simulate_turns(game_map, characters, num_turns=3):
    tm = TurnManager(rules_engine, game_map)
    # Simulate multiple turns.
    for turn_number in range(1, num_turns+1):
        print(f"\n--- Turn {turn_number} ---")
        turn = tm.new_turn()
        
        # Example Actions:
        # Alice will move toward the center (simulate movement from her current position to (5,5)).
        move_action_alice = MoveAction(actor=characters["Alice"], target=(5, 5), action_type="move")
        turn.add_action(move_action_alice)
        
        # Then, Alice makes an attack on Bob.
        attack_action_alice = AttackAction(actor=characters["Alice"], defender=characters["Bob"],
                                           weapon_bonus=2, weapon=None,
                                           is_touch_attack=False, target_flat_footed=False,
                                           action_type="standard")
        turn.add_action(attack_action_alice)
        
        # Bob casts a spell ("Magic Missile") on Alice.
        spell_action_bob = SpellAction(actor=characters["Bob"], target=characters["Alice"],
                                       spell_name="Magic Missile", action_type="standard")
        turn.add_action(spell_action_bob)
        
        # Bob also performs a swift skill check (e.g., Use Magic Device) – for demonstration.
        swift_action_bob = SkillCheckAction(actor=characters["Bob"], skill_name="Use Magic Device", dc=15, action_type="swift")
        turn.add_action(swift_action_bob)
        
        # Charlie makes a standard skill check (e.g., Bluff) using his bardic talents.
        skill_action_charlie = SkillCheckAction(actor=characters["Charlie"], skill_name="Bluff", dc=10, action_type="standard")
        turn.add_action(skill_action_charlie)
        
        # Process the turn.
        results = tm.process_turn(turn)
        for res in results:
            print("Action Result:", res)
        
        # After each turn, update each character's state (tick conditions, resources, etc.)
        for char in characters.values():
            char.update_state()
            print(char)
        
        # For demonstration, print effective skill modifiers for a couple of skills.
        print(f"Alice's effective DEX modifier for Acrobatics: {characters['Alice'].get_effective_skill_modifier('DEX')}")
        print(f"Bob's effective DEX modifier for Disable Device: {characters['Bob'].get_effective_skill_modifier('DEX')}")
        print(f"Charlie's effective CHA modifier for Bluff: {characters['Charlie'].get_effective_skill_modifier('CHA')}")
        
def main():
    game_map, characters = setup_game_environment()
    simulate_turns(game_map, characters, num_turns=3)
    
if __name__ == "__main__":
    main()
