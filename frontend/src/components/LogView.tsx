import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { clearLogUnread } from '../store/slices/gameSlice';

/**
 * LogView component
 * 
 * Displays game logs and events
 */
const LogView: React.FC = () => {
  const dispatch = useDispatch();
  const logs = useSelector((state: RootState) => state.game.logs.entries);
  
  // Clear unread logs when component mounts
  useEffect(() => {
    dispatch(clearLogUnread());
  }, [dispatch]);

  // Get color for log type
  const getLogColor = (type: string): string => {
    switch (type) {
      case 'combat': return 'var(--danger-color)';
      case 'loot': return 'var(--success-color)';
      case 'quest': return 'var(--primary-color)';
      case 'achievement': return 'var(--warning-color)';
      case 'error': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="log-panel">
      <div className="scrollable-content log-messages" style={{ padding: '16px', height: '100%' }}>
        {logs.length === 0 ? (
          <p><em>No game events recorded yet.</em></p>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className="panel-card log-entry"
              style={{
                borderLeft: `3px solid ${getLogColor(log.type)}`
              }}
            >
              <span style={{ color: getLogColor(log.type), fontWeight: 'bold' }}>
                [{log.type.toUpperCase()}]
              </span>{' '}
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogView; 