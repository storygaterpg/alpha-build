import React, { useEffect, useRef } from 'react';

// Scroll to bottom when messages change
useEffect(() => {
  if (messagesEndRef.current && uniqueMessages.length > 0) {
    try {
      // In test environment, scrollIntoView might not be available
      if (typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }
}, [uniqueMessages]);

// Check if connected to server
if (!socketConnected) {
  setValidationError("Not connected to server. Your message will not be sent.");
  return false;
} 