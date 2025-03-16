"""
engine.py
---------

This is the main simulation engine for our Pathfinder 1st Edition game.
It integrates:
  - Movement: Map and MovementAction from movement.py.
  - Spell Utilities: Functions from spell_utils.py.
  - Conditions: Condition classes from conditions.py.
  - Action Economy and Turn Management: From turn_manager.py.
  - Rules Engine: From rules_engine.py.
  - Character: From character.py.

This engine ties all components together and demonstrates a sample turn, including movement,
spell targeting, action resolution, and condition updates.
"""

from movement import Map, MovementAction
import spell_utils
import conditions
from character import Character
from turn_manager import TurnManager, ActionType, AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction
from rules_engine import Dice, RulesEngine, rules_engine

# Global game map for use by movement and turn actions.
game_map = None

def main():
    # Initialize dice and rules engine.
    dice = Dice(seed=42)
    global rules_engine
    rules_engine = RulesEngine(dice)
    
    # Create a 10x10 map.
    global game_map
    game_map = Map(10, 10)
    # Set terrain: Column 3, rows 3-5 as difficult; cell (5,5) as impassable.
    for y in range(3, 6):
        game_map.set_terrain(3, y, "difficult")
    game_map.set_terrain(5, 5, "impassable")
    
    # Create characters.
    alice = Character("Alice", x=0, y=0, dexterity=14)
    bob = Character("Bob", x=9, y=9, dexterity=12)
    bob.spells.append("Magic Missile")
    
    # Apply conditions.
    bob.add_condition(conditions.BlindedCondition(duration=2))
    bob.add_condition(conditions.ConfusedCondition(duration=3))
    alice.add_condition(conditions.ProneCondition(duration=1))
    alice.add_condition(conditions.ShakenCondition(duration=1))
    alice.add_condition(conditions.StunnedCondition(duration=1))
    
    print(alice)
    print(bob)
    
    # Create a TurnManager.
    turn_manager = TurnManager(rules_engine)
    current_turn = turn_manager.new_turn()
    
    # Create actions based on Pathfinder action economy:
    # Option B: One standard action (attack) and one move action.
    attack = AttackAction(actor=alice, defender=bob, weapon_bonus=2,
                          weapon=None, is_touch_attack=False, target_flat_footed=True,
                          action_type=ActionType.STANDARD)
    move = MoveAction(actor=alice, target=(5, 0), action_type=ActionType.MOVE)
    # Bob casts a spell as his standard action.
    spell = SpellAction(actor=bob, target=alice, spell_name="Magic Missile",
                        action_type=ActionType.STANDARD)
    # Bob takes a swift action (e.g., a skill check).
    swift = SkillCheckAction(actor=bob, skill_name="Use Magic Device", dc=15,
                              action_type=ActionType.SWIFT)
    
    # Add actions to the turn.
    current_turn.add_action(attack)
    current_turn.add_action(move)
    current_turn.add_action(spell)
    current_turn.add_action(swift)
    
    # Process the turn.
    results = turn_manager.process_turn(current_turn)
    for res in results:
        print("Action Result:", res)
    
    # Demonstrate movement.
    movement_action = MovementAction(game_map, alice.position, (9, 9))
    path = movement_action.execute()
    print("Calculated Movement Path for Alice:", path)
    
    # Spell utilities demonstration.
    dist = spell_utils.calculate_distance(alice.position, bob.position)
    print("Distance from Alice to Bob (cells):", dist)
    line = spell_utils.bresenham_line(alice.position, bob.position)
    print("Bresenham Line from Alice to Bob:", line)
    line_clear = spell_utils.is_line_clear(alice.position, bob.position, game_map)
    print("Is line-of-sight clear?", line_clear)
    fireball_area = spell_utils.area_circle(bob.position, 3)
    print("Area of effect (circle):", fireball_area)
    burning_hands_area = spell_utils.area_cone(alice.position, direction=45, cone_angle=60, range_=4)
    print("Area of effect (cone):", burning_hands_area)
    
    # Time and distance conversions.
    print("3 minutes in turns:", spell_utils.minutes_to_turns(3))
    print("30 feet in cells:", spell_utils.feet_to_cells(30))
    
    # Update conditions.
    bob.update_conditions()
    print("Bob's conditions after update:", bob.get_condition_status())

if __name__ == "__main__":
    main()
