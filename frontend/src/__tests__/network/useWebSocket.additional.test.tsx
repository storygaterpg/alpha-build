import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import useWebSocket from '../../network/useWebSocket';
import websocketClient from '../../network/WebSocketClient';

// Mock the client
jest.mock('../../network/WebSocketClient', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isConnected: jest.fn().mockReturnValue(false),
    getState: jest.fn()
  }
}));

describe('useWebSocket additional behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not auto-connect when autoConnect is false', () => {
    const TestComp: React.FC = () => {
      useWebSocket({ autoConnect: false });
      return null;
    };
    render(<TestComp />);
    expect(websocketClient.connect).not.toHaveBeenCalled();
  });

  it('exposes connect, disconnect, and send functions', () => {
    let connectFn: () => void;
    let disconnectFn: () => void;
    let sendFn: (type: string, data?: any) => void;

    const TestComp: React.FC = () => {
      const { connect, disconnect, send } = useWebSocket({ autoConnect: false });
      connectFn = connect;
      disconnectFn = disconnect;
      sendFn = send;
      return null;
    };
    render(<TestComp />);
    // Call connect
    connectFn!();
    expect(websocketClient.connect).toHaveBeenCalled();
    // Call disconnect
    disconnectFn!();
    expect(websocketClient.disconnect).toHaveBeenCalled();
    // Call send
    sendFn!('test-event', { foo: 1 });
    expect(websocketClient.send).toHaveBeenCalledWith('test-event', { foo: 1 });
  });
}); 