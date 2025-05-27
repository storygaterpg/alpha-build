import React, { useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Position, OverlayToaster, ToastProps } from '@blueprintjs/core'
import Home from './pages/Home'
import Game from './pages/Game'

// Create a shared reference to the toaster
export let AppToaster: any;

// Using the React component approach instead of .create()
const ToasterContainer: React.FC = () => {
  const toasterRef = useRef<OverlayToaster>(null);
  
  // Set the AppToaster variable to the instance
  if (toasterRef.current && !AppToaster) {
    AppToaster = toasterRef.current;
    
    // Add glassmorphic styling to toasts
    const originalShow = AppToaster.show;
    AppToaster.show = (props: ToastProps) => {
      const newProps = {
        ...props,
        className: `${props.className || ''} glass-toast`,
      };
      return originalShow(newProps);
    };
  }
  
  return (
    <OverlayToaster
      ref={toasterRef}
      position={Position.TOP_RIGHT}
      maxToasts={3}
      canEscapeKeyClear={true}
      className="glassmorphic-toaster"
    />
  );
};

const App: React.FC = () => {
  return (
    <div className="app-container">
      <ToasterContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  )
}

export default App 