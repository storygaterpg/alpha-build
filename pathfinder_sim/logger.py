"""
logger.py
---------
This module provides a data-driven logging helper for our Pathfinder simulation.
It loads log templates from the configuration file (logging_config.json) and formats
log messages based on the event type and provided data. This standardized logging
supports full auditability, allowing each ActionResult to include a human-readable log.
Additionally, a helper function is provided to persist log messages to a file if needed.
"""

import json
import os
import datetime
from typing import Dict, Any

# Global cache for logging configuration.
_LOGGING_CONFIG = None

def load_logging_config() -> Dict[str, Any]:
    """
    Load the logging configuration from 'config/logging_config.json'.
    The configuration is cached to reduce disk I/O.
    
    Returns:
        Dict[str, Any]: A dictionary containing logging templates for each event type.
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
        data (Dict[str, Any]): A dictionary with keys that match placeholders in the template.
        
    Returns:
        str: The formatted log message.
    """
    config = load_logging_config()
    # Use the event-specific template; fall back to the default template.
    template = config.get(event_type, config.get("default", "Action executed: {action}"))
    # Handle critical hit information if provided.
    if "critical" in data:
        crit_info = " with CRITICAL hit" if data["critical"] else ""
        data["critical_info"] = crit_info
    else:
        data["critical_info"] = ""
    # Attach a timestamp if not already present.
    if "timestamp" not in data:
        data["timestamp"] = datetime.datetime.now().isoformat()
    return template.format(**data)

def write_log(message: str, filename: str = "simulation.log") -> None:
    """
    Append the provided log message to a persistent log file.
    
    Parameters:
        message (str): The log message to write.
        filename (str): The name of the log file (default is 'simulation.log').
    
    Note:
        This function appends to the log file in the same directory as this module.
    """
    log_path = os.path.join(os.path.dirname(__file__), filename)
    with open(log_path, "a") as log_file:
        # Prepend a timestamp to the message.
        timestamp = datetime.datetime.now().isoformat()
        log_file.write(f"[{timestamp}] {message}\n")
