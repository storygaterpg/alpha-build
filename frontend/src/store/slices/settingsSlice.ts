import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MosaicNode } from 'react-mosaic-component';

// Type for layout presets
export type LayoutPresetId = 'combat' | 'story' | 'roleplay';

// Type for view IDs
export type ViewId = 'mapView' | 'chatView' | 'logView' | 'videoView1' | 'videoView2' | 'videoView3';

// Type for saved layout
export interface SavedLayout {
  id: string;
  name: string;
  layout: MosaicNode<ViewId> | null;
}

// Define preset layouts
export const PRESET_LAYOUTS: Record<LayoutPresetId, MosaicNode<ViewId>> = {
  combat: {
    direction: 'row',
    first: {
      direction: 'column',
      first: 'mapView',
      second: 'videoView1',
      splitPercentage: 70,
    },
    second: {
      direction: 'column',
      first: 'chatView',
      second: 'logView',
      splitPercentage: 50,
    },
    splitPercentage: 60,
  },
  story: {
    direction: 'row',
    first: {
      direction: 'column',
      first: 'chatView',
      second: 'videoView1',
      splitPercentage: 70,
    },
    second: {
      direction: 'column',
      first: 'logView',
      second: 'videoView2',
      splitPercentage: 30,
    },
    splitPercentage: 70,
  },
  roleplay: {
    direction: 'row',
    first: {
      direction: 'column',
      first: 'videoView1',
      second: 'chatView',
      splitPercentage: 70,
    },
    second: {
      direction: 'column',
      first: 'logView',
      second: 'videoView2',
      splitPercentage: 30,
    },
    splitPercentage: 70,
  },
};

// Local storage key for user layout
const LAYOUT_STORAGE_KEY = 'storygate-layout';

// Interface for the settings state
export interface SettingsState {
  currentLayout: MosaicNode<ViewId> | null;
  savedLayouts: SavedLayout[];
  lastLayoutId: string | null;
}

// Load the initial layout from localStorage
const loadSavedLayout = (): MosaicNode<ViewId> | null => {
  try {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout) {
      return JSON.parse(savedLayout);
    }
  } catch (error) {
    console.error('Failed to load layout from localStorage:', error);
  }
  return PRESET_LAYOUTS.combat;
};

// Save layout to localStorage
const saveLayoutToStorage = (layout: MosaicNode<ViewId> | null): void => {
  try {
    if (layout) {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    }
  } catch (error) {
    console.error('Failed to save layout to localStorage:', error);
  }
};

// Create settings slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    currentLayout: loadSavedLayout(),
    savedLayouts: [],
    lastLayoutId: 'combat' as string | null,
  } as SettingsState,
  reducers: {
    // Update current layout
    updateLayout: (state, action: PayloadAction<MosaicNode<ViewId> | null>) => {
      state.currentLayout = action.payload;
      saveLayoutToStorage(action.payload);
    },
    
    // Reset layout to default combat view
    resetLayout: (state) => {
      state.currentLayout = PRESET_LAYOUTS.combat;
      state.lastLayoutId = 'combat';
      saveLayoutToStorage(PRESET_LAYOUTS.combat);
    },
    
    // Apply a preset layout
    applyPresetLayout: (state, action: PayloadAction<LayoutPresetId>) => {
      const presetId = action.payload;
      state.currentLayout = PRESET_LAYOUTS[presetId];
      state.lastLayoutId = presetId;
      saveLayoutToStorage(PRESET_LAYOUTS[presetId]);
    },
    
    // Save current layout with a name
    saveLayout: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const { id, name } = action.payload;
      if (state.currentLayout) {
        const savedLayout: SavedLayout = {
          id,
          name,
          layout: state.currentLayout,
        };
        
        state.savedLayouts.push(savedLayout);
        state.lastLayoutId = id;
      }
    },
    
    // Load a saved layout
    loadLayout: (state, action: PayloadAction<string>) => {
      const layoutId = action.payload;
      const savedLayout = state.savedLayouts.find(layout => layout.id === layoutId);
      
      if (savedLayout && savedLayout.layout) {
        state.currentLayout = savedLayout.layout;
        state.lastLayoutId = layoutId;
        saveLayoutToStorage(savedLayout.layout);
      }
    },
    
    // Delete a saved layout
    deleteLayout: (state, action: PayloadAction<string>) => {
      const layoutId = action.payload;
      state.savedLayouts = state.savedLayouts.filter(layout => layout.id !== layoutId);
      
      // If we deleted the active layout, reset to combat
      if (state.lastLayoutId === layoutId) {
        state.currentLayout = PRESET_LAYOUTS.combat;
        state.lastLayoutId = 'combat';
        saveLayoutToStorage(PRESET_LAYOUTS.combat);
      }
    },
  },
});

// Export actions
export const {
  updateLayout,
  resetLayout,
  applyPresetLayout,
  saveLayout,
  loadLayout,
  deleteLayout,
} = settingsSlice.actions;

// Export reducer
export default settingsSlice.reducer; 