import React, { useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Position, Toaster } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import 'react-mosaic-component/react-mosaic-component.css';

// Import pages
import Home from './pages/Home';
import Game from './pages/Game';
import './styles/glassmorphic.css';
import './styles/mosaic.css';

// Create global AppToaster instance
export const AppToaster = Toaster.create({
  className: 'glassmorphic-toaster',
  position: Position.TOP,
  maxToasts: 3,
});

// Global style to remove focus outlines and fix layout issues
const GlobalStyles = () => {
  useEffect(() => {
    // Add a style element to the document head
    const style = document.createElement('style');
    style.innerHTML = `
      /* Fix for headerless windows */
      .mosaic-window-toolbar {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        padding: 0 !important;
        border: none !important;
      }

      /* Exception for mini header windows */
      .mosaic-window-mini-header .mosaic-window-toolbar {
        display: flex !important;
        height: 10px !important;
        min-height: 10px !important;
        padding: 0 !important;
        background-color: transparent !important;
        border: none !important;
        cursor: move;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto !important;
        z-index: 10;
      }

      .mosaic-window-body {
        top: 0 !important;
        height: 100% !important;
      }

      /* Adjustment for mini header windows */
      .mosaic-window-mini-header .mosaic-window-body {
        top: 0 !important;
        height: calc(100% - 10px) !important;
        bottom: 10px !important;
      }

      /* Remove all outlines */
      .mosaic-window:focus,
      .mosaic-window-toolbar:focus,
      .mosaic:focus,
      .mosaic-window-body:focus,
      .mosaic-split:focus,
      .mosaic *:focus,
      .mosaic-window *:focus,
      .mosaic-window-body *:focus,
      .headerless-mosaic-window,
      .headerless-mosaic-window:focus,
      .headerless-mosaic-window *,
      .headerless-mosaic-window *:focus,
      .headerless-mosaic,
      .headerless-mosaic *,
      .headerless-mosaic *:focus {
        outline: none !important;
        box-shadow: none !important;
        -webkit-focus-ring-color: transparent !important;
      }

      /* Prevent scrollbar layout shift */
      html {
        scrollbar-gutter: stable;
      }

      /* Override react-remove-scroll margin when using scrollbar-gutter */
      @supports (scrollbar-gutter: stable) {
        body {
          margin: 0 !important;
        }
      }

      /* Fix global layout */
      html, body, #root, .app-container {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      /* Ensure the app container takes full height */
      .app-container {
        display: flex;
        flex-direction: column;
      }
    `;
    document.head.appendChild(style);

    // Clean up function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

const App: React.FC = () => {
  return (
    <div className="app-container">
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  );
};

export default App; 