"""
logger.py

This module provides a data-driven logging helper for our Pathfinder simulation.
It loads log templates from the configuration file and formats log messages given an event type and data.
"""

import json
import os
from typing import Dict, Any

# Global cache for logging configuration.
_LOGGING_CONFIG = None

def load_logging_config() -> Dict[str, Any]:
    """
    Loads the logging configuration from 'config/logging_config.json'.
    Caches the configuration for efficiency.
    """
    global _LOGGING_CONFIG
    if _LOGGING_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "logging_config.json")
        with open(config_path, "r") as f:
            _LOGGING_CONFIG = json.load(f)
    return _LOGGING_CONFIG

def format_log(event_type: str, data: Dict[str, Any]) -> str:
    """
    Formats a log message for the given event type using the data provided.
    
    Parameters:
      event_type: The type of event (e.g., "attack", "spell", "move", etc.)
      data: A dictionary containing the keys referenced in the template.
    
    Returns:
      A formatted log message string.
    """
    config = load_logging_config()
    template = config.get(event_type, config.get("default", ""))
    # If a critical flag is present, prepare a string; otherwise, empty.
    if "critical" in data:
        crit_info = " with CRITICAL hit" if data["critical"] else ""
        data["critical_info"] = crit_info
    else:
        data["critical_info"] = ""
    return template.format(**data)
