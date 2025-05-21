// src/components/LogPanel.tsx

import React from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearLogs } from '../store/gameSlice';

/**
 * LogPanel shows chronological game logs and allows clearing.
 */
export default function LogPanel() {
  const logs = useAppSelector(state => state.game.logs);
  const dispatch = useAppDispatch();

  return (
    <div className="log-panel">
      <div className="log-header">
        <strong>Game Log</strong>
        <button onClick={() => dispatch(clearLogs())}>Clear</button>
      </div>
      <div className="log-entries">
        {logs.map((entry, idx) => (
          <div key={idx} className="log-entry">
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
