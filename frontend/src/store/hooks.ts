// ==== src/store/hooks.ts ==== 
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Typed versions of useDispatch and useSelector for Redux.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;


// ==== src/components/ConnectionStatus.tsx ==== 
import React, { useEffect, useState } from 'react';
import wsClient from '../network/WebSocketClient';

/**
 * Displays WebSocket connection status: Connected or Disconnected.
 */
export default function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    wsClient.on('connect', () => setConnected(true));
    wsClient.on('disconnect', () => setConnected(false));
    // If wsClient exposes readyState
    if (wsClient.isConnected()) setConnected(true);
  }, []);

  return (
    <div className={`connection-status ${connected ? 'online' : 'offline'}`}>
      {connected ? 'Online' : 'Offline'}
    </div>
  );
}


// ==== src/components/Notification.tsx ==== 
import React, { useEffect, useState } from 'react';
import wsClient from '../network/WebSocketClient';

/**
 * Displays transient error notifications from server.
 */
export default function Notification() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    wsClient.on('error', (payload: { message: string }) => {
      setMessage(payload.message);
      setTimeout(() => setMessage(null), 5000);
    });
  }, []);

  if (!message) return null;
  return (
    <div className="notification">
      <span>Error: {message}</span>
      <button onClick={() => setMessage(null)}>×</button>
    </div>
  );
}


// ==== src/components/VideoGrid.tsx ==== 
import React from 'react';

/**
 * Placeholder grid for video feeds (future WebRTC).
 */
export default function VideoGrid() {
  // For MVP, show static placeholders
  const placeholders = Array(4).fill(0);
  return (
    <div className="video-grid">
      {placeholders.map((_, i) => (
        <div key={i} className="video-placeholder">
          <span>Camera {i + 1}</span>
        </div>
      ))}
    </div>
  );
}

// ==== src/network/WebSocketClient.ts (modified) ==== 
class WebSocketClient {
  private socket: WebSocket;
  private handlers: { [event: string]: ((data: any) => void)[] } = {};

  constructor() {
    const url = import.meta.env.VITE_SERVER_URL || `ws://${window.location.hostname}:8000/ws`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => this.emit('connect', {});
    this.socket.onclose = () => this.emit('disconnect', {});
    this.socket.onerror = () => this.emit('disconnect', {});
    this.socket.onmessage = (msg) => {
      const { event, payload } = JSON.parse(msg.data);
      this.emit(event, payload);
    };
  }

  private emit(event: string, data: any) {
    this.handlers[event]?.forEach(h => h(data));
  }

  public on(event: string, handler: (data: any) => void) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  public send(event: string, data: any) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, payload: data }));
    }
  }

  public isConnected() {
    return this.socket.readyState === WebSocket.OPEN;
  }
}

const wsClient = new WebSocketClient();
export default wsClient;

// ==== Modifications to src/App.tsx ==== 
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import ConnectionStatus from './components/ConnectionStatus';
import Notification from './components/Notification';

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionStatus />
      <Notification />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}
