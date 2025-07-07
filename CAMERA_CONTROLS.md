# Camera Controls Documentation

## Overview
StoryGateRPG features comprehensive camera zoom and pan controls using Phaser.js's built-in camera system. These controls follow industry standards for map navigation and provide both desktop and mobile support.

## Current Map
The game currently uses **test-map2.png** as the default background map, which features detailed fantasy terrain with enhanced visual elements.

## Available Controls

### 🖱️ Mouse Controls
- **Mouse Wheel**: Zoom in/out
  - Scroll up: Zoom in
  - Scroll down: Zoom out
  - Zooms towards cursor position for precise control
  - **Ultra-fine control**: 0.5% zoom steps for extremely smooth experience

- **Click + Drag**: Pan the map
  - Left-click and hold, then drag to move the camera
  - Automatically stops following the player when manually panning

### ⌨️ Keyboard Controls
- **Zoom Controls**:
  - `+` / `NumPad +`: Zoom in (centered) - 1% steps
  - `-` / `NumPad -`: Zoom out (centered) - 1% steps
  - **Centered zoom**: Maintains current view center when using keyboard
  - **Fine control**: 1% zoom increments for precise adjustments

- **Pan Controls**:
  - `W`: Pan up
  - `A`: Pan left  
  - `S`: Pan down
  - `D`: Pan right
  - **Manual override**: Stops following player automatically

### 📱 Touch Controls (Mobile)
- **Pinch to Zoom**: Two-finger pinch gesture
- **Touch + Drag**: Single finger drag to pan
- **Double Tap**: Return to player (planned feature)

## 🎯 Smart Features

### Player Following
- **Auto-follow**: Camera follows player by default
- **Manual override**: Any manual camera movement stops auto-follow
- **Smart centering**: Player stays centered during movement

### Zoom Behavior
- **Smooth transitions**: All zoom changes are interpolated
- **Bounds checking**: Prevents zooming beyond map boundaries
- **Cursor-based zoom**: Mouse wheel zooms towards cursor position
- **Keyboard centered zoom**: +/- keys zoom towards current view center

### Performance Optimizations
- **Efficient rendering**: Only renders visible areas
- **Smooth interpolation**: 60fps camera movements
- **Memory efficient**: Minimal overhead for camera operations

## 🔧 Technical Details

### Zoom Limits
- **Minimum Zoom**: 0.25x (25% - for overview)
- **Maximum Zoom**: 4.0x (400% - for detail)
- **Default Zoom**: 1.0x (100% - normal view)

### Pan Speeds
- **Mouse Drag**: Real-time following
- **Keyboard Pan**: 200 pixels/second
- **Smooth Factor**: 0.05 for interpolated movement

### Map Integration
- **Background**: Uses test-map2.png with enhanced terrain details
- **Grid Overlay**: Semi-transparent grid for positioning
- **Tile Layers**: Multiple layers with proper transparency
- **Asset Optimization**: Preloaded for instant display

## 🎮 Usage Tips

1. **For Exploration**: Use mouse wheel to zoom out for overview, then zoom in on areas of interest
2. **For Precision**: Use keyboard zoom (+/-) for centered, predictable zoom behavior  
3. **For Navigation**: Click and drag for quick map exploration
4. **For Combat**: Stay zoomed in and let the camera follow the player automatically
5. **For Planning**: Zoom out to see the entire battlefield or area

## 🐛 Troubleshooting

- **Camera not following player**: Try moving the player - auto-follow will resume
- **Zoom feels jerky**: Check if frame rate is stable, camera uses 60fps interpolation
- **Can't see entire map**: Zoom out further (minimum 0.25x allows full map view)
- **Controls not responding**: Check if game has focus, try clicking on the game area

---

*Camera system implemented using Phaser.js v3.70+ built-in camera features for maximum compatibility and performance.*

## API Methods

The MainScene exposes these public methods for programmatic camera control:

```typescript
// Center camera on specific coordinates with optional zoom
scene.centerCameraOn(x, y, zoom?)

// Reset camera to default position and follow player
scene.resetCamera()
```

## Performance Considerations
- Camera controls are optimized for 60 FPS gameplay
- Bounds checking prevents unnecessary rendering outside map area
- Smooth movement uses interpolation for better visual experience
- Touch gestures are debounced to prevent performance issues
- Granular zoom steps maintain smooth performance

## Accessibility
- Multiple control methods (mouse, keyboard, touch)
- Visual feedback with controls overlay
- Intuitive controls following established patterns
- Auto-hiding help text to reduce UI clutter
- Fine-grained zoom control for precise navigation

## Recent Improvements
- **Better Zoom Centering**: Keyboard zoom now stays centered on current view
- **Reduced Sensitivity**: Smaller zoom steps for more granular control
- **Smart Zoom Behavior**: Mouse wheel zooms towards cursor, keyboard towards center
- **Improved Performance**: Optimized zoom calculations for smoother experience

## Future Enhancements
Potential improvements that could be added:
- Camera presets (overview, close-up, etc.)
- Minimap with camera viewport indicator
- Smooth zoom animations with easing
- Camera shake effects for game events
- Save/restore camera positions 