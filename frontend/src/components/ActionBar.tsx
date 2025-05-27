import React from 'react';
import { Button, ButtonGroup, H2 } from '@blueprintjs/core';

/**
 * ActionBar component
 * 
 * Displays action buttons for the player
 */
const ActionBar: React.FC = () => {
  return (
    <div className="action-bar">
      <div className="glass-header">
        <H2 className="panel-header">Actions</H2>
      </div>
      
      <div className="action-buttons" style={{ padding: '16px' }}>
        <ButtonGroup fill style={{ marginBottom: '12px' }}>
          <Button 
            icon="arrow-right" 
            text="Move" 
            className="glass-btn"
          />
          <Button 
            icon="comment" 
            text="Talk" 
            className="glass-btn"
          />
          <Button 
            icon="search" 
            text="Examine" 
            className="glass-btn"
          />
        </ButtonGroup>
        
        <ButtonGroup fill style={{ marginBottom: '12px' }}>
          <Button 
            icon="target" 
            text="Attack" 
            className="glass-btn glass-btn-primary"
          />
          <Button 
            icon="flash" 
            text="Cast Spell" 
            className="glass-btn glass-btn-secondary"
          />
          <Button 
            icon="heart" 
            text="Heal" 
            className="glass-btn"
            style={{ 
              backgroundColor: 'rgba(76, 201, 240, 0.3)',
              borderColor: 'rgba(76, 201, 240, 0.5)'
            }}
          />
        </ButtonGroup>
        
        <ButtonGroup fill style={{ marginBottom: '12px' }}>
          <Button 
            icon="box" 
            text="Inventory" 
            className="glass-btn"
          />
          <Button 
            icon="person" 
            text="Character" 
            className="glass-btn"
          />
          <Button 
            icon="cog" 
            text="Settings" 
            className="glass-btn"
          />
        </ButtonGroup>
      </div>
      
      <div style={{ flex: 1 }} />
      
      <div style={{ padding: '0 16px 16px' }}>
        <ButtonGroup fill>
          <Button 
            icon="time" 
            text="End Turn" 
            className="glass-btn glass-btn-danger"
          />
        </ButtonGroup>
      </div>
    </div>
  );
};

export default ActionBar; 