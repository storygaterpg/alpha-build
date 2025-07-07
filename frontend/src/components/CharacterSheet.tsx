import React from 'react';
import { Card, H2, H4, ProgressBar, Tabs, Tab } from '@blueprintjs/core';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * CharacterSheet component
 * 
 * Displays detailed character information
 */
const CharacterSheet: React.FC = () => {
  const playerName = useSelector((state: RootState) => state.game.playerName);
  const player = useSelector((state: RootState) => state.game.player);
  
  return (
    <div className="character-sheet" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%', 
      width: '100%',
      padding: '10px',
      overflow: 'hidden'
    }}>
      <H2 style={{ marginBottom: '10px' }}>Character</H2>
      
      {player ? (
        <div className="character-content" style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Card style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                backgroundColor: '#e1e5e8', 
                marginRight: '15px',
                backgroundImage: player.imageUrl ? `url(${player.imageUrl})` : 'none',
                backgroundSize: 'cover',
                borderRadius: '4px'
              }} />
              <div>
                <H4 style={{ margin: 0 }}>{playerName || 'Unknown Adventurer'}</H4>
                <div>Level {player.level} Adventurer</div>
                <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                  XP: {player.experience}/{player.nextLevelExperience}
                </div>
              </div>
            </div>
          </Card>
          
          <Card style={{ marginBottom: '15px' }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Health</span>
                <span>{player.stats.health}/{player.stats.maxHealth}</span>
              </div>
              <ProgressBar 
                value={player.stats.health / player.stats.maxHealth} 
                intent="success"
                stripes={false}
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mana</span>
                <span>{player.stats.mana}/{player.stats.maxMana}</span>
              </div>
              <ProgressBar 
                value={player.stats.mana / player.stats.maxMana} 
                intent="primary"
                stripes={false}
              />
            </div>
          </Card>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Tabs id="character-tabs" renderActiveTabPanelOnly>
              <Tab 
                id="stats" 
                title="Stats" 
                panel={
                  <div style={{ overflowY: 'auto', height: '100%' }}>
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td>Strength</td>
                          <td>{player.stats.strength}</td>
                        </tr>
                        <tr>
                          <td>Dexterity</td>
                          <td>{player.stats.dexterity}</td>
                        </tr>
                        <tr>
                          <td>Intelligence</td>
                          <td>{player.stats.intelligence}</td>
                        </tr>
                        <tr>
                          <td>Constitution</td>
                          <td>{player.stats.constitution}</td>
                        </tr>
                        <tr>
                          <td>Wisdom</td>
                          <td>{player.stats.wisdom}</td>
                        </tr>
                        <tr>
                          <td>Charisma</td>
                          <td>{player.stats.charisma}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                } 
              />
              <Tab 
                id="skills" 
                title="Skills" 
                panel={
                  <div style={{ overflowY: 'auto', height: '100%' }}>
                    {player.skills.length > 0 ? (
                      player.skills.map(skill => (
                        <Card key={skill.id} style={{ marginBottom: '10px' }}>
                          <H4>{skill.name}</H4>
                          <div>{skill.description}</div>
                          <div style={{ marginTop: '5px' }}>
                            Level: {skill.level}/{skill.maxLevel}
                          </div>
                        </Card>
                      ))
                    ) : (
                      <p>No skills learned yet.</p>
                    )}
                  </div>
                } 
              />
              <Tab 
                id="equipment" 
                title="Equipment" 
                panel={
                  <div style={{ overflowY: 'auto', height: '100%' }}>
                    <p>Equipment slots will be displayed here.</p>
                  </div>
                } 
              />
            </Tabs>
          </div>
        </div>
      ) : (
        <Card>
          <p>Character data is loading...</p>
        </Card>
      )}
    </div>
  );
};

export default CharacterSheet; 