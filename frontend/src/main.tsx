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

// Add decorative glowing orbs in the background
const addGlowingOrbs = () => {
  const body = document.body;
  
  // Create primary orb
  const primaryOrb = document.createElement('div');
  primaryOrb.className = 'glow-orb primary';
  primaryOrb.style.width = '300px';
  primaryOrb.style.height = '300px';
  primaryOrb.style.top = '10%';
  primaryOrb.style.left = '5%';
  
  // Create secondary orb
  const secondaryOrb = document.createElement('div');
  secondaryOrb.className = 'glow-orb secondary';
  secondaryOrb.style.width = '250px';
  secondaryOrb.style.height = '250px';
  secondaryOrb.style.bottom = '10%';
  secondaryOrb.style.right = '5%';
  
  // Create accent orb
  const accentOrb = document.createElement('div');
  accentOrb.className = 'glow-orb accent';
  accentOrb.style.width = '200px';
  accentOrb.style.height = '200px';
  accentOrb.style.top = '50%';
  accentOrb.style.left = '50%';
  accentOrb.style.transform = 'translate(-50%, -50%)';
  
  // Add orbs to body
  body.appendChild(primaryOrb);
  body.appendChild(secondaryOrb);
  body.appendChild(accentOrb);
};

// Run after DOM is ready
window.addEventListener('DOMContentLoaded', addGlowingOrbs);

// Initialize performance monitoring in development mode
if (process.env.NODE_ENV === 'development') {
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