// src/components/TurnIndicator.tsx

import React from 'react';
import { useAppSelector } from '../store/hooks';

/**
 * TurnIndicator shows whose turn it is.
 * Reads the list of actors and the current activeActorId
 * from the Redux store, and displays the active actor's name.
 */
export default function TurnIndicator() {
  // Select the list of actors and the ID of the active actor from Redux
  const actors = useAppSelector(state => state.game.actors);
  const activeId = useAppSelector(state => state.game.activeActorId);

  // Find the active actor's name (or fallback to '...' if not found)
  const activeName = actors.find(a => a.id === activeId)?.name || '...';

  return (
    <div className="turn-indicator">
      Current Turn: {activeName}
    </div>
  );
}
