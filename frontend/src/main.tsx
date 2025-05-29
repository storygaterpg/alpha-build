import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { FocusStyleManager } from '@blueprintjs/core'

// Import Blueprint CSS globally
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'

// Import react-mosaic-component styles
import 'react-mosaic-component/react-mosaic-component.css'

// Import our styles
import './styles/main.css'
import './styles/mosaic.css'
import './styles/glassmorphic.css'

import App from './App.tsx'
import { store } from './store'
import { performanceMonitor } from './utils/PerformanceMonitor'
import { registerServiceWorker } from './serviceWorkerRegistration'

// Initialize Blueprint.js focus style manager
FocusStyleManager.onlyShowFocusOnTabs();

// Add decorative glowing orbs in the background - optimized version
const addGlowingOrbs = () => {
  // Only add decorative elements if not in low-memory mode
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('Reduced motion preference detected, skipping decorative elements');
    return;
  }
  
  const body = document.body;
  
  // Create single orb container instead of multiple elements
  const orbContainer = document.createElement('div');
  orbContainer.className = 'orb-container';
  
  // Fix position to make it fixed relative to viewport
  orbContainer.style.position = 'fixed';
  orbContainer.style.top = '0';
  orbContainer.style.left = '0';
  orbContainer.style.width = '100%';
  orbContainer.style.height = '100%';
  orbContainer.style.zIndex = '-1';
  orbContainer.style.overflow = 'hidden';
  orbContainer.style.pointerEvents = 'none';
  
  // Create primary orb (smaller size)
  const primaryOrb = document.createElement('div');
  primaryOrb.className = 'glow-orb primary';
  primaryOrb.style.width = '200px'; // Reduced from 300px
  primaryOrb.style.height = '200px'; // Reduced from 300px
  primaryOrb.style.position = 'absolute';
  primaryOrb.style.top = '10%';
  primaryOrb.style.left = '5%';
  
  // Only add second orb if on desktop-sized screens
  if (window.innerWidth > 768) {
    // Create secondary orb (smaller size)
    const secondaryOrb = document.createElement('div');
    secondaryOrb.className = 'glow-orb secondary';
    secondaryOrb.style.width = '150px'; // Reduced from 250px
    secondaryOrb.style.height = '150px'; // Reduced from 250px
    secondaryOrb.style.position = 'absolute';
    secondaryOrb.style.bottom = '10%';
    secondaryOrb.style.right = '5%';
    orbContainer.appendChild(secondaryOrb);
  }
  
  // Add orbs to container
  orbContainer.appendChild(primaryOrb);
  
  // Add container to body
  body.appendChild(orbContainer);
  
  // Also ensure the body and html don't overflow
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.height = '100%';
  body.style.overflow = 'auto';
  body.style.height = '100%';
  body.style.margin = '0';
  body.style.padding = '0';
};

// Run after DOM is ready, but only if not in low-memory mode
window.addEventListener('DOMContentLoaded', () => {
  // Check available memory before adding decorative elements
  if ((window.performance as any)?.memory?.jsHeapSizeLimit && 
     (window.performance as any).memory.jsHeapSizeLimit < 2000000000) { // Less than ~2GB available
    console.log('Low memory environment detected, skipping decorative elements');
  } else {
    addGlowingOrbs();
  }
});

// For development mode detection - in a real environment, this would use proper environment variables
// but for simplicity we'll just hardcode this to true (assume we're in development)
const isDevelopment = true;

// Initialize performance monitoring in development mode
if (isDevelopment) {
  performanceMonitor.start();
  console.log('Performance monitoring enabled in development mode');
  
  // Add keyboard shortcut to toggle stats (Ctrl+Shift+P)
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      const isEnabled = performanceMonitor.toggle();
      console.log(`Performance monitoring ${isEnabled ? 'enabled' : 'disabled'}`);
    }
  });
}

// Register service worker for PWA support
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
) 