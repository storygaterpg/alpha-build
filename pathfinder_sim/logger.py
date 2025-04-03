"""
logger.py
---------
This module provides a data-driven logging helper for our Pathfinder simulation.
It loads log templates from an external configuration file and formats log messages
based on the event type and provided data. This standardized logging supports full auditability.
"""

import json
import os
from typing import Dict, Any

# Global cache for logging configuration.
_LOGGING_CONFIG = None

def load_logging_config() -> Dict[str, Any]:
    """
    Load the logging configuration from 'config/logging_config.json'.
    The configuration is cached to reduce disk I/O.
    
    Returns:
        Dict[str, Any]: The logging templates.
    """
    global _LOGGING_CONFIG
    if _LOGGING_CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), "config", "logging_config.json")
        with open(config_path, "r") as f:
            _LOGGING_CONFIG = json.load(f)
    return _LOGGING_CONFIG

def format_log(event_type: str, data: Dict[str, Any]) -> str:
    """
    Format a log message for a given event type using the provided data.
    
    Parameters:
        event_type (str): The type of event (e.g., "attack", "spell", "move").
        data (Dict[str, Any]): Data for placeholder substitution.
    
    Returns:
        str: The formatted log message.
    """
    config = load_logging_config()
    template = config.get(event_type, config.get("default", "Action executed: {action}"))
    # Handle critical hit flag if present.
    if "critical" in data:
        crit_info = " with CRITICAL hit" if data["critical"] else ""
        data["critical_info"] = crit_info
    else:
        data["critical_info"] = ""
    return template.format(**data)
