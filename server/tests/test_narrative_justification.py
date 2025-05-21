"""
tests/test_narrative_justification.py

This file tests the narrative and justification modules:
 - It verifies that NarrativeTranslator produces clear, plain language descriptions,
 - And that JustificationGenerator produces detailed rule-based explanations with debug info.
"""

import pytest
from action_result import ActionResult
from narrative_translator import NarrativeTranslator
from justification_generator import JustificationGenerator

def test_narrative_translation_attack():
    # Create a dummy attack ActionResult.
    result_data = {
        "natural_roll": 18,
        "effective_bonus": 5,
        "total_attack": 23,
        "effective_defense": 20,
        "hit": True,
        "critical": False,
        "damage": 8,
        "justification": "Attack hit."
    }
    debug_info = {"roll": 18, "modifier": 5}
    action_result = ActionResult(
        action="attack",
        actor_name="Alice",
        target_name="Bob",
        result_data=result_data,
        log="",
        turn_number=1,
        action_id=101,
        debug=debug_info
    )
    translator = NarrativeTranslator(use_justification=True)
    narrative = translator.translate_result(action_result)
    assert "attacked" in narrative.lower(), "Narrative should describe an attack."
    assert "Justification:" in narrative, "Narrative should include a justification section."

def test_justification_generation_default():
    # Test that an unknown action type uses the default justification.
    result_data = {"justification": "Default action executed."}
    debug_info = {"info": "debug detail"}
    action_result = ActionResult(
        action="unknown",
        actor_name="Test",
        result_data=result_data,
        log="",
        turn_number=1,
        action_id=102,
        debug=debug_info
    )
    generator = JustificationGenerator()
    justification = generator.generate(action_result)
    assert "Default Resolution" in justification, "Default justification should be used for unknown actions."
    assert "debug detail" in justification, "Debug info should be appended to the justification."
