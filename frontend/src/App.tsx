import React, { useRef, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Position, OverlayToaster, ToastProps, Toaster } from '@blueprintjs/core'
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'react-mosaic-component/react-mosaic-component.css'
import Home from './pages/Home'
import Game from './pages/Game'
import './styles/glassmorphic.css'
import './styles/mosaic.css'

// Create a global toaster instance
export const AppToaster = Toaster.create({
  position: Position.TOP,
  className: 'glassmorphic-toaster',
  maxToasts: 3
})

// Global style to remove focus outlines and fix layout issues
const GlobalStyles = () => {
  useEffect(() => {
    // Add a style element to the document head
    const style = document.createElement('style')
    style.innerHTML = `
      /* Remove all outlines */
      * {
        outline: none !important;
      }
      
      /* Fix viewport sizing */
      html, body, #root, .app-container {
        width: 100%;
        height: 100vh;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      /* Ensure the app container takes full height */
      .app-container {
        display: flex;
        flex-direction: column;
      }
      
      /* Specifically target all mosaic elements */
      .mosaic,
      .mosaic-root, 
      .mosaic-tile,
      .mosaic-window,
      .mosaic-window-toolbar,
      .mosaic-window-body,
      .mosaic-window-title,
      .mosaic-window-controls,
      .mosaic-split,
      .mosaic-split-line,
      .mosaic-drop-target,
      .mosaic *,
      [class*="mosaic"] {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Target focus states specifically */
      .mosaic-window:focus, 
      .mosaic-window *:focus,
      .mosaic-split:focus,
      .mosaic:focus,
      .mosaic *:focus,
      [class*="mosaic"]:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Override browser default focus styles */
      :focus {
        outline: none !important;
      }
      
      /* Target Chrome and Safari specifically */
      *:focus-visible {
        outline: none !important;
      }
      
      /* Remove any outlines in Firefox */
      ::-moz-focus-inner {
        border: 0 !important;
      }
    `
    document.head.appendChild(style)

    // Clean up function
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return null
}

const App: React.FC = () => {
  return (
    <div className="app-container">
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  )
}

export default App 