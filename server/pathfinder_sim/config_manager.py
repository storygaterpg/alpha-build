"""
config_manager.py
-----------------
This module centralizes configuration and data management for the simulation.
It provides functions to load and cache JSON configuration files from the /config directory.
It also includes error handling to ensure that invalid or missing files are reported clearly.
"""

import json
import os
from typing import Any, Dict

# Global cache to store loaded configuration files.
_CONFIG_CACHE: Dict[str, Any] = {}

def load_config(filename: str) -> Dict[str, Any]:
    """
    Load a configuration file from the 'config' directory.
    Uses caching to avoid re-reading the file from disk.

    Args:
        filename (str): The name of the configuration file (e.g., "bonus_config.json").

    Returns:
        Dict[str, Any]: The configuration data as a dictionary.

    Raises:
        FileNotFoundError: If the configuration file does not exist.
        json.JSONDecodeError: If the file content is not valid JSON.
    """
    global _CONFIG_CACHE
    if filename in _CONFIG_CACHE:
        return _CONFIG_CACHE[filename]
    
    config_path = os.path.join(os.path.dirname(__file__), "config", filename)
    try:
        with open(config_path, "r") as f:
            config_data = json.load(f)
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Configuration file '{filename}' not found at {config_path}.") from e
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(f"Invalid JSON in configuration file '{filename}'.", e.doc, e.pos) from e

    _CONFIG_CACHE[filename] = config_data
    return config_data

def clear_cache() -> None:
    """
    Clear the configuration cache.
    Useful when reloading configuration files during development or for dynamic reloading.
    """
    global _CONFIG_CACHE
    _CONFIG_CACHE.clear()
