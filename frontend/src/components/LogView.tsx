import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { clearLogUnread, toggleLogFilter, setLogFilters } from '../store/slices/gameSlice';
import { LogEntry } from '../store/types';
import { Popover, Menu, MenuItem, Icon } from '@blueprintjs/core';

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
      {/* Floating filter dropdown */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 100 }}>
        <Popover
          minimal
          position="bottom-right"
          popoverClassName="toolbar-dropdown"
          content={
            <Menu>
              {Object.entries(filters).map(([type, enabled]) => (
                <MenuItem
                  key={type}
                  text={type.charAt(0).toUpperCase() + type.slice(1)}
                  icon={enabled ? 'tick' : 'blank'}
                  active={enabled}
                  shouldDismissPopover={false}
                  onClick={() => dispatch(toggleLogFilter(type as LogEntry['type']))}
                />
              ))}
            </Menu>
          }
        >
          <button className="glass-btn" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon="filter" />
          </button>
        </Popover>
      </div>
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