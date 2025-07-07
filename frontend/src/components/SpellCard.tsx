import React, { useState, useMemo } from 'react';
import { Button } from '@blueprintjs/core';

export interface Spell {
  id: string;
  name: string;
  school: string;
  level: number;
  descriptor: string;
  page: string;
  time: string;
  duration: string;
  range: string;
  area: string;
  save: string;
  sr: string;
  components: string;
  descriptionShort: string;
  description?: string;
}

interface SpellCardProps {
  spell: Spell;
  /** number of prepared instances (for prepared tab) */
  preparedCount?: number;
  /** callback to prepare this spell */
  onTogglePrepare?: () => void;
  /** callback to cast this spell */
  onToggleCast?: () => void;
}

const SpellCard: React.FC<SpellCardProps> = ({ spell, preparedCount, onTogglePrepare, onToggleCast }) => {
  const [expanded, setExpanded] = useState(false);

  // Compute ordinal suffix for level
  const ordinalSuffix = (n: number): string => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  // Format components with dots
  const formatComponents = (text: string) => text.split(',').map(s => s.trim()).join(' • ');

  // Positions for sparkles around Cast button
  const sparklePositions = [
    { top: '-4px', left: '10%' },
    { top: '-4px', left: '80%' },
    { top: '40%', right: '-4px' },
    { bottom: '-4px', left: '20%' },
    { bottom: '-4px', right: '20%' },
    { top: '40%', left: '-4px' },
  ];

  // Generate unique sparkle delays by segmenting the cycle and adding jitter
  const sparkleDelays = useMemo(() => {
    const period = 1.5; // total animation cycle in seconds
    const count = sparklePositions.length;
    const segment = period / count;
    return sparklePositions.map((_, idx) => {
      const low = idx * segment;
      const randomDelay = low + Math.random() * segment;
      return `${randomDelay.toFixed(2)}s`;
    });
  }, [sparklePositions.length]);

  return (
    <div className="spell-card" style={{ margin: '8px 0', background: 'var(--glass-overlay)', borderRadius: '4px', padding: '12px' }}>
      {/* Header: name, level/school, page, dynamic dots, and action button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>{spell.name}</span>
        <span style={{ fontSize: '17px', fontWeight: 'normal', color: 'var(--glass-text-primary)' }}>
          {ordinalSuffix(spell.level)}, {spell.school} ({spell.descriptor})
        </span>
        <span style={{ fontSize: '11px', color: 'var(--glass-text-secondary)' }}>{spell.page}</span>
        {/* Prepared dots whenever there are prepared instances */}
        {(preparedCount ?? 0) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px' }}>
            {Array.from({ length: preparedCount! }).map((_, i) => (
              <span key={i} style={{
                width: '12px', height: '12px', margin: '0 2px', borderRadius: '50%',
                background: 'radial-gradient(circle at center, #6a11cb, #2575fc)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 0 6px rgba(106,17,203,0.7)'
              }} />
            ))}
          </div>
        )}
        {/* Action button: prepare or cast */}
        {onTogglePrepare && <Button minimal small icon="plus" onClick={onTogglePrepare} />}
        {onToggleCast && (
          <div className="cast-button-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            <Button className="cast-button" minimal small text="Cast" onClick={onToggleCast} />
            {sparklePositions.map((pos, i) => (
              <span
                key={i}
                className="sparkle"
                style={{ ...pos, animationDelay: sparkleDelays[i] }}
              />
            ))}
          </div>
        )}
      </div>
      <hr style={{ borderColor: 'var(--glass-border)', margin: '4px 0' }} />

      {/* Attributes grid: two rows */}
      <div style={{ display: 'flex', flexWrap: 'wrap', color: 'var(--glass-text-secondary)', fontSize: '0.85rem' }}>
        {/* Field labels */}
        <div style={{ display: 'flex', width: '100%' }}>
          <div style={{ flex: 1 }}>Casting time</div>
          <div style={{ flex: 1 }}>Duration</div>
          <div style={{ flex: 1 }}>Range</div>
          <div style={{ flex: 1 }}>Area/Target</div>
        </div>
        {/* Field values */}
        <div style={{ display: 'flex', width: '100%', marginTop: '2px', color: 'var(--glass-text-primary)' }}>
          <div style={{ flex: 1 }}>{spell.time}</div>
          <div style={{ flex: 1 }}>{spell.duration}</div>
          <div style={{ flex: 1 }}>{spell.range}</div>
          <div style={{ flex: 1 }}>{spell.area}</div>
        </div>
      </div>
      <hr style={{ borderColor: 'var(--glass-border)', margin: '4px 0' }} />

      {/* Secondary grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', color: 'var(--glass-text-secondary)', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', width: '100%' }}>
          <div style={{ flex: 1 }}>Saving throw</div>
          <div style={{ flex: 1 }}>Spell resistance</div>
          <div style={{ flex: 2 }}>Components</div>
        </div>
        <div style={{ display: 'flex', width: '100%', marginTop: '2px', color: 'var(--glass-text-primary)' }}>
          <div style={{ flex: 1 }}>{spell.save}</div>
          <div style={{ flex: 1 }}>{spell.sr}</div>
          <div style={{ flex: 2 }}>{formatComponents(spell.components)}</div>
        </div>
      </div>
      <hr style={{ borderColor: 'var(--glass-border)', margin: '4px 0' }} />

      {/* Description toggle */}
      {!expanded ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--glass-text-secondary)', margin: 0, flex: 1 }}>{spell.descriptionShort}</p>
          <Button minimal small icon="chevron-down" onClick={() => setExpanded(true)} />
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--glass-text-primary)' }}>Description:</span>
            <Button minimal small icon="chevron-up" onClick={() => setExpanded(false)} />
          </div>
          <p style={{ color: 'var(--glass-text-secondary)', margin: '4px 0' }}>{spell.description}</p>
        </div>
      )}
    </div>
  );
};

export default SpellCard; 