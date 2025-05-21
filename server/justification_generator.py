"""
justification_generator.py

This module provides functionality to generate detailed, rule-based justifications for each
action's outcome in the Pathfinder simulation. The JustificationGenerator class examines an
ActionResult and produces a human-readable explanation that includes key rule summaries and
internal audit data.

The generated justifications help the DM and AI agents understand why an action succeeded or
failed, referencing internal rule interpretations (e.g., how attack rolls, critical confirmations,
or skill checks are resolved).

Usage Example:
    from justification_generator import JustificationGenerator
    from action_result import ActionResult

    generator = JustificationGenerator()
    justification_text = generator.generate(action_result)
    print(justification_text)
"""

from action_result import ActionResult

class JustificationGenerator:
    def __init__(self):
        """
        Initialize the JustificationGenerator.
        Define a mapping of action types (in lowercase) to justification templates.
        These templates describe the internal rules used to resolve each action type.
        """
        self.justification_map = {
            "attack": (
                "Attack Resolution: A d20 was rolled and added to the effective bonus, which includes BAB, "
                "the relevant ability modifier, and weapon bonuses, while subtracting any penalties. The total "
                "was compared against the target's defense (AC/touch/flat-footed). A natural 20 guarantees a hit, "
                "and a critical threat was confirmed with an additional d20 roll if applicable. Refer to the Pathfinder "
                "Core Rulebook sections on attack rolls and critical hit confirmation for details."
            ),
            "spell": (
                "Spellcasting Resolution: The caster's spell slot resource was consumed and the spell's damage was "
                "determined by rolling the appropriate damage dice and applying any modifiers. The outcome adheres "
                "to the standard spellcasting rules regarding resource consumption and damage calculation."
            ),
            "move": (
                "Movement Resolution: The character's path was calculated using an A* algorithm over the terrain grid, "
                "taking into account terrain movement costs and obstacles. Vertical differences trigger special checks. "
                "The final position is updated based on the valid path found. See movement rules for further details."
            ),
            "skill_check": (
                "Skill Check Resolution: A d20 was rolled and the character's effective skill modifier, derived from the "
                "base ability modifier plus any condition modifiers, was added. This total was compared against the set "
                "DC to determine success or failure, as per standard skill check rules."
            ),
            "full_round": (
                "Full-Round Action: The character performed an action that consumes both a standard and a move action. "
                "This typically involves a charge or a full attack sequence, combining movement and additional attacks. "
                "The outcome is resolved according to full-round action guidelines."
            ),
            "maneuver": (
                "Combat Maneuver Resolution: The combat maneuver was resolved by comparing the attacker's Combat Maneuver "
                "Bonus (CMB) with the defender's Combat Maneuver Defense (CMD). Additional factors, such as size and special "
                "abilities, were taken into account. See the rules on combat maneuvers for further explanation."
            )
            # Other action types (swift, free, immediate, readied, delayed) will use the default justification.
        }
        self.default_justification = (
            "Default Resolution: This action was resolved using the standard rules. Detailed calculations and audit data "
            "are available in the debug information."
        )

    def generate(self, result: ActionResult) -> str:
        """
        Generate a detailed justification string for the provided ActionResult.
        
        Args:
            result (ActionResult): The result object containing outcome details and debug information.
        
        Returns:
            str: A detailed, rule-based justification for the action's outcome.
        """
        # Determine the action type and get the corresponding justification.
        action_type = result.action.lower()
        justification = self.justification_map.get(action_type, self.default_justification)
        
        # Optionally, include additional details from the debug dictionary.
        debug_info = result.debug
        if debug_info:
            additional_details = "; ".join([f"{key}={value}" for key, value in debug_info.items()])
            justification += f" [Debug Details: {additional_details}]"
        
        return justification

    def generate_all(self, results: list) -> list:
        """
        Generate justifications for a list of ActionResult objects.
        
        Args:
            results (list): List of ActionResult objects.
        
        Returns:
            list: List of justification strings corresponding to each ActionResult.
        """
        return [self.generate(result) for result in results]
