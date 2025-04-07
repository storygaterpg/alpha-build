"""
tests/test_logging.py

Tests for the Logging System.
This file verifies that log messages are formatted correctly according to the templates
defined in logging_config.json. The tests check that essential information is included in the logs.
"""

import json
import os
import pytest
from logger import format_log

def test_attack_log_format():
    """
    Test that an attack log is formatted correctly.
    The log message should include the attacker's and defender's names, the dice roll,
    effective bonus, and other key values.
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
    # Check for key substrings.
    assert "Alice" in log_message, "Log should include the attacker's name."
    assert "Bob" in log_message, "Log should include the defender's name."
    assert "17" in log_message, "Log should include the natural roll."

def test_default_log_format():
    """
    Test that a default log message is produced when an unknown event type is used.
    """
    log_data = {"action": "unknown"}
    log_message = format_log("unknown_event", log_data)
    assert "unknown" in log_message, "Default log message should contain the action description."
