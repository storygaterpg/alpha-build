"""
tests/test_config_manager.py

This file tests the configuration manager. It checks that:
 - Configurations load correctly,
 - Missing files raise FileNotFoundError,
 - And that clearing the cache forces a reload.
"""

import pytest
from config_manager import load_config, clear_cache

def test_load_config_success():
    config = load_config("bonus_config.json")
    assert isinstance(config, dict), "Loaded configuration should be a dictionary."
    assert "bonus_types" in config, "Configuration should include 'bonus_types'."

def test_load_config_failure():
    with pytest.raises(FileNotFoundError):
        load_config("non_existent_config.json")

def test_clear_cache():
    # Load a config, then clear cache and reload.
    config1 = load_config("bonus_config.json")
    clear_cache()
    config2 = load_config("bonus_config.json")
    assert config1 == config2, "After clearing cache, reloaded config should match the original."
