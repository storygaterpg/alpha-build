// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ConnectionStatus from './components/ConnectionStatus';
import Notification from './components/Notification';
import Home from './pages/Home';
import Game from './pages/Game';

/**
 * Root application component.
 * Renders global connection status and notifications,
 * and sets up routing for Home and Game screens.
 */
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
