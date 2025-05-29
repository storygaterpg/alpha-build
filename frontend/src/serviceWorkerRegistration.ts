import { Workbox } from 'workbox-window';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from './App';

// Safe wrapper for using AppToaster
const safeShowToast = (props: any) => {
  if (AppToaster && typeof AppToaster.show === 'function') {
    try {
      AppToaster.show(props);
    } catch (error) {
      console.error('Failed to show toast:', error);
    }
  } else {
    console.log('Toast message (AppToaster not available):', props.message);
  }
};

// Check if service workers are supported
const isServiceWorkerSupported = 'serviceWorker' in navigator;

/**
 * Register the service worker
 */
export function registerServiceWorker(): void {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser');
    return;
  }

  // For simplicity, we'll skip service worker registration completely
  // In a real app, this would use environment variables to check for production
  const isProduction = false; // Hardcoded to false to skip service worker in development
  
  if (!isProduction) {
    console.log('Service worker registration skipped in development mode');
    return;
  }

  const swUrl = '/sw.js';

  try {
    const wb = new Workbox(swUrl);

    // Add event listeners for various service worker states
    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        // Show update notification
        safeShowToast({
          message: 'New content is available! Please refresh to update.',
          intent: Intent.SUCCESS,
          icon: 'refresh',
          timeout: 0,
          action: {
            text: 'Refresh',
            onClick: () => {
              window.location.reload();
            }
          }
        });
      } else {
        // First time install
        safeShowToast({
          message: 'App is now available offline!',
          intent: Intent.SUCCESS,
          icon: 'offline',
          timeout: 3000
        });
      }
    });

    wb.addEventListener('waiting', () => {
      // Show update notification
      safeShowToast({
        message: 'New version available! Please refresh to update.',
        intent: Intent.PRIMARY,
        icon: 'refresh',
        timeout: 0,
        action: {
          text: 'Update',
          onClick: () => {
            // Send skip waiting message and reload
            wb.messageSkipWaiting();
            window.location.reload();
          }
        }
      });
    });

    wb.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker activated for the first time!');
      }
    });

    wb.addEventListener('controlling', () => {
      console.log('Service worker is controlling the page');
    });

    wb.addEventListener('redundant', () => {
      console.log('Service worker has become redundant');
    });

    // Register the service worker
    wb.register()
      .then((registration) => {
        console.log('Service worker registered:', registration);
      })
      .catch((error) => {
        console.error('Error during service worker registration:', error);
        
        // Show error notification
        safeShowToast({
          message: 'Failed to enable offline mode',
          intent: Intent.DANGER,
          icon: 'error',
          timeout: 5000
        });
      });
  } catch (error) {
    console.error('Error setting up service worker:', error);
  }
}

/**
 * Unregister the service worker
 */
export function unregisterServiceWorker(): void {
  if (!isServiceWorkerSupported) return;

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
    })
    .catch((error) => {
      console.error('Error unregistering service worker:', error);
    });
}

export default registerServiceWorker; 