"""
main.py
-------

This is the main simulation engine for our Pathfinder 1st Edition game.
This version sets up the game environment, processes turns, and now integrates
the Narrative & Logging Layer. Each action's detailed ActionResult is translated
into plain language narrative text for DM justification and player communication.
"""

import json
import random
import datetime
from typing import Tuple, Dict, Any
from movement import Map
from vertical_movement import CustomMoveAction
from turn_manager import TurnManager, AttackAction, SpellAction, SkillCheckAction, MoveAction, FullRoundAction
from character import Character
from rpg_class import create_rpg_class
import conditions
import feat_manager
import spell_utils

# Import rules engine components.
from rules_engine import Dice, RulesEngine

# Import our new NarrativeTranslator.
from narrative_translator import NarrativeTranslator

def setup_game_environment() -> Tuple[Map, Dict[str, Character], RulesEngine]:
    """
    Sets up the game environment with a 15x15 map, characters, and the rules engine.
    
    Returns:
        Tuple containing the game map, a dictionary of characters, and the rules engine.
    """
    # Create a 15x15 map with uniform terrain and height.
    game_map = Map(15, 15)
    for y in range(15):
        for x in range(15):
            game_map.set_height(x, y, 0)
            game_map.set_terrain(x, y, "normal")
    # Create a cliff edge: column 6 at height 0, column 7 at height -15.
    for y in range(15):
        game_map.set_height(6, y, 0)
        game_map.set_height(7, y, -15)
        game_map.set_terrain(6, y, "normal")
        game_map.set_terrain(7, y, "jumpable")
    
    # Initialize dice and rules engine.
    dice = Dice(seed=42)
    rules_engine = RulesEngine(dice)
    
    # Create characters.
    alice = Character("Alice", x=5, y=7, dexterity=16)
    fighter_class = create_rpg_class("fighter")
    barbarian_class = create_rpg_class("barbarian")
    alice.level_up(fighter_class)
    alice.level_up(barbarian_class)
    
    # Bob: A wizard with moderate stats (DEX 14) and a touch of Cleric.
    bob = Character("Bob", x=14, y=7, dexterity=14)
    wizard_class = create_rpg_class("wizard")
    cleric_class = create_rpg_class("cleric")
    bob.level_up(wizard_class)
    bob.level_up(cleric_class)
    bob.spells.append("Magic Missile")
    
    # Charlie: A charismatic bard (CHA 18) with a single level.
    charlie = Character("Charlie", x=7, y=0, dexterity=12)
    bard_class = create_rpg_class("bard")
    charlie.level_up(bard_class)
    
    # Apply conditions.
    bob.add_condition(conditions.BlindedCondition())
    alice.add_condition(conditions.FatiguedCondition())
    charlie.add_condition(conditions.ConfusedCondition())
    
    # Set effective skill modifier functions.
    alice.get_effective_skill_modifier = lambda skill: 2 if skill.lower() in ["acrobatics", "jump"] else 0
    bob.get_effective_skill_modifier = lambda skill: 0
    charlie.get_effective_skill_modifier = lambda skill: 1 if skill.lower() == "bluff" else 0
    
    characters = {"Alice": alice, "Bob": bob, "Charlie": charlie}
    return game_map, characters, rules_engine

def simulate_turns(game_map: Map, characters: Dict[str, Character], rules_engine: RulesEngine, num_turns: int = 3):
    """
    Simulate a series of turns. For each turn, process actions and then use the NarrativeTranslator
    to output a human-readable summary of what occurred.
    """
    tm = TurnManager(rules_engine, game_map)
    translator = NarrativeTranslator()  # Instantiate our narrative translator.
    
    for turn_number in range(1, num_turns + 1):
        print(f"\n--- Turn {turn_number} ---")
        turn = tm.new_turn()
        
        # Standard Actions:
        # Alice moves towards (5,5).
        move_action_alice = MoveAction(actor=characters["Alice"], target=(5, 5), action_type="move")
        turn.add_action(move_action_alice)
        
        attack_action_alice = AttackAction(
            actor=characters["Alice"], 
            defender=characters["Bob"],
            weapon_bonus=2, 
            weapon=None,
            is_touch_attack=False, 
            target_flat_footed=False,
            action_type="standard"
        )
        turn.add_action(attack_action_alice)
        
        spell_action_bob = SpellAction(
            actor=characters["Bob"], 
            target=characters["Alice"],
            spell_name="Magic Missile", 
            action_type="standard"
        )
        turn.add_action(spell_action_bob)
        
        swift_action_bob = SkillCheckAction(
            actor=characters["Bob"], 
            skill_name="Use Magic Device", 
            dc=15, 
            action_type="swift"
        )
        turn.add_action(swift_action_bob)
        
        skill_action_charlie = SkillCheckAction(
            actor=characters["Charlie"], 
            skill_name="Bluff", 
            dc=10, 
            action_type="standard"
        )
        turn.add_action(skill_action_charlie)
        
        # Process the turn.
        results = tm.process_turn(turn)
        print("\n--- Raw Action Results (for audit) ---")
        for res in results:
            print(res.to_dict())
        
        # Generate and print narrative text.
        print("\n--- Narrative Summary ---")
        narratives = translator.translate_all(results)
        for narrative in narratives:
            print(narrative)
        
        # Update character states.
        for char in characters.values():
            char.update_state()
            print(char)
        
        # Additional demonstration: Vertical Movement Test on turn 2.
        if turn_number == 2:
            print("\n--- Vertical Movement Test ---")
            vertical_action = CustomMoveAction(actor=characters["Alice"], target=(8, 7), game_map=game_map)
            vertical_result = vertical_action.execute()
            vertical_narrative = translator.translate_result(vertical_result)
            print("Vertical Movement Option Result (Narrative):")
            print(vertical_narrative)

def test_feat_manager():
    """
    Test the feat manager by loading a sample feat.
    """
    # For demonstration, attempt to retrieve "Disruptive Recall" from the "general" category.
    feat = feat_manager.get_feat("Disruptive Recall", category="general_feats")

    if feat:
        print("\nFeat Manager Test:")
        print("Loaded Feat:", feat.to_dict())
    else:
        print("\nFeat Manager Test: 'Disruptive Recall' not found in 'general' category.")

# -------------------------------------------------
# Main Function
# -------------------------------------------------
def main():
    game_map, characters, rules_engine = setup_game_environment()
    simulate_turns(game_map, characters, rules_engine, num_turns=3)
    test_feat_manager()

if __name__ == "__main__":
    main()
