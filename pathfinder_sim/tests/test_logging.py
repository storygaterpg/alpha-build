"""
tests/test_logging.py

This file contains tests for the logging system, ensuring that log messages are
formatted according to the templates defined in logging_config.json.
"""

import pytest
from logger import format_log

def test_attack_log_format() -> None:
    """
    Test that an attack log is formatted correctly.
    Checks that the key information (attacker name, defender name, roll, etc.) is included.
    """
    log_data = {
        "attacker_name": "Alice",
        "defender_name": "Bob",
        "natural_roll": 17,
        "effective_bonus": 5,
        "total_attack": 22,
        "effective_defense": 18,
        "hit": True,
        "critical": False
    }
    log_message = format_log("attack", log_data)
    # Basic assertions: ensure key parts of the message are present.
    assert "Alice" in log_message, "Log should include the attacker's name."
    assert "Bob" in log_message, "Log should include the defender's name."
    assert "17" in log_message, "Log should include the natural roll."
    # Additional assertions can be added based on the logging template.

def test_default_log_format() -> None:
    """
    Test that a default log message is produced when an unknown event type is used.
    """
    log_data = {"action": "unknown"}
    log_message = format_log("unknown_event", log_data)
    assert "unknown" in log_message, "Default log message should contain the action description."
