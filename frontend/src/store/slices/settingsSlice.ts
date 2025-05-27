import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MosaicNode } from 'react-mosaic-component';

// Type for layout presets
export type LayoutPresetId = 'combat' | 'story' | 'roleplay';

// Type for saved layout
export interface SavedLayout {
  id: string;
  name: string;
  layout: MosaicNode<ViewId> | null;
}

// Type for our view IDs - matches the Game.tsx component
export type ViewId = 'mapView' | 'chatView' | 'logView' | 'actionView' | 'turnView' | 'characterView' | 'videoView';

// Define preset layouts
export const PRESET_LAYOUTS: Record<LayoutPresetId, MosaicNode<ViewId>> = {
  combat: {
    direction: 'row',
    first: {
      direction: 'column',
      first: 'mapView',
      second: 'videoView',
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
      second: 'videoView',
      splitPercentage: 70,
    },
    second: {
      direction: 'column',
      first: 'logView',
      second: 'videoView',
      splitPercentage: 30,
    },
    splitPercentage: 70,
  },
  roleplay: {
    direction: 'row',
    first: {
      direction: 'column',
      first: 'videoView',
      second: 'chatView',
      splitPercentage: 70,
    },
    second: {
      direction: 'column',
      first: 'logView',
      second: 'videoView',
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

// Load the saved layout ID from localStorage
const loadSavedLayoutId = (): string | null => {
  try {
    const savedId = localStorage.getItem(`${LAYOUT_STORAGE_KEY}-id`);
    if (savedId && (savedId === 'combat' || savedId === 'story' || savedId === 'roleplay')) {
      return savedId;
    }
  } catch (error) {
    console.error('Failed to load layout ID from localStorage:', error);
  }
  return 'combat';
};

// Initial state
const initialState: SettingsState = {
  currentLayout: loadSavedLayout(),
  savedLayouts: [],
  lastLayoutId: loadSavedLayoutId(),
};

// Create the settings slice
export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Update the current layout
    updateLayout: (state, action: PayloadAction<MosaicNode<ViewId> | null>) => {
      state.currentLayout = action.payload;
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(action.payload));
      } catch (error) {
        console.error('Failed to save layout to localStorage:', error);
      }
    },

    // Apply a preset layout
    applyPresetLayout: (state, action: PayloadAction<LayoutPresetId>) => {
      const presetId = action.payload;
      const preset = PRESET_LAYOUTS[presetId];
      
      if (preset) {
        state.currentLayout = preset;
        state.lastLayoutId = presetId;
        
        try {
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(preset));
          localStorage.setItem(`${LAYOUT_STORAGE_KEY}-id`, presetId);
        } catch (error) {
          console.error('Failed to save preset layout to localStorage:', error);
        }
      }
    },

    // Reset to combat layout
    resetLayout: (state) => {
      state.currentLayout = PRESET_LAYOUTS.combat;
      state.lastLayoutId = 'combat';
      
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(PRESET_LAYOUTS.combat));
        localStorage.setItem(`${LAYOUT_STORAGE_KEY}-id`, 'combat');
      } catch (error) {
        console.error('Failed to reset layout in localStorage:', error);
      }
    },

    // Save the current layout with a name
    saveLayout: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const { id, name } = action.payload;
      
      // Check if we're updating an existing layout
      const existingIndex = state.savedLayouts.findIndex(layout => layout.id === id);
      
      if (existingIndex >= 0) {
        // Update existing layout
        state.savedLayouts[existingIndex] = {
          id,
          name,
          layout: state.currentLayout
        };
      } else {
        // Add new layout
        state.savedLayouts.push({
          id,
          name,
          layout: state.currentLayout
        });
      }
      
      // Update local storage
      try {
        localStorage.setItem('storygate-saved-layouts', JSON.stringify(state.savedLayouts));
      } catch (error) {
        console.error('Failed to save layouts to localStorage:', error);
      }
    },

    // Load a saved layout
    loadLayout: (state, action: PayloadAction<string>) => {
      const layoutId = action.payload;
      const savedLayout = state.savedLayouts.find(layout => layout.id === layoutId);
      
      if (savedLayout && savedLayout.layout) {
        state.currentLayout = savedLayout.layout;
        state.lastLayoutId = layoutId;
        
        try {
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(savedLayout.layout));
          localStorage.setItem(`${LAYOUT_STORAGE_KEY}-id`, layoutId);
        } catch (error) {
          console.error('Failed to load layout from localStorage:', error);
        }
      }
    },
    
    // Delete a saved layout
    deleteLayout: (state, action: PayloadAction<string>) => {
      const layoutId = action.payload;
      state.savedLayouts = state.savedLayouts.filter(layout => layout.id !== layoutId);
      
      // Update local storage
      try {
        localStorage.setItem('storygate-saved-layouts', JSON.stringify(state.savedLayouts));
      } catch (error) {
        console.error('Failed to update saved layouts in localStorage:', error);
      }
    },
    
    // Load saved layouts from localStorage (called on app init)
    loadSavedLayouts: (state) => {
      try {
        const savedLayouts = localStorage.getItem('storygate-saved-layouts');
        if (savedLayouts) {
          state.savedLayouts = JSON.parse(savedLayouts);
        }
      } catch (error) {
        console.error('Failed to load saved layouts from localStorage:', error);
      }
    }
  }
});

// Export actions
export const {
  updateLayout,
  applyPresetLayout,
  resetLayout,
  saveLayout,
  loadLayout,
  deleteLayout,
  loadSavedLayouts
} = settingsSlice.actions;

// Export reducer
export default settingsSlice.reducer; 