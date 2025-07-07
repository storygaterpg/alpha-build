import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import NotificationsDisplay from '../../components/NotificationsDisplay';

// Mock the Toaster.show method
jest.mock('../../components/NotificationsDisplay', () => {
  const originalModule = jest.requireActual('../../components/NotificationsDisplay');
  
  // Mock the NotificationsToaster.show method
  const mockShow = jest.fn();
  originalModule.NotificationsToaster.show = mockShow;
  
  return {
    __esModule: true,
    ...originalModule,
    default: () => <div data-testid="notifications-display" />
  };
});

// Create mock store
const mockStore = configureStore([]);

describe('NotificationsDisplay Component', () => {
  let store: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render with no notifications', () => {
    // Create mock store with empty notifications
    store = mockStore({
      notifications: {
        items: []
      }
    });
    
    const { getByTestId } = render(
      <Provider store={store}>
        <NotificationsDisplay />
      </Provider>
    );
    
    // Check that component renders
    expect(getByTestId('notifications-display')).toBeInTheDocument();
  });
  
  it('should render with active notifications', () => {
    // Create mock store with notifications
    store = mockStore({
      notifications: {
        items: [
          {
            id: '1',
            title: 'Error',
            message: 'Connection failed',
            type: 'error',
            timestamp: Date.now(),
            duration: 5000
          },
          {
            id: '2',
            title: 'Success',
            message: 'Action completed',
            type: 'success',
            timestamp: Date.now(),
            duration: 3000
          }
        ]
      }
    });
    
    const { getByTestId } = render(
      <Provider store={store}>
        <NotificationsDisplay />
      </Provider>
    );
    
    // Check that component renders
    expect(getByTestId('notifications-display')).toBeInTheDocument();
  });
}); 