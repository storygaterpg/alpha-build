# Network Module

This module contains utilities for handling network communication in the StoryGate RPG frontend.

## WebSocket Client

The WebSocket client provides a simple interface for communicating with the backend server via WebSockets.

### Basic Usage

```typescript
import { websocketClient } from '../network';

// Connect to the server
websocketClient.connect();

// Listen for events
websocketClient.on('connect', () => {
  console.log('Connected to server!');
});

websocketClient.on('chat', (data) => {
  console.log(`Received message from ${data.sender}: ${data.content}`);
});

// Send messages
websocketClient.send('chat', {
  sender: 'Player',
  content: 'Hello, world!'
});

// Disconnect when done
websocketClient.disconnect();
```

### React Hook

For React components, use the `useWebSocket` hook:

```typescript
import { useWebSocket } from '../network';

function ChatComponent() {
  const { 
    isConnected, 
    send, 
    on 
  } = useWebSocket({
    // Auto-connect when component mounts
    autoConnect: true,
    
    // Event handlers
    onConnect: () => console.log('Connected!'),
    onDisconnect: () => console.log('Disconnected!'),
    onError: (error) => console.error('Error:', error)
  });

  // Subscribe to chat messages
  useEffect(() => {
    // This will be cleaned up automatically when the component unmounts
    const cleanup = on('chat', (data) => {
      console.log(`Received message: ${data.content}`);
    });
    
    return cleanup;
  }, [on]);

  // Send a message
  const sendMessage = () => {
    send('chat', {
      sender: 'Player',
      content: 'Hello from React!'
    });
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={sendMessage} disabled={!isConnected}>
        Send Message
      </button>
    </div>
  );
}
```

## REST API Client

The API client provides methods for making REST API calls to the backend server.

### Basic Usage

```typescript
import { api } from '../network';

// GET request
const fetchData = async () => {
  try {
    const data = await api.get('/users');
    console.log('Users:', data);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

// POST request
const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    console.log('User created:', response);
  } catch (error) {
    console.error('Error creating user:', error);
  }
};

// Authentication
api.setAuthToken('your-auth-token');

// Clear authentication
api.clearAuthToken();
```

## Configuration

Both the WebSocket client and API client use environment variables for configuration:

- `VITE_API_URL`: The base URL for REST API calls
- `VITE_SERVER_URL`: The base URL for WebSocket connections

These can be configured in the `.env` file in the project root. 