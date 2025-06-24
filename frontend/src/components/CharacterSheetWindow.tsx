import React from 'react';
import { Rnd } from 'react-rnd';
import { Button, H3, FormGroup } from '@blueprintjs/core';

interface CharacterSheetWindowProps {
  onClose: () => void;
}

const CharacterSheetWindow: React.FC<CharacterSheetWindowProps> = ({ onClose }) => {
  const defaultWidth = 630;
  const defaultHeight = 600;
  const defaultX = window.innerWidth / 2 - defaultWidth / 2;
  const defaultY = window.innerHeight / 2 - defaultHeight / 2;

  // Constants for layout
  const container = {
    width: 540,         // container width in px (treat pt as px for now)
    gap: 4,             // gap between grid items in px
    gridUnit: 540 / 8   // base unit for 8-column grid
  };

  // Sections for sidebar menu and detail view
  const sections = [
    { // Basic Information replaces Character Info
      title: 'Basic Information',
      layout: { gap: container.gap },
      fields: [
        { key: 'characterName', label: 'Character Name' },
        { key: 'alignment',     label: 'Alignment' },
        { key: 'player',        label: 'Player' },
        { key: 'characterLevel',label: 'Character Level' },
        { key: 'deity',         label: 'Deity' },
        { key: 'homeland',      label: 'Homeland' },
        { key: 'campaign',      label: 'Campaign' },
        { key: 'race',          label: 'Race' },
        { key: 'size',          label: 'Size' },
        { key: 'gender',        label: 'Gender' },
        { key: 'age',           label: 'Age' },
        { key: 'height',        label: 'Height' },
        { key: 'weight',        label: 'Weight' },
        { key: 'hair',          label: 'Hair' },
        { key: 'eyes',          label: 'Eyes' }
      ]
    },
    { // Ability Scores
      title: 'Ability Scores',
      layout: { gap: container.gap },
      abilities: [
        { key: 'str', label: 'STR' },
        { key: 'dex', label: 'DEX' },
        { key: 'con', label: 'CON' },
        { key: 'int', label: 'INT' },
        { key: 'wis', label: 'WIS' },
        { key: 'cha', label: 'CHA' }
      ]
    },
    { title: 'Movement',      layout: { gap: container.gap }, fields: [] },
    { title: 'Skills',        layout: { gap: container.gap }, fields: [] },
    { title: 'Languages',     layout: { gap: container.gap }, fields: [] },
    { // Defensive Stats as its own section
      title: 'Defensive Stats',
      layout: { gap: container.gap },
      defensiveStats: [
        { key: 'totalHP',      label: 'Total HP' },
        { key: 'lethalDMG',    label: 'Lethal DMG' },
        { key: 'nonlethalDMG', label: 'Nonlethal DMG' },
        { key: 'ac',           label: 'AC' },
        { key: 'touch',        label: 'Touch' },
        { key: 'flatFooted',   label: 'Flat Footed' },
        { key: 'fortitude',    label: 'Fortitude' },
        { key: 'reflex',       label: 'Reflex' },
        { key: 'will',         label: 'Will' },
        { key: 'cmb',          label: 'CMB' },
        { key: 'cmd',          label: 'CMD' }
      ]
    },
    { title: 'Offensive Stats',layout: { gap: container.gap }, fields: [] },
    { title: 'Feats',         layout: { gap: container.gap }, fields: [] },
    { title: 'Racial Traits', layout: { gap: container.gap }, fields: [] },
    { title: 'Class Features',layout: { gap: container.gap }, fields: [] }
  ];

  // Track which section is selected in the menu
  const [selectedSection, setSelectedSection] = React.useState(sections[0].title);

  // Data for Skills table
  const skillsData = [
    { name: 'Acrobatics', ability: 'Dexterity', trainedOnly: false },
    { name: 'Appraise', ability: 'Intelligence', trainedOnly: false },
    { name: 'Bluff', ability: 'Charisma', trainedOnly: false },
    { name: 'Climb', ability: 'Strength', trainedOnly: false },
    { name: 'Craft', ability: 'Intelligence', trainedOnly: false },
    { name: 'Diplomacy', ability: 'Charisma', trainedOnly: false },
    { name: 'Disable Device', ability: 'Dexterity', trainedOnly: true },
    { name: 'Disguise', ability: 'Charisma', trainedOnly: false },
    { name: 'Escape Artist', ability: 'Dexterity', trainedOnly: false },
    { name: 'Fly', ability: 'Dexterity', trainedOnly: false },
    { name: 'Handle Animal', ability: 'Charisma', trainedOnly: true },
    { name: 'Heal', ability: 'Wisdom', trainedOnly: false },
    { name: 'Intimidate', ability: 'Charisma', trainedOnly: false },
    { name: 'Knowledge Arcana', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Dungeoneering', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Engineering', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Geography', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge History', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Local', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Nature', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Nobility', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Planes', ability: 'Intelligence', trainedOnly: true },
    { name: 'Knowledge Religion', ability: 'Intelligence', trainedOnly: true },
    { name: 'Linguistics', ability: 'Intelligence', trainedOnly: true },
    { name: 'Perception', ability: 'Wisdom', trainedOnly: false },
    { name: 'Perform', ability: 'Charisma', trainedOnly: false },
    { name: 'Profession', ability: 'Wisdom', trainedOnly: true },
    { name: 'Ride', ability: 'Dexterity', trainedOnly: false },
    { name: 'Sense Motive', ability: 'Wisdom', trainedOnly: false },
    { name: 'Sleight of Hand', ability: 'Dexterity', trainedOnly: true },
    { name: 'Spellcraft', ability: 'Intelligence', trainedOnly: true },
    { name: 'Stealth', ability: 'Dexterity', trainedOnly: false },
    { name: 'Survival', ability: 'Wisdom', trainedOnly: false },
    { name: 'Swim', ability: 'Strength', trainedOnly: false },
    { name: 'Use Magic Device', ability: 'Charisma', trainedOnly: true }
  ];

  // Mapping full ability names to abbreviations for display
  const abilityAbbrevMap: { [key: string]: string } = {
    Strength: 'STR',
    Dexterity: 'DEX',
    Intelligence: 'INT',
    Wisdom: 'WIS',
    Charisma: 'CHA'
  };

  // Toggle whether to show full skill details in the table
  const [showDetails, setShowDetails] = React.useState(false);
  // Placeholder list of known languages
  const languagesKnown = ['Common', 'Elfic', 'Dwarven', 'Kobold'];
  // Placeholder data for Movement table
  const movementData = [
    { mode: 'Land', base: '—', armor: '—', tempModifiers: '—', lightLoad: '—', mediumLoad: '—', heavyLoad: '—' },
    { mode: 'Burrow', base: '—', armor: '—', tempModifiers: '—', lightLoad: '—', mediumLoad: '—', heavyLoad: '—' },
    { mode: 'Climb', base: '—', armor: '—', tempModifiers: '—', lightLoad: '—', mediumLoad: '—', heavyLoad: '—' },
    { mode: 'Swim', base: '—', armor: '—', tempModifiers: '—', lightLoad: '—', mediumLoad: '—', heavyLoad: '—' },
    { mode: 'Fly', base: '—', armor: '—', tempModifiers: '—', lightLoad: '—', mediumLoad: '—', heavyLoad: '—' }
  ];
  // Toggle to show or hide full movement details in the table
  const [showMovementDetails, setShowMovementDetails] = React.useState(false);
  // Placeholder feats data for Feats section
  const featsData = [
    {
      name: 'Power Attack',
      categories: ['Combat', 'Core Rulebook'],
      prerequisites: [
        { label: 'Str 13+', met: false },
        { label: 'BAB +1', met: false }
      ],
      benefit: 'Take –1 to hit to gain +2 damage on melee attacks.',
      normal: '',
      special: '',
      notes: ''
    }
  ];

  // Toggle to show or hide full Defensive Stats details
  const [showDefStatsDetails, setShowDefStatsDetails] = React.useState(false);

  // Placeholder data for Racial Traits section
  const traitsData = [
    {
      name: 'Darkvision',
      category: 'Vision',
      race: 'Dwarf',
      passive: true,
      description: 'You can see in the dark up to 60 feet as though it were dim light.',
      fullDescription: 'You can see in darkness (no light source required) up to 60 feet. Beyond this limit, light is treated as dim light. Creatures with darkvision cannot discern color in darkness, only shades of gray.'
    }
  ];

  // State to track which traits are expanded
  const [expandedTraits, setExpandedTraits] = React.useState<{ [key: string]: boolean }>({});
  const toggleTrait = (traitName: string) => {
    setExpandedTraits(prev => ({ ...prev, [traitName]: !prev[traitName] }));
  };

  // Placeholder data for Class Features section
  const featuresData = [
    {
      name: 'Smite Evil',
      level: 'Lvl 1',
      category: 'Combat',
      class: 'Paladin',
      prerequisites: [
        { label: 'Lvl ≥1', met: true },
        { label: 'Cha ≥13', met: false },
        { label: 'Divine Grace', met: true }
      ],
      description: 'Add Charisma bonus to Strength- and Charisma-based attack rolls.',
      benefit: 'Add your Charisma bonus on attack rolls and on damage rolls against evil creatures.',
      usage: '1/day',
      uses: [true, false, false],
      special: 'At 5th level and every five levels thereafter, you gain an additional use per day.'
    }
  ];

  // State to track which features are expanded
  const [expandedFeatures, setExpandedFeatures] = React.useState<{ [key: string]: boolean }>({});
  const toggleFeature = (featureName: string) => {
    setExpandedFeatures(prev => ({ ...prev, [featureName]: !prev[featureName] }));
  };

  return (
    <Rnd
      default={{ x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight }}
      bounds="window"
      minWidth={300}
      minHeight={400}
      className="glass-panel"
      style={{
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div className="glass-header sheet-header" style={{ height: '25px', padding: '0 8px', justifyContent: 'center', position: 'relative' }}>
        <H3 style={{ margin: 0, fontSize: '14px', lineHeight: '25px' }}>Character Sheet</H3>
        <Button icon="cross" minimal small className="sheet-close-btn" onClick={onClose} style={{ width: '25px', height: '25px', padding: '0px', borderRadius: '50%', position: 'absolute', right: '0px', top: '50%', transform: 'translateY(-50%)' }} />
      </div>
      <div className="sheet-body" style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {/* Menu/Detail layout */}
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Sidebar menu */}
          <div className="sheet-sidebar" style={{ minWidth: '150px', marginRight: '1px', padding: 0 }}>
            {sections.map(sec => (
              <div
                key={sec.title}
                className="sheet-menu-item"
                onClick={() => setSelectedSection(sec.title)}
                style={{
                  background: selectedSection === sec.title ? 'var(--glass-overlay)' : 'transparent',
                  color: 'var(--glass-text-primary)',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '0',
                  marginBottom: `${container.gap}px`,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {sec.title}
              </div>
            ))}
          </div>
          {/* Detail panel: full-width glass overlay */}
          <div
            className="sheet-detail-panel"
            style={{
              flex: 1,
              overflow: 'auto',
              background: 'rgba(32, 34, 65, 0.3)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              padding: '0',
              borderRadius: '0',
              boxSizing: 'border-box'
            }}
          >
            {/* Render selected section without card look, with special Skills table */}
            {selectedSection === 'Skills' ? (
              <div className="section-detail" data-section="Skills" style={{ width: '100%' }}>
                <Button minimal small className="sheet-toggle-details-btn" onClick={() => setShowDetails(!showDetails)} style={{ margin: '8px', backgroundColor: 'rgba(32, 34, 65, 0.2)', color: '#ffffff' }}>
                  {showDetails ? 'Hide details' : 'Show details'}
                </Button>
                <table className="skills-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px' }}>Skill</th>
                      {showDetails && <th style={{ textAlign: 'center', padding: '4px' }}>Trained</th>}
                      {showDetails && <th style={{ textAlign: 'center', padding: '4px' }}>Class</th>}
                      {showDetails && <th style={{ textAlign: 'left', padding: '4px' }}>Ability</th>}
                      {showDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Mod</th>}
                      {showDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Ranks</th>}
                      {showDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Bonus</th>}
                      <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillsData.map((s, index) => (
                      <tr key={s.name} style={{ backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '4px' }}>{s.name}</td>
                        {showDetails && <td style={{ padding: '4px', textAlign: 'center' }}>{s.trainedOnly ? 'Yes' : 'No'}</td>}
                        {showDetails && <td style={{ padding: '4px', textAlign: 'center' }}>{s.trainedOnly ? 'Yes' : 'No'}</td>}
                        {showDetails && <td style={{ padding: '4px' }}>{abilityAbbrevMap[s.ability] || s.ability}</td>}
                        {showDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedSection === 'Languages' ? (
              <div className="section-detail" data-section="Languages" style={{ width: '100%' }}>
                <div style={{ padding: '8px', fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>Languages Known</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: '0 16px 8px' }}>
                  {languagesKnown.map(lang => (
                    <li key={lang} style={{ padding: '4px 0', color: 'var(--glass-text-primary)' }}>{lang}</li>
                  ))}
                </ul>
              </div>
            ) : selectedSection === 'Ability Scores' ? (
              <div className="section-detail" data-section="Ability Scores" style={{ width: '100%' }}>
                <table className="ability-scores-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px' }}>Ability</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Score</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Bonus</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Temp Modifiers</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Total Bonus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.find(sec => sec.title === 'Ability Scores')?.abilities?.map((a, index) => (
                      <tr key={a.key} style={{ backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '4px' }}>{a.label}</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedSection === 'Offensive Stats' ? (
              <div className="section-detail" data-section="Offensive Stats" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', color: 'var(--glass-text-primary)' }}>
                  <span>BAB</span><span>0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', color: 'var(--glass-text-primary)' }}>
                  <span>CMB</span><span>0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', color: 'var(--glass-text-primary)' }}>
                  <span>Special Attacks</span><span>—</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />
                <div style={{ padding: '8px', fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>Weapons</div>
                <div className="weapon-card" style={{ margin: '8px', padding: '12px', background: 'var(--glass-overlay)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>Dagger</span>
                    <span style={{ fontSize: '12px', fontStyle: 'italic', fontFamily: 'cursive', color: 'var(--glass-text-primary)' }}>Simple, Light Melee</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', opacity: 0.7, fontSize: '12px', color: 'var(--glass-text-secondary)' }}>
                    <span style={{ flex: 1 }}>Attack Bonus</span>
                    <span style={{ flex: 1 }}>Damage</span>
                    <span style={{ flex: 1 }}>Critical</span>
                    <span style={{ flex: 1 }}>Range</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ flex: 1 }} title="+5 (BAB+3 Str+2)">+5 melee</span>
                    <span style={{ flex: 1 }}>1d8+3</span>
                    <span style={{ flex: 1 }}>19–20/x2</span>
                    <span style={{ flex: 1 }}>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', opacity: 0.7, fontSize: '12px', color: 'var(--glass-text-secondary)', marginTop: '4px' }}>
                    <span style={{ flex: 1 }}>Damage Type</span>
                    <span style={{ flex: 1 }}>Ammunition</span>
                    <span style={{ flex: 1 }}>Weight</span>
                    <span style={{ flex: 1 }}>Cost</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginTop: '4px' }}>
                    <span style={{ flex: 1 }}>slashing</span>
                    <span style={{ flex: 1 }}>—</span>
                    <span style={{ flex: 1 }}>2 lb</span>
                    <span style={{ flex: 1 }}>15 gp</span>
                  </div>
                  <div style={{ padding: '2px 0', opacity: 0.7, fontSize: '12px', color: 'var(--glass-text-secondary)', marginTop: '8px' }}>
                    Special Properties
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>
                    Deadly 2, Agile, Versatile Performance
                  </div>
                </div>
                <div className="weapon-card" style={{ margin: '8px', padding: '12px', background: 'var(--glass-overlay)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>Longsword</span>
                    <span style={{ fontSize: '12px', fontStyle: 'italic', fontFamily: 'cursive', color: 'var(--glass-text-primary)' }}>Martial, One-Handed Melee</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', opacity: 0.7, fontSize: '12px', color: 'var(--glass-text-secondary)' }}>
                    <span style={{ flex: 1 }}>Attack Bonus</span>
                    <span style={{ flex: 1 }}>Damage</span>
                    <span style={{ flex: 1 }}>Critical</span>
                    <span style={{ flex: 1 }}>Range</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ flex: 1 }} title="+?">+0 melee</span>
                    <span style={{ flex: 1 }}>1d8</span>
                    <span style={{ flex: 1 }}>19–20/x2</span>
                    <span style={{ flex: 1 }}>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', opacity: 0.7, fontSize: '12px', color: 'var(--glass-text-secondary)', marginTop: '4px' }}>
                    <span style={{ flex: 1 }}>Damage Type</span>
                    <span style={{ flex: 1 }}>Ammunition</span>
                    <span style={{ flex: 1 }}>Weight</span>
                    <span style={{ flex: 1 }}>Cost</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginTop: '4px' }}>
                    <span style={{ flex: 1 }}>slashing</span>
                    <span style={{ flex: 1 }}>—</span>
                    <span style={{ flex: 1 }}>4 lb</span>
                    <span style={{ flex: 1 }}>15 gp</span>
                  </div>
                  <div style={{ padding: '2px 0', opacity: 0.7, fontSize: '12px', color: 'var(--glass-text-secondary)', marginTop: '8px' }}>
                    Special Properties
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>
                    Versatile
                  </div>
                </div>
              </div>
            ) : selectedSection === 'Movement' ? (
              <div className="section-detail" data-section="Movement" style={{ width: '100%' }}>
                <Button minimal small className="sheet-toggle-movement-details-btn" onClick={() => setShowMovementDetails(!showMovementDetails)} style={{ margin: '8px', backgroundColor: 'rgba(32, 34, 65, 0.2)', color: '#ffffff' }}>
                  {showMovementDetails ? 'Hide details' : 'Show details'}
                </Button>
                <table className="movement-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px' }}>Mode</th>
                      {showMovementDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Base (ft)</th>}
                      {showMovementDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Armor (ft)</th>}
                      {showMovementDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Temp Modifiers (ft)</th>}
                      {showMovementDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Light Load (ft)</th>}
                      {showMovementDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Medium Load (ft)</th>}
                      {showMovementDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Heavy Load (ft)</th>}
                      <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementData.map((m, index) => (
                      <tr key={m.mode} style={{ backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '4px' }}>{m.mode}</td>
                        {showMovementDetails && <td style={{ padding: '4px', textAlign: 'right' }}>{m.base}</td>}
                        {showMovementDetails && <td style={{ padding: '4px', textAlign: 'right' }}>{m.armor}</td>}
                        {showMovementDetails && <td style={{ padding: '4px', textAlign: 'right' }}>{m.tempModifiers}</td>}
                        {showMovementDetails && <td style={{ padding: '4px', textAlign: 'right' }}>{m.lightLoad}</td>}
                        {showMovementDetails && <td style={{ padding: '4px', textAlign: 'right' }}>{m.mediumLoad}</td>}
                        {showMovementDetails && <td style={{ padding: '4px', textAlign: 'right' }}>{m.heavyLoad}</td>}
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedSection === 'Feats' ? (
              <div className="section-detail" data-section="Feats" style={{ width: '100%' }}>
                <div className="feats-list" style={{ overflowY: 'auto', padding: '0 8px' }}>
                  {featsData.map(feat => (
                    <div key={feat.name} className="feat-card" style={{ margin: '8px 0', padding: '8px', background: 'var(--glass-overlay)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>{feat.name}</span>
                        <div>
                          {feat.categories.map(cat => (
                            <span key={cat} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', marginLeft: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>{cat}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '4px 0' }}>
                        {feat.prerequisites.map(pr => (
                          <span key={pr.label} style={{ marginRight: '8px', fontSize: '12px', color: pr.met ? '#0f0' : '#888' }}>
                            {pr.met ? '✓' : '✗'} {pr.label}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '14px', margin: '4px 0', color: 'var(--glass-text-primary)' }}>Benefit: {feat.benefit}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>(click for more…)</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedSection === 'Racial Traits' ? (
              <div className="section-detail" data-section="Racial Traits" style={{ width: '100%' }}>
                {traitsData.map(trait => (
                  <div key={trait.name} className="trait-card" style={{ margin: '8px 0', padding: '8px', background: 'var(--glass-overlay)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>{trait.name}</span>
                      <div>
                        <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', marginRight: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>{trait.category}</span>
                        <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>{trait.race}</span>
                      </div>
                    </div>
                    <div style={{ margin: '4px 0' }}>
                      <span style={{ color: 'var(--glass-text-primary)' }}>{trait.passive ? '✓ Passive' : ''}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--glass-text-primary)', overflow: 'hidden', maxHeight: expandedTraits[trait.name] ? 'none' : '3em' }}>
                      {expandedTraits[trait.name] ? trait.fullDescription : trait.description}
                    </div>
                    <Button minimal small onClick={() => toggleTrait(trait.name)} style={{ marginTop: '4px', color: 'var(--glass-text-secondary)' }}>
                      {expandedTraits[trait.name] ? 'Show less' : 'Show more'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : selectedSection === 'Class Features' ? (
              <div className="section-detail" data-section="Class Features" style={{ width: '100%' }}>
                <div className="features-list" style={{ overflowY: 'auto', padding: '0 8px' }}>
                  {featuresData.map(feat => (
                    <div key={feat.name} className="feature-card" style={{ margin: '8px 0', padding: '8px', background: 'var(--glass-overlay)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>{feat.name}</span>
                        <div>
                          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', marginLeft: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>{feat.level}</span>
                          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', marginLeft: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>{feat.category}</span>
                          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 4px', marginLeft: '4px', fontSize: '12px', color: 'var(--glass-text-primary)' }}>{feat.class}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '4px 0' }}>
                        {feat.prerequisites.map(pr => (
                          <span key={pr.label} style={{ marginRight: '8px', fontSize: '12px', color: pr.met ? '#0f0' : '#888' }}>
                            {pr.met ? '✓' : '✗'} {pr.label}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '14px', margin: '4px 0', color: 'var(--glass-text-primary)' }}>Description: {feat.description}</div>
                      <div style={{ fontSize: '14px', margin: '4px 0', color: 'var(--glass-text-primary)' }}>Benefit: {feat.benefit}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>(click for more…)</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedSection !== 'Defensive Stats' ? (
              sections.filter(sec => sec.title === selectedSection).map(section => (
                <div key={section.title} className="section-detail" data-section={section.title} style={{ width: '100%', marginBottom: 12 }}>
                  {section.fields?.map(f => (
                    <div key={f.key} style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--glass-text-primary)' }}>{f.label}</span>
                      <span style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>—</span>
                    </div>
                  ))}
                  {section.abilities?.map(a => (
                    <div key={a.key} style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{a.label}</span>
                      <span style={{ fontSize: '16px' }}>0</span>
                    </div>
                  ))}
                </div>
              ))
            ) : selectedSection === 'Defensive Stats' ? (
              <div className="section-detail" data-section="Defensive Stats" style={{ width: '100%', padding: '0 8px' }}>
                <Button minimal small className="sheet-toggle-defstats-details-btn" onClick={() => setShowDefStatsDetails(!showDefStatsDetails)} style={{ margin: '8px', backgroundColor: 'rgba(32, 34, 65, 0.2)', color: '#ffffff' }}>
                  {showDefStatsDetails ? 'Hide details' : 'Show details'}
                </Button>
                {/* Armor Class & Variants */}
                <table className="ac-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px' }}>Field</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Base (10)</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Armor Bonus</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Shield Bonus</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Dex Mod*</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Size Mod</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Natural Armor</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Deflection</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Dodge</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Misc</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '4px' }}>Armor Class</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>10</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                    </tr>
                    <tr>
                      <td style={{ padding: '4px' }}>Touch AC</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>10</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                    </tr>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '4px' }}>Flat-Footed</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>10</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>—</td>}
                      {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                    </tr>
                  </tbody>
                </table>
                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />
                {/* Saving Throws */}
                <table className="saves-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px' }}>Save</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Base Save</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Ability Mod</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Magic Mod</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Misc Mod</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Temp Mod</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {['Fort', 'Ref', 'Will'].map((save, idx) => (
                      <tr key={save} style={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                        <td style={{ padding: '4px' }}>{save}</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />
                {/* Combat Maneuvers */}
                <table className="cmb-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px' }}>Field</th>
                      <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Base Atk (BAB)</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Str Mod</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Dex Mod†</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Size Mod</th>}
                      {showDefStatsDetails && <th style={{ textAlign: 'right', padding: '4px' }}>Misc Mod</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {['CMB', 'CMD'].map((cm, idx) => (
                      <tr key={cm} style={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                        <td style={{ padding: '4px' }}>{cm}</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>0</td>
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                        {showDefStatsDetails && <td style={{ padding: '4px', textAlign: 'right' }}>0</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              sections.filter(sec => sec.title === selectedSection).map(section => (
                <div key={section.title} className="section-detail" data-section={section.title} style={{ width: '100%', marginBottom: 12 }}>
                  {section.fields?.map(f => (
                    <div key={f.key} style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--glass-text-primary)' }}>{f.label}</span>
                      <span style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>—</span>
                    </div>
                  ))}
                  {section.abilities?.map(a => (
                    <div key={a.key} style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{a.label}</span>
                      <span style={{ fontSize: '16px' }}>0</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Rnd>
  );
};

export default CharacterSheetWindow; 