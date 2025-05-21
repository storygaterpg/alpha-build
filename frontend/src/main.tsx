import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import store from './store/store';
import './index.css';
import PerformanceMonitor from './utils/PerformanceMonitor';

/**
 * Entry point for the React application.
 * Sets up Redux provider, service worker registration, and performance monitoring.
 */
const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// Initialize performance monitoring (FPS counter)
PerformanceMonitor.init();

// Register PWA service worker for offline and caching support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg))
      .catch(err => console.error('SW registration failed:', err));
  });
}
