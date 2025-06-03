import React, { useState } from 'react';

/**
 * Toggle component for debug logging
 */
const DebugToggle: React.FC = () => {
  const [isVerbose, setIsVerbose] = useState(() => {
    return localStorage.getItem('verbose_logging') === 'true';
  });

  const toggleVerbose = () => {
    const newValue = !isVerbose;
    setIsVerbose(newValue);
    localStorage.setItem('verbose_logging', newValue ? 'true' : 'false');
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: '10px', 
      left: '10px',
      zIndex: 10,
      opacity: 0.6,
      fontSize: '10px',
      padding: '4px',
      background: 'rgba(0,0,0,0.1)',
      borderRadius: '4px',
      cursor: 'pointer'
    }} onClick={toggleVerbose}>
      {isVerbose ? '🔊 Debug' : '🔇 Debug'}
    </div>
  );
};

export default DebugToggle; 