# StoryGate RPG Frontend

A React-based frontend for the StoryGate RPG game, featuring a flexible mosaic layout with various game panels.

## Features

- Flexible mosaic layout with resizable panels
- Real-time game map rendering with Phaser
- Chat system with validation
- Game log with color-coded events
- Turn-based combat interface
- Character sheet and inventory management
- Blueprint.js UI components for a consistent look and feel
- Performance monitoring with Stats.js (FPS, memory usage, entity count)
- Progressive Web App (PWA) support for offline play

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies:

```bash
npm install
```

### Running the Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Windows PowerShell Users

If you're using Windows PowerShell, you may need to use a different syntax for chaining commands:

```powershell
# Instead of this (which works in bash/cmd)
cd frontend && npm run dev

# Use this in PowerShell
cd frontend; npm run dev
```

Or run each command separately:

```powershell
cd frontend
npm run dev
```

## Performance Monitoring

The application includes Stats.js for performance monitoring in development mode:

- FPS counter (frames per second)
- Memory usage (if supported by the browser)
- Entity count (number of game objects)

You can toggle the stats display with `Ctrl+Shift+P`.

Performance warnings will appear as notifications when:
- FPS drops below 30
- Memory usage exceeds 100MB

## Progressive Web App (PWA)

The application supports Progressive Web App features:

- Installable on desktop and mobile devices
- Offline support with service worker caching
- Automatic updates with user notifications
- Optimized asset caching for better performance
- WebSocket connection resilience with background sync

To build the application as a PWA:

```bash
npm run build:pwa
```

This will generate a production build with the service worker for offline support.

## Error Handling

The application includes comprehensive error handling:

- Global notifications via Blueprint Toaster for non-blocking errors
- Inline form validation using Blueprint Callout components
- Connection status indicators
- Automatic reconnection attempts for WebSocket connections

## Project Structure

- `/src/components` - Reusable UI components
- `/src/pages` - Main application pages
- `/src/store` - Redux store and slices
- `/src/network` - WebSocket client and network utilities
- `/src/phaser` - Phaser game integration
- `/src/styles` - CSS styles and themes
- `/src/utils` - Utility functions and helpers

## Building for Production

Build the application for production:

```bash
npm run build
```

Build the application with PWA support:

```bash
npm run build:pwa
```

The built files will be in the `dist` directory. 