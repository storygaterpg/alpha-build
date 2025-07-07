import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NOTIFICATION_SHOW_ERROR, NOTIFICATION_CLEAR_ERROR } from '../actionTypes';
import { Intent } from '@blueprintjs/core';

// Notification types
export type NotificationType = 'error' | 'warning' | 'success' | 'info';

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  details?: string;
  intent: Intent;
  icon?: string;
  timestamp: number;
  duration?: number; // milliseconds, undefined means persistent until dismissed
}

// Notifications state interface
export interface NotificationsState {
  notifications: Notification[];
  errorCount: number;
}

const initialState: NotificationsState = {
  notifications: [],
  errorCount: 0
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a notification
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${state.notifications.length}`,
        timestamp: Date.now(),
        ...action.payload
      };
      
      state.notifications.push(notification);
      
      if (notification.type === 'error') {
        state.errorCount += 1;
      }
    },
    
    // Remove a notification by ID
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      
      if (index >= 0) {
        if (state.notifications[index].type === 'error') {
          state.errorCount = Math.max(0, state.errorCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },
    
    // Clear all notifications
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.errorCount = 0;
    },
    
    // Clear notifications by type
    clearNotificationsByType: (state, action: PayloadAction<NotificationType>) => {
      if (action.payload === 'error') {
        state.errorCount = 0;
      }
      
      state.notifications = state.notifications.filter(n => n.type !== action.payload);
    }
  }
});

// Export actions
export const {
  addNotification,
  removeNotification,
  clearAllNotifications,
  clearNotificationsByType
} = notificationsSlice.actions;

// Helper functions to create specific notification types
export const showError = (message: string, details?: string, duration?: number) => ({
  type: NOTIFICATION_SHOW_ERROR,
  payload: {
    message,
    details,
    type: 'error' as NotificationType,
    intent: Intent.DANGER,
    icon: 'error',
    duration
  }
});

export const clearError = () => ({
  type: NOTIFICATION_CLEAR_ERROR
});

export default notificationsSlice.reducer; 