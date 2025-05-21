// src/components/ActionBar.tsx

import React from 'react';
import { useAppSelector } from '../store/hooks';
import wsClient from '../network/WebSocketClient';

/**
 * ActionBar: renders the current player's available actions.
 * Includes buttons for Move, Attack, End Turn, and Character Sheet.
 * Disables itself when it's not the player's turn.
 */
export default function ActionBar() {
  // List of actions the active actor can perform this turn
  const actions = useAppSelector(state => state.game.availableActions);
  // ID of the actor whose turn it is
  const activeActorId = useAppSelector(state => state.game.activeActorId);
  // This client's player ID
  const playerId = useAppSelector(state => state.game.playerId);

  const isMyTurn = activeActorId === playerId;

  return (
    <div className="action-bar">
      { !isMyTurn ? (
        <button disabled>Waiting...</button>
      ) : (
        <>
          {actions.map(action => (
            <button
              key={action}
              onClick={() => wsClient.send('requestAction', { action })}
            >
              {action}
            </button>
          ))}
          <button
            onClick={() => wsClient.send('requestSheet', { actorId: playerId })}
          >
            Character Sheet
          </button>
        </>
      )}
    </div>
  );
}
