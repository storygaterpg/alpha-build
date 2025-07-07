# Services

This directory contains service modules that provide functionality to the application.

## AI Proxy Service

The AI Proxy service acts as a thin proxy between the frontend and the server-side AI. It sends user messages to the server via WebSocket and handles AI responses.

### Basic Usage

```typescript
import { aiProxy } from '../services';

// Initialize the service
aiProxy.initialize();

// Send a message to the AI
aiProxy.sendMessage('Hello, AI!');

// Register a handler for AI responses
const cleanup = aiProxy.onResponse((response) => {
  console.log(`AI response: ${response.text}`);
});

// Clean up when done
cleanup();
```

### React Hook

For React components, use the `useAI` hook:

```typescript
import { useAI } from '../services';

function AIChat() {
  const { 
    sendMessage, 
    isProcessing, 
    lastResponse, 
    history, 
    clearHistory 
  } = useAI();

  // Send a message to the AI
  const handleSend = () => {
    sendMessage('Hello, AI!');
  };

  return (
    <div>
      {/* Display chat history */}
      {history.map((msg, i) => (
        <div key={i}>
          <strong>{msg.sender}:</strong> {msg.text}
        </div>
      ))}

      {/* Show loading indicator */}
      {isProcessing && <div>AI is thinking...</div>}

      {/* Send message button */}
      <button onClick={handleSend} disabled={isProcessing}>
        Send Message
      </button>

      {/* Clear history button */}
      <button onClick={clearHistory}>
        Clear History
      </button>
    </div>
  );
}
```

## Context7 Service

The Context7 service provides methods to interact with the Context7 API for documentation lookup.

### Basic Usage

```typescript
import { context7Service } from '../services';

// Resolve a library ID from a package name
const libraryId = await context7Service.resolveLibraryId('react');

// Get library documentation
const docs = await context7Service.getLibraryDocs(
  libraryId,
  'How to use hooks?',
  { tokens: 1000, topic: 'hooks' }
);
``` 