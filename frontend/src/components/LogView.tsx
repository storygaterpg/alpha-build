import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { clearLogUnread, toggleLogFilter, setLogFilters } from '../store/slices/gameSlice';
import { LogEntry } from '../store/types';

/**
 * LogView component
 * 
 * Displays game logs and events
 */
const LogView: React.FC = () => {
  const dispatch = useDispatch();
  const logs = useSelector((state: RootState) => state.game.logs.entries);
  const filters = useSelector((state: RootState) => state.game.logs.filters);
  const visibleLogs = logs.filter((log) => filters[log.type]);
  
  // Clear unread logs when component mounts
  useEffect(() => {
    dispatch(clearLogUnread());
  }, [dispatch]);

  // Load saved filters on mount
  useEffect(() => {
    const saved = localStorage.getItem('logFilters');
    if (saved) {
      try {
        dispatch(setLogFilters(JSON.parse(saved)));
      } catch {}
    }
  }, [dispatch]);

  // Persist filters whenever they change
  useEffect(() => {
    localStorage.setItem('logFilters', JSON.stringify(filters));
  }, [filters]);

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
    <div className="log-panel" style={{ 
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Floating filter button */}
      <details style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 100 }}>
        <summary
          aria-label="Log filters"
          title="Filters"
          style={{ cursor: 'pointer', background: 'var(--glass-overlay)', color: 'var(--glass-text-primary)', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(var(--glass-blur))', WebkitBackdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)' }}
        >
          {/* Inline funnel icon */}
          <svg
            aria-hidden="true"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <path d="M3 5h18v2l-7 8v5l-4-2v-3l-7-8V5z" />
          </svg>
        </summary>
        <div style={{ background: 'var(--glass-overlay)', padding: '8px', borderRadius: '4px', marginTop: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', backdropFilter: 'blur(var(--glass-blur))', WebkitBackdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)' }}>
          {Object.entries(filters).map(([type, enabled]) => (
            <label key={type} style={{ display: 'block', color: getLogColor(type), fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => dispatch(toggleLogFilter(type as LogEntry['type']))}
                style={{ marginRight: '4px' }}
              />{type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </details>
      {/* Log messages */}
      <div className="scrollable-content log-messages" style={{ 
        padding: '5px', 
        height: '100%',
        flex: 1,
        overflowY: 'auto' 
      }}>
        {visibleLogs.length === 0 ? (
          <p><em>No game events recorded yet.</em></p>
        ) : (
          visibleLogs.map((log) => (
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