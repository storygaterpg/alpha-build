from character import Character
from rpg_race import create_race
from rpg_class import create_rpg_class
from feat_manager import get_feat, check_prerequisites

class CharacterBuilder:
    """
    Fluent builder for creating fully configured Character instances
    for testing, simulation, or gameplay purposes.
    """
    def __init__(self, name: str):
        self.char = Character(name, x=0, y=0, dexterity=10)

    def with_position(self, x: int, y: int):
        self.char.position = (x, y)
        return self

    def with_abilities(self, **scores):
        """
        Set ability scores. Example: with_abilities(strength=16, constitution=14)
        """
        for ability, value in scores.items():
            setattr(self.char, ability, value)
        self.char.recalc_stats()
        return self

    def with_race(self, race_name: str):
        race = create_race(race_name)
        self.char.initialize_race(race)
        self.char.recalc_stats()
        return self

    def with_class(self, class_name: str, levels: int = 1):
        rpg_class = create_rpg_class(class_name)
        for _ in range(levels):
            self.char.level_up(rpg_class)
        return self

    def with_feat(self, feat_name: str):
        feat = get_feat(feat_name)
        if not check_prerequisites(self.char, feat):
            raise ValueError(f"Character does not meet prerequisites for feat: {feat_name}")
        self.char.feats.append(feat.name)
        return self

    def with_spells(self, *spell_names):
        self.char.spells.extend(spell_names)
        return self

    def with_inventory(self, **items):
        """
        Add items to inventory. Example: with_inventory(Potion_of_Healing=2, Longsword=1)
        """
        self.char.inventory = [
            {"name": name.replace("_", " "), "quantity": qty}
            for name, qty in items.items()
        ]
        return self

    def with_conditions(self, *conditions):
        for condition in conditions:
            self.char.add_condition(condition)
        return self

    def with_narrative(self, title: str = None, notes: str = None):
        if title:
            self.char.title = title
        if notes:
            self.char.notes = notes
        return self

    def build(self) -> Character:
        """
        Finalize and return the fully built Character object.
        """
        return self.char
