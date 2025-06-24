import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Button, H3, InputGroup } from '@blueprintjs/core';
import SpellCard, { Spell } from './SpellCard';

interface SpellsWindowProps {
  onClose: () => void;
}

const SpellsWindow: React.FC<SpellsWindowProps> = ({ onClose }) => {
  const defaultWidth = 630;
  const defaultHeight = 600;
  const defaultX = window.innerWidth / 2 - defaultWidth / 2;
  const defaultY = window.innerHeight / 2 - defaultHeight / 2;

  const sections = [
    'Spells Known',
    'Spells Prepared',
    'Spell-like Abilities',
    'DC per Level',
    'Spells per Level',
  ];
  const [selectedSection, setSelectedSection] = useState(sections[0]);

  const levels = Array.from({ length: 10 }, (_, i) => i);
  const levelTabs: (number | string)[] = ['All', ...levels];
  const [selectedLevel, setSelectedLevel] = useState<number | string>('All');

  const allSchools = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
  const [selectedSchools, setSelectedSchools] = useState<string[]>(allSchools);
  const toggleSchool = (sch: string) => {
    setSelectedSchools(prev => prev.includes(sch) ? prev.filter(s => s !== sch) : [...prev, sch]);
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  let searchRegex: RegExp;
  try { searchRegex = new RegExp(searchQuery, 'i'); } catch { searchRegex = /.*/; }

  // Sample spell data
  const spellsKnown: Spell[] = [
    {
      id: 'fireball', name: 'Fireball', school: 'Evocation', level: 3,
      descriptor: 'Fire', page: 'CRB p. 237', time: '1 standard', duration: 'Instantaneous',
      range: 'Long (400 ft +40/level)', area: '20-ft. radius', save: 'Reflex half', sr: 'Yes',
      components: 'V,S,M (bat guano, sulfur)', descriptionShort: 'A fireball is an explosion of flame that detonates with a low roar…',
      description: 'A fireball is an explosion of flame that detonates with a low roar and deals 1d6 points of fire damage per caster level (max +10d6)…'
    }
  ];
  // Track how many times each spell is prepared
  const [preparedCounts, setPreparedCounts] = useState<Record<string, number>>({});
  // Prepare a spell: increment its prepared count
  const handlePrepare = (spell: Spell) => {
    setPreparedCounts(prev => ({ ...prev, [spell.id]: (prev[spell.id] ?? 0) + 1 }));
  };
  // Cast a spell: decrement its prepared count and prefill chat
  const handleCast = (spell: Spell) => {
    setPreparedCounts(prev => {
      const newCount = (prev[spell.id] ?? 0) - 1;
      return { ...prev, [spell.id]: newCount > 0 ? newCount : 0 };
    });
    // Prefill chat input with cast message
    window.dispatchEvent(new CustomEvent('prefillChat', { detail: `I cast ${spell.name}` }));
  };

  return (
    <Rnd
      default={{ x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight }}
      bounds="window"
      minWidth={300}
      minHeight={400}
      className="glass-panel"
      style={{ zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="glass-header sheet-header" style={{ height: '25px', padding: '0 8px', position: 'relative', justifyContent: 'center' }}>
        <H3 style={{ margin: 0, fontSize: '14px', lineHeight: '25px' }}>Spells</H3>
        <Button
          icon="cross"
          minimal small
          className="sheet-close-btn"
          onClick={onClose}
          style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Sidebar */}
        <div className="sheet-sidebar" style={{ minWidth: '150px', padding: 0, marginRight: '1px' }}>
          {sections.map(sec => (
            <div
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className="sheet-menu-item"
              style={{
                padding: '8px', cursor: 'pointer', color: 'var(--glass-text-primary)',
                background: selectedSection === sec ? 'var(--glass-overlay)' : 'transparent',
                marginBottom: '4px'
              }}
            >{sec}</div>
          ))}
        </div>
        {/* Detail panel */}
        <div className="sheet-detail-panel" style={{ flex: 1, overflow: 'auto', background: 'rgba(32,34,65,0.3)', padding: '8px' }}>
          {/* Top controls */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ color: 'var(--glass-text-primary)', fontWeight: 'bold', fontSize: '16px' }}>{selectedSection}</div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <InputGroup
                placeholder=""
                leftIcon="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff' }}
              />
            </div>
            <details style={{ position: 'relative' }}>
              <summary style={{ cursor: 'pointer', background: 'var(--glass-overlay)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', display: 'flex', alignItems: 'center' }} title="Filters">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2l-7 8v5l-4-2v-3l-7-8V5z"/></svg>
              </summary>
              <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--glass-overlay)', padding: '8px', border: '1px solid var(--glass-border)', borderRadius: '4px', marginTop: '4px', zIndex: 1001 }}>
                {allSchools.map(sch => (
                  <label key={sch} style={{ display: 'block', color: 'var(--glass-text-primary)' }}>
                    <input type="checkbox" checked={selectedSchools.includes(sch)} onChange={() => toggleSchool(sch)} style={{ marginRight: '4px' }}/>{sch}
                  </label>
                ))}
              </div>
            </details>
          </div>
          {/* Level tabs */}
          {(selectedSection === 'Spells Known' || selectedSection === 'Spells Prepared') && (
            <div style={{ display: 'flex', margin: '0 -8px 8px -8px', borderBottom: '1px solid var(--glass-border)' }}>
              {levelTabs.map((lv, idx) => {
                const isActive = selectedLevel === lv;
                const available = lv === 'All' || levels.includes(lv as number);
                const label = lv === 'All' ? 'All' : `${lv}th`;
                return (
                  <Button
                    key={String(lv)} minimal small disabled={!available}
                    onClick={() => setSelectedLevel(lv)}
                    style={{ flex: 1, padding: '6px 0', background: isActive ? 'var(--glass-overlay)' : 'transparent', border: 'none', borderBottom: isActive ? '2px solid var(--glass-text-primary)' : '2px solid transparent', borderLeft: !isActive && idx>0 ? '1px solid var(--glass-border)' : 'none', borderTopLeftRadius: isActive ? 'var(--glass-border-radius)' : 0, borderTopRightRadius: isActive ? 'var(--glass-border-radius)' : 0, color: isActive ? 'var(--glass-text-primary)' : 'var(--glass-text-secondary)' }}
                  >{label}</Button>
                );
              })}
            </div>
          )}
          {/* Spell cards */}
          <div>
            {['Spells Known','Spells Prepared'].includes(selectedSection) && (() => {
              const list = selectedSection === 'Spells Known'
                ? spellsKnown
                : spellsKnown.filter(sp => (preparedCounts[sp.id] ?? 0) > 0);
              return list
                .filter(sp => selectedLevel === 'All' || sp.level === selectedLevel)
                .filter(sp => selectedSchools.includes(sp.school))
                .filter(sp => searchRegex.test(sp.name) || searchRegex.test(sp.description || ''))
                .map(sp => (
                  <SpellCard
                    key={sp.id}
                    spell={sp}
                    {...(selectedSection === 'Spells Known'
                      ? {
                          preparedCount: preparedCounts[sp.id] ?? 0,
                          onTogglePrepare: () => handlePrepare(sp)
                        }
                      : {
                          preparedCount: preparedCounts[sp.id] ?? 0,
                          onToggleCast: () => handleCast(sp),
                        }
                    )}
                  />
                ));
            })()}
          </div>
        </div>
      </div>
    </Rnd>
  );
};

export default SpellsWindow; 