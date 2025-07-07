import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { Toaster, Position, ToastProps, IconName } from '@blueprintjs/core';
import { removeNotification } from '../store/slices/notificationSlice';

/**
 * Create a singleton Toaster instance
 */
export const NotificationsToaster = Toaster.create({
  className: 'game-notifications-toaster',
  position: Position.TOP_RIGHT,
  maxToasts: 5
});

/**
 * NotificationsDisplay
 *
 * Component that monitors the notifications state and displays
 * toast notifications accordingly. Handles removal of notifications
 * after they're dismissed or their duration expires.
 */
const NotificationsDisplay: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(state => state.notifications.notifications);
  
  // Show toasts whenever notifications change
  useEffect(() => {
    // Process any notifications that haven't been displayed yet
    notifications.forEach(notification => {
      // Check if this notification has already been shown
      const existingToast = NotificationsToaster.getToasts()
        .find(toast => toast.key === notification.id);
        
      if (!existingToast) {
        // Convert our notification to a toast prop object
        const toast: ToastProps = {
          message: (
            <div>
              <h4>{notification.message}</h4>
              {notification.details && <p>{notification.details}</p>}
            </div>
          ),
          intent: notification.intent,
          icon: notification.icon as IconName,
          timeout: notification.duration || 0, // 0 means persistent
          onDismiss: () => {
            dispatch(removeNotification(notification.id));
          }
        };
        
        // Show the toast with key as separate parameter
        NotificationsToaster.show(toast, notification.id);
      }
    });
    
    // Remove any toasts that no longer exist in the store
    NotificationsToaster.getToasts().forEach(toast => {
      const notificationExists = notifications.some(n => n.id === toast.key);
      if (!notificationExists && toast.key) {
        NotificationsToaster.dismiss(toast.key.toString());
      }
    });
  }, [notifications, dispatch]);

  // This component doesn't render anything directly
  return null;
};

export default NotificationsDisplay; 