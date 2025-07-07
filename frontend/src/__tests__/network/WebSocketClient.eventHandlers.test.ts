import client from '../../network/WebSocketClient';

// Suppress console.error and console.warn during these tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

describe('WebSocketClient event handlers', () => {
  beforeEach(() => {
    // Clear any mock state
    jest.clearAllMocks();
  });

  it('invokes connect handlers on open', () => {
    const handler = jest.fn();
    client.on('connect', handler);
    (client as any).handleOpen();
    expect(handler).toHaveBeenCalled();
    client.off('connect', handler);
  });

  it('invokes disconnect handlers on close', () => {
    const handler = jest.fn();
    client.on('disconnect', handler);
    const event = { code: 1000, reason: 'ok', wasClean: true } as CloseEvent;
    (client as any).handleClose(event);
    expect(handler).toHaveBeenCalledWith(event);
    client.off('disconnect', handler);
  });

  it('invokes error handlers on error', () => {
    const handler = jest.fn();
    client.on('error', handler);
    const error = new Error('fail');
    (client as any).handleError(error);
    expect(handler).toHaveBeenCalledWith(error);
    client.off('error', handler);
  });

  it('invokes message type handlers on message', () => {
    const handler = jest.fn();
    client.onMessageType('customType', handler);
    const message = { event: 'customType', payload: { foo: 123 } };
    const eventObj = { data: JSON.stringify(message) } as MessageEvent;
    (client as any).handleMessage(eventObj);
    expect(handler).toHaveBeenCalledWith(message.payload);
    client.offMessageType('customType', handler);
  });
}); 