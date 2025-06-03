import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DebugToggle from '../../components/DebugToggle';

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DebugToggle Component', () => {
  beforeEach(() => {
    // Clear mock localStorage
    localStorageMock.clear();
    jest.clearAllMocks();
  });
  
  test('renders nothing in production mode', () => {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    // Set to production
    process.env.NODE_ENV = 'production';
    
    const { container } = render(<DebugToggle />);
    expect(container.firstChild).toBeNull();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
  
  test('renders in development mode with debug off by default', () => {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    // Set to development
    process.env.NODE_ENV = 'development';
    
    render(<DebugToggle />);
    expect(screen.getByText('🔇 Debug')).toBeInTheDocument();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
  
  test('uses localStorage value for initial state', () => {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    // Set to development
    process.env.NODE_ENV = 'development';
    
    // Set localStorage to true
    localStorageMock.getItem.mockReturnValueOnce('true');
    
    render(<DebugToggle />);
    expect(screen.getByText('🔊 Debug')).toBeInTheDocument();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
  
  test('toggles between on and off states', () => {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    // Set to development
    process.env.NODE_ENV = 'development';
    
    render(<DebugToggle />);
    
    // Default state should be off
    const toggleButton = screen.getByText('🔇 Debug');
    expect(toggleButton).toBeInTheDocument();
    
    // Click to toggle on
    fireEvent.click(toggleButton);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('verbose_logging', 'true');
    expect(screen.getByText('🔊 Debug')).toBeInTheDocument();
    
    // Click to toggle off
    fireEvent.click(screen.getByText('🔊 Debug'));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('verbose_logging', 'false');
    expect(screen.getByText('🔇 Debug')).toBeInTheDocument();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
}); 