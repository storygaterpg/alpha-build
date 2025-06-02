import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LOGS_ADD_ENTRIES, LOGS_CLEAR } from '../actionTypes';

// Log entry types
export type LogEntryType = 
  | 'combat' 
  | 'skill' 
  | 'saving-throw' 
  | 'spell' 
  | 'item' 
  | 'narrative' 
  | 'system';

// Log entry interface
export interface LogEntry {
  id: string;
  type: LogEntryType;
  message: string;
  details?: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  timestamp: number;
  // For combat logs
  damage?: number;
  damageType?: string;
  healing?: number;
  success?: boolean;
  criticalHit?: boolean;
  criticalMiss?: boolean;
}

// Logs state interface
export interface LogsState {
  entries: LogEntry[];
  unreadCount: number;
  filter: LogEntryType | 'all';
}

const initialState: LogsState = {
  entries: [],
  unreadCount: 0,
  filter: 'all'
};

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    // Add a single log entry
    addLogEntry: (state, action: PayloadAction<LogEntry>) => {
      state.entries.push(action.payload);
      state.unreadCount += 1;
    },
    
    // Add multiple log entries
    addLogEntries: (state, action: PayloadAction<LogEntry[]>) => {
      state.entries = [...state.entries, ...action.payload];
      state.unreadCount += action.payload.length;
    },
    
    // Clear all logs
    clearLogs: (state) => {
      state.entries = [];
      state.unreadCount = 0;
    },
    
    // Mark logs as read
    markLogsAsRead: (state) => {
      state.unreadCount = 0;
    },
    
    // Set filter
    setLogFilter: (state, action: PayloadAction<LogEntryType | 'all'>) => {
      state.filter = action.payload;
    }
  }
});

// Export actions
export const {
  addLogEntry,
  addLogEntries,
  clearLogs,
  markLogsAsRead,
  setLogFilter
} = logsSlice.actions;

// Thunk actions
export const addGameLogEntries = (entries: LogEntry[]) => ({
  type: LOGS_ADD_ENTRIES,
  payload: entries
});

export const clearGameLogs = () => ({
  type: LOGS_CLEAR
});

export default logsSlice.reducer; 