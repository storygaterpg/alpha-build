// src/components/ChatPanel.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import wsClient from '../network/WebSocketClient';
import { addChatMessage, ChatMessage } from '../store/gameSlice';

/**
 * ChatPanel supports text and inline images from the AI DM.
 * Displays a scrollable message list and an input bar.
 */
export default function ChatPanel() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(state => state.game.chat);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to incoming chat events
  useEffect(() => {
    wsClient.on('chat', (msg: ChatMessage) => {
      dispatch(addChatMessage(msg));
    });
  }, [dispatch]);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message when user presses Enter or clicks Send
  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    // Dispatch local copy
    const msg: ChatMessage = { sender: 'Player', text };
    dispatch(addChatMessage(msg));

    // Send to server
    wsClient.send('chat', { text });

    setInput('');
  };

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender === 'Player' ? 'outgoing' : 'incoming'}`}>
            <strong>{m.sender}:</strong> {m.text}
            {m.imageUrl && <img src={m.imageUrl} alt="AI response" className="chat-image" />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="input-bar">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
