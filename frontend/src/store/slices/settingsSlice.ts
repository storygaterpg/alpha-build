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

// Audio settings
export interface AudioSettings {
  masterVolume: number;
  effectsVolume: number;
  musicVolume: number;
  voiceVolume: number;
  muteAll: boolean;
  enableSpatialAudio: boolean;
}

// Graphics settings
export interface GraphicsSettings {
  renderQuality: 'low' | 'medium' | 'high' | 'ultra';
  antiAliasing: boolean;
  shadows: boolean;
  particleEffects: boolean;
  animationSpeed: number;
  showFPS: boolean;
  vsync: boolean;
}

// Game controls settings
export interface ControlsSettings {
  keyBindings: Record<string, string>;
  mouseSensitivity: number;
  invertMouse: boolean;
  doubleClickSpeed: number;
  dragThreshold: number;
  enableTooltips: boolean;
  tooltipDelay: number;
}

// Preferences settings
export interface PreferencesSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  showTutorials: boolean;
  enableAnimations: boolean;
}

// Profile settings
export interface ProfileSettings {
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  isPublic: boolean;
  allowFriendRequests: boolean;
  showOnlineStatus: boolean;
}

// Privacy settings
export interface PrivacySettings {
  shareGameData: boolean;
  allowAnalytics: boolean;
  showInLeaderboards: boolean;
  allowDirectMessages: boolean;
  blockList: string[];
  twoFactorEnabled: boolean;
}

// Notification settings
export interface NotificationSettings {
  enableDesktopNotifications: boolean;
  enableSoundNotifications: boolean;
  gameEvents: boolean;
  chatMessages: boolean;
  friendRequests: boolean;
  systemUpdates: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// Map-specific settings
export interface MapSettings {
  gridVisible: boolean;
  gridColor: string;
  gridOpacity: number;
  showCoordinates: boolean;
  enableMinimap: boolean;
  minimapPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  zoomSpeed: number;
  panSpeed: number;
  enableMouseWheelZoom: boolean;
  showHealthBars: boolean;
  showNameTags: boolean;
  fogOfWar: boolean;
  measurementUnits: 'feet' | 'meters' | 'squares';
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
    second: 'logView',
    splitPercentage: 70,
  },
  roleplay: {
    direction: 'row',
    first: {
      direction: 'column',
      first: 'videoView1',
      second: 'logView',
      splitPercentage: 70,
    },
    second: 'chatView',
    splitPercentage: 70,
  },
};

// Default settings
const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 80,
  effectsVolume: 75,
  musicVolume: 60,
  voiceVolume: 85,
  muteAll: false,
  enableSpatialAudio: true,
};

const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  renderQuality: 'high',
  antiAliasing: true,
  shadows: true,
  particleEffects: true,
  animationSpeed: 1,
  showFPS: false,
  vsync: true,
};

const DEFAULT_CONTROLS_SETTINGS: ControlsSettings = {
  keyBindings: {
    'move-up': 'w',
    'move-down': 's',
    'move-left': 'a',
    'move-right': 'd',
    'zoom-in': '=',
    'zoom-out': '-',
    'pan-mode': ' ',
    'select-all': 'ctrl+a',
    'delete': 'Delete',
    'undo': 'ctrl+z',
    'redo': 'ctrl+y',
  },
  mouseSensitivity: 50,
  invertMouse: false,
  doubleClickSpeed: 500,
  dragThreshold: 5,
  enableTooltips: true,
  tooltipDelay: 1000,
};

const DEFAULT_PREFERENCES_SETTINGS: PreferencesSettings = {
  theme: 'auto',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  autoSave: true,
  autoSaveInterval: 5,
  showTutorials: true,
  enableAnimations: true,
};

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  displayName: '',
  email: '',
  avatar: '',
  bio: '',
  isPublic: true,
  allowFriendRequests: true,
  showOnlineStatus: true,
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  shareGameData: false,
  allowAnalytics: true,
  showInLeaderboards: true,
  allowDirectMessages: true,
  blockList: [],
  twoFactorEnabled: false,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enableDesktopNotifications: true,
  enableSoundNotifications: true,
  gameEvents: true,
  chatMessages: true,
  friendRequests: true,
  systemUpdates: true,
  emailNotifications: false,
  pushNotifications: true,
};

const DEFAULT_MAP_SETTINGS: MapSettings = {
  gridVisible: true,
  gridColor: '#333333',
  gridOpacity: 50,
  showCoordinates: false,
  enableMinimap: true,
  minimapPosition: 'top-right',
  zoomSpeed: 10,
  panSpeed: 10,
  enableMouseWheelZoom: true,
  showHealthBars: true,
  showNameTags: true,
  fogOfWar: false,
  measurementUnits: 'feet',
};

// Local storage keys
const LAYOUT_STORAGE_KEY = 'storygate-layout';
const AUDIO_STORAGE_KEY = 'storygate-audio';
const GRAPHICS_STORAGE_KEY = 'storygate-graphics';
const CONTROLS_STORAGE_KEY = 'storygate-controls';
const PREFERENCES_STORAGE_KEY = 'storygate-preferences';
const PROFILE_STORAGE_KEY = 'storygate-profile';
const PRIVACY_STORAGE_KEY = 'storygate-privacy';
const NOTIFICATIONS_STORAGE_KEY = 'storygate-notifications';
const MAP_STORAGE_KEY = 'storygate-map';

// Utility functions for localStorage
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
};

// Interface for the settings state
export interface SettingsState {
  // Layout settings (existing)
  currentLayout: MosaicNode<ViewId> | null;
  savedLayouts: SavedLayout[];
  lastLayoutId: string | null;
  
  // New comprehensive settings
  audio: AudioSettings;
  graphics: GraphicsSettings;
  controls: ControlsSettings;
  preferences: PreferencesSettings;
  profile: ProfileSettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  map: MapSettings;
  
  // UI state
  activeCategory: string;
  searchQuery: string;
  hasUnsavedChanges: boolean;
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
    // Layout settings (existing)
    currentLayout: loadSavedLayout(),
    savedLayouts: [],
    lastLayoutId: 'combat' as string | null,
    
    // Load all settings from localStorage with defaults
    audio: loadFromStorage(AUDIO_STORAGE_KEY, DEFAULT_AUDIO_SETTINGS),
    graphics: loadFromStorage(GRAPHICS_STORAGE_KEY, DEFAULT_GRAPHICS_SETTINGS),
    controls: loadFromStorage(CONTROLS_STORAGE_KEY, DEFAULT_CONTROLS_SETTINGS),
    preferences: loadFromStorage(PREFERENCES_STORAGE_KEY, DEFAULT_PREFERENCES_SETTINGS),
    profile: loadFromStorage(PROFILE_STORAGE_KEY, DEFAULT_PROFILE_SETTINGS),
    privacy: loadFromStorage(PRIVACY_STORAGE_KEY, DEFAULT_PRIVACY_SETTINGS),
    notifications: loadFromStorage(NOTIFICATIONS_STORAGE_KEY, DEFAULT_NOTIFICATION_SETTINGS),
    map: loadFromStorage(MAP_STORAGE_KEY, DEFAULT_MAP_SETTINGS),
    
    // UI state
    activeCategory: 'general',
    searchQuery: '',
    hasUnsavedChanges: false,
  } as SettingsState,
  reducers: {
    // Existing layout actions
    updateLayout: (state, action: PayloadAction<MosaicNode<ViewId> | null>) => {
      state.currentLayout = action.payload;
      saveLayoutToStorage(action.payload);
    },
    
    resetLayout: (state) => {
      state.currentLayout = PRESET_LAYOUTS.combat;
      state.lastLayoutId = 'combat';
      saveLayoutToStorage(PRESET_LAYOUTS.combat);
    },
    
    applyPresetLayout: (state, action: PayloadAction<LayoutPresetId>) => {
      const presetId = action.payload;
      state.currentLayout = PRESET_LAYOUTS[presetId];
      state.lastLayoutId = presetId;
      saveLayoutToStorage(PRESET_LAYOUTS[presetId]);
    },
    
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
    
    loadLayout: (state, action: PayloadAction<string>) => {
      const layoutId = action.payload;
      const savedLayout = state.savedLayouts.find(layout => layout.id === layoutId);
      
      if (savedLayout && savedLayout.layout) {
        state.currentLayout = savedLayout.layout;
        state.lastLayoutId = layoutId;
        saveLayoutToStorage(savedLayout.layout);
      }
    },
    
    deleteLayout: (state, action: PayloadAction<string>) => {
      const layoutId = action.payload;
      state.savedLayouts = state.savedLayouts.filter(layout => layout.id !== layoutId);
      
      if (state.lastLayoutId === layoutId) {
        state.currentLayout = PRESET_LAYOUTS.combat;
        state.lastLayoutId = 'combat';
        saveLayoutToStorage(PRESET_LAYOUTS.combat);
      }
    },

    // New comprehensive settings actions
    updateAudioSettings: (state, action: PayloadAction<Partial<AudioSettings>>) => {
      state.audio = { ...state.audio, ...action.payload };
      saveToStorage(AUDIO_STORAGE_KEY, state.audio);
    },

    updateGraphicsSettings: (state, action: PayloadAction<Partial<GraphicsSettings>>) => {
      state.graphics = { ...state.graphics, ...action.payload };
      saveToStorage(GRAPHICS_STORAGE_KEY, state.graphics);
    },

    updateControlsSettings: (state, action: PayloadAction<Partial<ControlsSettings>>) => {
      state.controls = { ...state.controls, ...action.payload };
      saveToStorage(CONTROLS_STORAGE_KEY, state.controls);
    },

    updatePreferencesSettings: (state, action: PayloadAction<Partial<PreferencesSettings>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
      saveToStorage(PREFERENCES_STORAGE_KEY, state.preferences);
    },

    updateProfileSettings: (state, action: PayloadAction<Partial<ProfileSettings>>) => {
      state.profile = { ...state.profile, ...action.payload };
      saveToStorage(PROFILE_STORAGE_KEY, state.profile);
      state.hasUnsavedChanges = true;
    },

    updatePrivacySettings: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
      saveToStorage(PRIVACY_STORAGE_KEY, state.privacy);
    },

    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
      saveToStorage(NOTIFICATIONS_STORAGE_KEY, state.notifications);
    },

    updateMapSettings: (state, action: PayloadAction<Partial<MapSettings>>) => {
      state.map = { ...state.map, ...action.payload };
      saveToStorage(MAP_STORAGE_KEY, state.map);
    },

    // Bulk update action for key bindings
    updateKeyBinding: (state, action: PayloadAction<{ action: string; key: string }>) => {
      state.controls.keyBindings[action.payload.action] = action.payload.key;
      saveToStorage(CONTROLS_STORAGE_KEY, state.controls);
    },

    // Reset actions
    resetAudioSettings: (state) => {
      state.audio = DEFAULT_AUDIO_SETTINGS;
      saveToStorage(AUDIO_STORAGE_KEY, state.audio);
    },

    resetGraphicsSettings: (state) => {
      state.graphics = DEFAULT_GRAPHICS_SETTINGS;
      saveToStorage(GRAPHICS_STORAGE_KEY, state.graphics);
    },

    resetControlsSettings: (state) => {
      state.controls = DEFAULT_CONTROLS_SETTINGS;
      saveToStorage(CONTROLS_STORAGE_KEY, state.controls);
    },

    resetPreferencesSettings: (state) => {
      state.preferences = DEFAULT_PREFERENCES_SETTINGS;
      saveToStorage(PREFERENCES_STORAGE_KEY, state.preferences);
    },

    resetAllSettings: (state) => {
      state.audio = DEFAULT_AUDIO_SETTINGS;
      state.graphics = DEFAULT_GRAPHICS_SETTINGS;
      state.controls = DEFAULT_CONTROLS_SETTINGS;
      state.preferences = DEFAULT_PREFERENCES_SETTINGS;
      state.notifications = DEFAULT_NOTIFICATION_SETTINGS;
      state.map = DEFAULT_MAP_SETTINGS;
      
      saveToStorage(AUDIO_STORAGE_KEY, state.audio);
      saveToStorage(GRAPHICS_STORAGE_KEY, state.graphics);
      saveToStorage(CONTROLS_STORAGE_KEY, state.controls);
      saveToStorage(PREFERENCES_STORAGE_KEY, state.preferences);
      saveToStorage(NOTIFICATIONS_STORAGE_KEY, state.notifications);
      saveToStorage(MAP_STORAGE_KEY, state.map);
    },

    // UI state actions
    setActiveCategory: (state, action: PayloadAction<string>) => {
      state.activeCategory = action.payload;
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    markChangesSaved: (state) => {
      state.hasUnsavedChanges = false;
    },

    // Privacy-specific actions
    addToBlockList: (state, action: PayloadAction<string>) => {
      if (!state.privacy.blockList.includes(action.payload)) {
        state.privacy.blockList.push(action.payload);
        saveToStorage(PRIVACY_STORAGE_KEY, state.privacy);
      }
    },

    removeFromBlockList: (state, action: PayloadAction<string>) => {
      state.privacy.blockList = state.privacy.blockList.filter(user => user !== action.payload);
      saveToStorage(PRIVACY_STORAGE_KEY, state.privacy);
    },
  },
});

// Export actions
export const {
  // Layout actions (existing)
  updateLayout,
  resetLayout,
  applyPresetLayout,
  saveLayout,
  loadLayout,
  deleteLayout,
  
  // New settings actions
  updateAudioSettings,
  updateGraphicsSettings,
  updateControlsSettings,
  updatePreferencesSettings,
  updateProfileSettings,
  updatePrivacySettings,
  updateNotificationSettings,
  updateMapSettings,
  updateKeyBinding,
  
  // Reset actions
  resetAudioSettings,
  resetGraphicsSettings,
  resetControlsSettings,
  resetPreferencesSettings,
  resetAllSettings,
  
  // UI actions
  setActiveCategory,
  setSearchQuery,
  markChangesSaved,
  
  // Privacy actions
  addToBlockList,
  removeFromBlockList,
} = settingsSlice.actions;

// Export reducer
export default settingsSlice.reducer; 