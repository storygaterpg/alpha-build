// src/pages/Game.tsx

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '../phaser/scenes/MainScene';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import wsClient from '../network/WebSocketClient';
import {
  setMapData,
  setActors,
  setActiveActor,
  setAvailableActions,
  addLogEntries,
  showSheet,
  setMovementOverlay
} from '../store/gameSlice';
import ChatPanel from '../components/ChatPanel';
import ActionBar from '../components/ActionBar';
import TurnIndicator from '../components/TurnIndicator';
import LogPanel from '../components/LogPanel';
import CharacterSheet from '../components/CharacterSheet';

export default function Game() {
  const dispatch = useAppDispatch();
  const playerId = useAppSelector(state => state.game.playerId);
  const gameContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to server events
    wsClient.on('mapData', data => {
      dispatch(setMapData(data));
    });
    wsClient.on('actors', actors => {
      dispatch(setActors(actors));
    });
    wsClient.on('activeActor', id => {
      dispatch(setActiveActor(id));
    });
    wsClient.on('availableActions', acts => {
      dispatch(setAvailableActions(acts));
    });
    wsClient.on('actionResult', (res: any) => {
      if (res.actors) dispatch(setActors(res.actors));
      if (res.movementOverlay) dispatch(setMovementOverlay(res.movementOverlay));
      dispatch(addLogEntries(res.logs));
    });
    wsClient.on('sheetData', sheet => {
      dispatch(showSheet(sheet));
    });

    // Join the game session
    wsClient.send('join', { name: playerId });

    // Create Phaser game instance
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainer.current || undefined,
      width: 800,
      height: 600,
      scene: [MainScene],
      callbacks: {
        postBoot: game => {
          (game.scene.keys.MainScene as MainScene).initWebSocket(wsClient);
        }
      }
    };
    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, [dispatch, playerId]);

  return (
    <div className="game-screen">
      <TurnIndicator />
      <ActionBar />
      <div className="map-log-container">
        <div ref={gameContainer} className="phaser-container" />
        <LogPanel />
      </div>
      <ChatPanel />
      <CharacterSheet />
    </div>
  );
}
