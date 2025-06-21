import React from 'react';
import { render } from '@testing-library/react';
import useWebSocket from '../../network/useWebSocket';
import websocketClient from '../../network/WebSocketClient';

// Mock the singleton client
jest.mock('../../network/WebSocketClient', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isConnected: jest.fn().mockReturnValue(false),
    getState: jest.fn()
  }
}));

type Props = {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: () => void;
};

const TestComponent: React.FC<Props> = ({ autoConnect, onConnect, onDisconnect, onError }) => {
  useWebSocket({ autoConnect, onConnect, onDisconnect, onError });
  return null;
};

describe('useWebSocket hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-connects on mount when autoConnect=true', () => {
    render(<TestComponent autoConnect={true} />);
    expect(websocketClient.connect).toHaveBeenCalled();
  });

  it('registers event handlers and unsubscribes on unmount', () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onError = jest.fn();
    const { unmount } = render(
      <TestComponent
        autoConnect={false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onError={onError}
      />
    );
    // Should subscribe to events
    expect(websocketClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(websocketClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(websocketClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    // Cleanup unsubscribes
    unmount();
    expect(websocketClient.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(websocketClient.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(websocketClient.off).toHaveBeenCalledWith('error', expect.any(Function));
  });
}); 