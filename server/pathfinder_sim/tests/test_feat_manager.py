"""
tests/test_feat_manager.py

This file tests the feat management system. It checks that:
 - Feats can be retrieved (both individual and as a complete list)
 - Prerequisites checking is performed correctly.
"""

import pytest
from feat_manager import get_feat, get_all_feats, check_prerequisites, load_feats_for_category
from character import Character

def test_get_feat_valid():
    # Test retrieving a feat from a known category (assumes the configuration contains this feat).
    feat = get_feat("Disruptive Recall", category="general_feats")
    assert feat is not None, "Expected to find 'Disruptive Recall' in the 'general_feats' category."
    feat_dict = feat.to_dict()
    # Validate that key properties exist.
    assert "name" in feat_dict and "benefit" in feat_dict, "Feat should contain 'name' and 'benefit'."

def test_get_all_feats():
    # Test that we can retrieve a non-empty list of feats across categories.
    feats = get_all_feats()
    assert isinstance(feats, list), "get_all_feats should return a list."
    assert len(feats) > 0, "Expected at least one feat in the list."

def test_check_prerequisites_fail():
    # Create a character with low stats.
    char = Character("TestCharacter", 0, 0, dexterity=10)
    char.feats = []  # No feats yet.
    char.race = "Human"
    char.alignment = "Neutral"
    # Create a dummy feat that requires a CON of at least 15.
    from feat_manager import Feat
    dummy_feat = Feat(name="DummyFeat", prerequisites={"Stat": {"CON": 15}}, benefit="Test benefit", category="test")
    assert not check_prerequisites(char, dummy_feat), "Character should not meet the CON requirement for DummyFeat."

def test_check_prerequisites_pass():
    # Create a character with sufficient Constitution.
    char = Character("TestCharacter", 0, 0, dexterity=10)
    char.constitution = 16
    char.feats = ["ExistingFeat"]
    char.race = "Human"
    char.alignment = "Neutral"
    from feat_manager import Feat
    dummy_feat = Feat(name="DummyFeat", prerequisites={"Stat": {"CON": 15}}, benefit="Test benefit", category="test")
    assert check_prerequisites(char, dummy_feat), "Character should meet the CON requirement for DummyFeat."
