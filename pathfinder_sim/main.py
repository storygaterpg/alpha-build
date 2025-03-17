"""
main.py
-------

Main simulation engine for our Pathfinder 1st Edition game.
Integrates movement, actions, conditions, resource management, and now multiclass progression.
"""

from movement import Map, MovementAction
import spell_utils
import conditions
from character import Character
from turn_manager import TurnManager, AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction
from rules_engine import Dice, RulesEngine, rules_engine
from rpg_class import create_rpg_class

# Global game map.
game_map = None

def main():
    # Initialize dice and global rules engine.
    dice = Dice(seed=42)
    global rules_engine
    rules_engine = RulesEngine(dice)
    
    # Create a 10x10 map.
    global game_map
    game_map = Map(10, 10)
    # Set some terrain.
    for y in range(3, 6):
        game_map.set_terrain(3, y, "difficult")
    game_map.set_terrain(5, 5, "impassable")
    
    # Create characters.
    alice = Character("Alice", x=0, y=0, dexterity=14)
    bob = Character("Bob", x=9, y=9, dexterity=12)
    bob.spells.append("Magic Missile")
    
    # Assign initial RPG classes using our data-driven system.
    barbarian = create_rpg_class("barbarian")
    bard = create_rpg_class("bard")
    alice.level_up(barbarian)  # Alice starts as a Barbarian at level 1.
    bob.level_up(bard)         # Bob starts as a Bard at level 1.
    
    # Demonstrate multiclassing: Alice levels up in Bard as well.
    alice.level_up(bard)       # Alice becomes a multiclass character (Barbarian 1 / Bard 1).
    
    print(alice)
    print(bob)
    
    # Create a TurnManager with our characters.
    characters = {"Alice": alice, "Bob": bob}
    turn_manager = TurnManager(rules_engine, game_map, characters)
    current_turn = turn_manager.new_turn()
    
    # Create actions.
    attack = AttackAction(actor=alice, defender=bob, weapon_bonus=2,
                          weapon=None, is_touch_attack=False, target_flat_footed=True,
                          action_type="standard")
    move = MoveAction(actor=alice, target=(5, 0), action_type="move")
    spell = SpellAction(actor=bob, target=alice, spell_name="Magic Missile",
                        action_type="standard")
    swift = SkillCheckAction(actor=bob, skill_name="Use Magic Device", dc=15,
                              action_type="swift")
    
    current_turn.add_action(attack)
    current_turn.add_action(move)
    current_turn.add_action(spell)
    current_turn.add_action(swift)
    
    results = turn_manager.process_turn(current_turn)
    for res in results:
        print("Action Result:", res)
    
    # Additional demonstrations.
    movement_action = MovementAction(game_map, alice.position, (9, 9))
    path = movement_action.execute()
    print("Calculated Movement Path for Alice:", path)
    
    dist = spell_utils.calculate_distance(alice.position, bob.position)
    print("Distance from Alice to Bob (cells):", dist)
    
    alice.update_state()
    bob.update_state()
    print("After state update:")
    print(alice)
    print(bob)

if __name__ == "__main__":
    main()
