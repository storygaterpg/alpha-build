import React from 'react';
import { Card, H2, Tag, ProgressBar } from '@blueprintjs/core';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { GamePhase } from '../store/types';

/**
 * TurnIndicator component
 * 
 * Displays the current game phase, round, and active actor
 */
const TurnIndicator: React.FC = () => {
  const turnState = useSelector((state: RootState) => state.game.turnState);
  const actors = useSelector((state: RootState) => state.game.actors);
  const player = useSelector((state: RootState) => state.game.player);
  
  // Get the name of the current actor
  const currentActorName = turnState.currentActorId 
    ? (actors[turnState.currentActorId]?.name || 'Unknown') 
    : 'None';
  
  // Check if it's the player's turn
  const isPlayerTurn = player && turnState.currentActorId === player.id;
  
  // Get the phase display name
  const getPhaseDisplay = (phase: GamePhase): string => {
    switch (phase) {
      case GamePhase.EXPLORATION: return 'Exploration';
      case GamePhase.COMBAT: return 'Combat';
      case GamePhase.DIALOGUE: return 'Dialogue';
      case GamePhase.MENU: return 'Menu';
      default: return 'Unknown';
    }
  };
  
  // Get the tag class for the phase
  const getPhaseTagClass = (phase: GamePhase): string => {
    switch (phase) {
      case GamePhase.EXPLORATION: return 'success';
      case GamePhase.COMBAT: return 'danger';
      case GamePhase.DIALOGUE: return 'warning';
      default: return '';
    }
  };

  return (
    <div className="turn-indicator">
      <div className="glass-header">
        <H2 className="panel-header">Turn Status</H2>
      </div>
      
      <div className="glass-card" style={{ margin: '16px' }}>
        <div className="status-row">
          <span>Phase:</span>
          <span className={`glass-tag ${getPhaseTagClass(turnState.phase)}`}>
            {getPhaseDisplay(turnState.phase)}
          </span>
        </div>
        
        {turnState.phase === GamePhase.COMBAT && (
          <>
            <div className="status-row" style={{ marginTop: '12px' }}>
              <span>Round:</span>
              <span className="glass-tag">{turnState.round}</span>
            </div>
            
            <div className="status-row" style={{ marginTop: '12px' }}>
              <span>Current Turn:</span>
              <span className={`glass-tag ${isPlayerTurn ? 'warning' : ''}`}>
                {currentActorName}
              </span>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <span>Initiative Order:</span>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                marginTop: '8px',
                gap: '6px'
              }}>
                {turnState.initiative.map((actorId, index) => (
                  <span 
                    key={actorId} 
                    className={`glass-tag ${actorId === turnState.currentActorId ? 'warning' : ''}`}
                  >
                    {index + 1}. {actors[actorId]?.name || 'Unknown'}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      
      <div style={{ flex: 1 }} />
      
      {isPlayerTurn && turnState.phase === GamePhase.COMBAT && (
        <div className="glass-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ marginBottom: '8px' }}>Turn Timer</div>
          <div style={{ 
            height: '8px',
            background: 'rgba(248, 150, 30, 0.3)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '70%',
              height: '100%',
              background: 'rgba(248, 150, 30, 0.8)',
              borderRadius: '4px',
              animation: 'pulse 2s infinite'
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnIndicator; 