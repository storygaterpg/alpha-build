import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface TypingIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className, style }) => {
  const isTyping = useSelector((state: RootState) => state.chat.isTyping);
  const [activeTypers, setActiveTypers] = useState<string[]>([]);
  
  // Process typing users to get a list of active typers
  useEffect(() => {
    const now = Date.now();
    const TYPING_TIMEOUT = 3000; // 3 seconds
    
    // Filter out users whose typing indicators have expired
    const typingUsers = Object.entries(isTyping)
      .filter(([_, data]) => now - data.timestamp < TYPING_TIMEOUT)
      .map(([_, data]) => data.username);
    
    setActiveTypers(typingUsers);
  }, [isTyping]);
  
  // Don't render anything if no one is typing
  if (activeTypers.length === 0) {
    return null;
  }
  
  // Format typing message based on number of users
  let typingMessage = '';
  if (activeTypers.length === 1) {
    typingMessage = `${activeTypers[0]} is typing...`;
  } else if (activeTypers.length === 2) {
    typingMessage = `${activeTypers[0]} and ${activeTypers[1]} are typing...`;
  } else if (activeTypers.length === 3) {
    typingMessage = `${activeTypers[0]}, ${activeTypers[1]}, and ${activeTypers[2]} are typing...`;
  } else {
    typingMessage = `${activeTypers.length} people are typing...`;
  }
  
  return (
    <div 
      className={`typing-indicator ${className || ''}`}
      style={{ 
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        minHeight: '20px',
        ...style
      }}
    >
      {typingMessage}
      <div className="typing-animation">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
      
      {/* Styling for the typing animation */}
      <style>
        {`
          .typing-animation {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            margin-left: 4px;
          }
          
          .typing-animation .dot {
            width: 4px;
            height: 4px;
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 50%;
            animation: typingAnimation 1.4s infinite ease-in-out;
          }
          
          .typing-animation .dot:nth-child(1) {
            animation-delay: 0s;
          }
          
          .typing-animation .dot:nth-child(2) {
            animation-delay: 0.2s;
          }
          
          .typing-animation .dot:nth-child(3) {
            animation-delay: 0.4s;
          }
          
          @keyframes typingAnimation {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.5;
            }
            30% {
              transform: translateY(-4px);
              opacity: 0.8;
            }
          }
        `}
      </style>
    </div>
  );
};

export default TypingIndicator; 