// src/pages/Home.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { setPlayerId } from '../store/gameSlice';

/**
 * Home screen: prompts for Player Name before connecting.
 */
export default function Home() {
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const connect = () => {
    if (!name.trim()) return;
    dispatch(setPlayerId(name.trim()));
    navigate('/game');
  };

  return (
    <div className="home-screen">
      <h1>Welcome to StoryGate</h1>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter your player name"
      />
      <button onClick={connect} disabled={!name.trim()}>
        Connect to Game
      </button>
    </div>
  );
}
