import React, { useRef, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Position, Toaster } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import 'react-mosaic-component/react-mosaic-component.css';
import { useDispatch } from 'react-redux';
import { connect, ConnectedProps } from 'react-redux';
import websocketClient from './network/WebSocketClient';

// Import pages
import Home from './pages/Home';
import Login from '@pages/Login';
import Game from './pages/Game';
import SettingsPage from './pages/SettingsPage';
import Dashboard from '@pages/Dashboard';
import './styles/glassmorphic.css';
import './styles/mosaic.css';

// Import socket actions
import { socketConnect, socketDisconnect } from './store/slices/socketSlice';

// Import our components
import ConnectionStatus from './components/ConnectionStatus';
import NotificationsDisplay from './components/NotificationsDisplay';
import AuthGuard from '@components/AuthGuard';

// Create global AppToaster instance
export const AppToaster = Toaster.create({
  className: 'glassmorphic-toaster',
  position: Position.TOP,
  maxToasts: 3,
});

// Global style to remove focus outlines and fix layout issues
const GlobalStyles = () => {
  useEffect(() => {
    // Add a style element to the document head
    const style = document.createElement('style');
    style.innerHTML = `
      /* Fix for headerless windows */
      .mosaic-window-toolbar {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        padding: 0 !important;
        border: none !important;
      }

      /* Exception for mini header windows */
      .mosaic-window-mini-header .mosaic-window-toolbar {
        display: flex !important;
        height: 10px !important;
        min-height: 10px !important;
        padding: 0 !important;
        background-color: transparent !important;
        border: none !important;
        cursor: move;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto !important;
        z-index: 10;
      }

      .mosaic-window-body {
        top: 0 !important;
        height: 100% !important;
      }

      /* Adjustment for mini header windows */
      .mosaic-window-mini-header .mosaic-window-body {
        top: 0 !important;
        height: calc(100% - 10px) !important;
        bottom: 10px !important;
      }

      /* Remove all outlines */
      .mosaic-window:focus,
      .mosaic-window-toolbar:focus,
      .mosaic:focus,
      .mosaic-window-body:focus,
      .mosaic-split:focus,
      .mosaic *:focus,
      .mosaic-window *:focus,
      .mosaic-window-body *:focus,
      .headerless-mosaic-window,
      .headerless-mosaic-window:focus,
      .headerless-mosaic-window *,
      .headerless-mosaic-window *:focus,
      .headerless-mosaic,
      .headerless-mosaic *,
      .headerless-mosaic *:focus {
        outline: none !important;
        box-shadow: none !important;
        -webkit-focus-ring-color: transparent !important;
      }

      /* Prevent scrollbar layout shift */
      html {
        scrollbar-gutter: stable;
      }

      /* Override react-remove-scroll margin when using scrollbar-gutter */
      @supports (scrollbar-gutter: stable) {
        body {
          margin: 0 !important;
        }
      }

      /* Fix global layout */
      html, body, #root, .app-container {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      /* Ensure the app container takes full height */
      .app-container {
        display: flex;
        flex-direction: column;
      }
    `;
    document.head.appendChild(style);

    // Clean up function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

/**
 * Determine the appropriate WebSocket URL based on environment or fallbacks
 */
function getWebSocketUrl(): string {
  // First priority: Use the environment variable if available
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL as string;
  }
  
  // Second priority: Use the backend port from environment or default to 8000
  const serverPort = import.meta.env.VITE_WEBSOCKET_PORT || '8000';
  
  // Determine protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Use the same hostname as the current page
  return `${protocol}//${window.location.hostname}:${serverPort}`;
}

// Socket connection manager
const SocketManager: React.FC = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Connect via centralized WebSocket client
    websocketClient.connect(undefined, '/ws')
      .then(success => {
        if (success) {
          console.log('WebSocket client connected');
        } else {
          console.error('WebSocket client failed to connect');
        }
      })
      .catch(error => {
        console.error('Error connecting WebSocket client:', error);
      });
      
    // Disconnect when component unmounts
    return () => {
      websocketClient.disconnect();
    };
  }, []);
  
  return null;
};

const App: React.FC = () => {
  return (
    <div className="app-container">
      <GlobalStyles />
      <SocketManager />
      <NotificationsDisplay />
      <div className="app-header">
        {/* ConnectionStatus moved to game page header */}
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/game" element={<Game />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
};

export default App; 