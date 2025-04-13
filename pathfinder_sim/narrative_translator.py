"""
narrative_translator.py

This module provides functionality to translate technical ActionResult objects into 
plain language narrative text for DM justification and player communication. It converts 
the outcome of each action into a descriptive narrative, integrating rule justifications 
as appropriate.

Classes:
    NarrativeTranslator: Contains methods to translate a single ActionResult or a list 
                          of ActionResults into human-readable narrative text.

Usage Example:
    from narrative_translator import NarrativeTranslator
    from action_result import ActionResult

    translator = NarrativeTranslator(use_justification=True)
    narrative_text = translator.translate_result(action_result)
    print(narrative_text)
"""

from action_result import ActionResult
from justification_generator import JustificationGenerator

class NarrativeTranslator:
    def __init__(self, use_justification: bool = True):
        """
        Initialize the NarrativeTranslator.

        Args:
            use_justification (bool): If True, append detailed justification text generated by JustificationGenerator.
        """
        self.use_justification = use_justification
        # Mapping of action types to dedicated translator methods.
        self.templates = {
            "attack": self._translate_attack,
            "spell": self._translate_spell,
            "move": self._translate_move,
            "skill_check": self._translate_skill_check,
            "full_round": self._translate_full_round,
            "maneuver": self._translate_maneuver,
            "swift": self._translate_skill_check,
            "free": self._translate_default,
            "immediate": self._translate_default,
            "readied": self._translate_default,
            "delayed": self._translate_default
        }
        # Instantiate JustificationGenerator for rule-based explanations.
        if self.use_justification:
            self.justification_generator = JustificationGenerator()
    
    def translate_result(self, result: ActionResult) -> str:
        """
        Translate a single ActionResult into a narrative string.

        Args:
            result (ActionResult): The action result to translate.

        Returns:
            str: A narrative description of the action outcome.
        """
        action_type = result.action.lower()
        translator = self.templates.get(action_type, self._translate_default)
        narrative = translator(result)
        # Optionally, append the justification generated from the JustificationGenerator.
        if self.use_justification:
            justification = self.justification_generator.generate(result)
            narrative += f"\nJustification: {justification}"
        return narrative

    def translate_all(self, results: list) -> list:
        """
        Translate a list of ActionResult objects into narrative strings.

        Args:
            results (list): List of ActionResult objects.

        Returns:
            list: List of narrative strings.
        """
        return [self.translate_result(result) for result in results]

    def _translate_attack(self, result: ActionResult) -> str:
        """
        Translate an attack action result into narrative text.
        """
        data = result.result_data
        narrative = (f"In turn {result.turn_number}, {result.actor_name} attacked {result.target_name}. "
                     f"They rolled a {data.get('natural_roll')} with an effective bonus of {data.get('effective_bonus')}, "
                     f"totaling {data.get('total_attack')}, against a defense of {data.get('effective_defense')}. ")
        if data.get("hit"):
            narrative += "The attack hit"
            if data.get("critical"):
                narrative += " with a critical strike"
            narrative += f", dealing {data.get('damage', 'unknown')} damage."
        else:
            narrative += "The attack missed."
        if "justification" in data:
            narrative += f" ({data['justification']})"
        return narrative

    def _translate_spell(self, result: ActionResult) -> str:
        """
        Translate a spellcasting action result into narrative text.
        """
        data = result.result_data
        narrative = (f"In turn {result.turn_number}, {result.actor_name} cast the spell '{data.get('spell_name', '')}' "
                     f"on {result.target_name}. The spell dealt {data.get('damage', 'no')} damage.")
        if "justification" in data:
            narrative += f" ({data['justification']})"
        return narrative

    def _translate_move(self, result: ActionResult) -> str:
        """
        Translate a movement action result into narrative text.
        """
        data = result.result_data
        narrative = (f"In turn {result.turn_number}, {result.actor_name} moved from {data.get('start_position', 'unknown')} "
                     f"to {data.get('final_position', 'unknown')} following the path: {data.get('path', [])}.")
        if "justification" in data:
            narrative += f" ({data['justification']})"
        return narrative

    def _translate_skill_check(self, result: ActionResult) -> str:
        """
        Translate a skill check action result into narrative text.
        """
        data = result.result_data
        narrative = (f"In turn {result.turn_number}, {result.actor_name} performed a skill check for {data.get('skill_name', '')}. "
                     f"They rolled a {data.get('roll')} resulting in a total of {data.get('total')} against a DC of {data.get('dc')}.")
        if "justification" in data:
            narrative += f" ({data['justification']})"
        return narrative

    def _translate_full_round(self, result: ActionResult) -> str:
        """
        Translate a full-round action result into narrative text.
        """
        data = result.result_data
        narrative = (f"In turn {result.turn_number}, {result.actor_name} performed a full-round action. "
                     f"Outcome: {data.get('outcome', 'unspecified')}.")
        if "justification" in data:
            narrative += f" ({data['justification']})"
        return narrative

    def _translate_maneuver(self, result: ActionResult) -> str:
        """
        Translate a combat maneuver action result into narrative text.
        """
        data = result.result_data
        narrative = (f"In turn {result.turn_number}, {result.actor_name} executed a combat maneuver against {result.target_name}. "
                     f"Result: {data.get('result', 'unspecified')}.")
        if "justification" in data:
            narrative += f" ({data['justification']})"
        return narrative

    def _translate_default(self, result: ActionResult) -> str:
        """
        Fallback translation for any action types without a dedicated translator.
        """
        narrative = (f"In turn {result.turn_number}, {result.actor_name} executed an action of type '{result.action}'.")
        if result.log:
            narrative += f" Details: {result.log}"
        return narrative
