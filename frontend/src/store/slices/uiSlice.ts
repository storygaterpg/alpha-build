import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UI_SHOW_CHARACTER_SHEET, UI_HIDE_CHARACTER_SHEET } from '../actionTypes';

// UI state interface
export interface UIState {
  activePanel: string | null;
  characterSheet: {
    isOpen: boolean;
    actorId: string | null;
  };
  sidebar: {
    isOpen: boolean;
    activeTab: string;
  };
  modals: {
    settings: boolean;
    help: boolean;
    about: boolean;
  };
  confirmDialogs: {
    [key: string]: boolean;
  };
}

const initialState: UIState = {
  activePanel: null,
  characterSheet: {
    isOpen: false,
    actorId: null,
  },
  sidebar: {
    isOpen: true,
    activeTab: 'chat',
  },
  modals: {
    settings: false,
    help: false,
    about: false,
  },
  confirmDialogs: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Set active panel
    setActivePanel: (state, action: PayloadAction<string | null>) => {
      state.activePanel = action.payload;
    },
    
    // Character sheet
    showCharacterSheet: (state, action: PayloadAction<string>) => {
      state.characterSheet.isOpen = true;
      state.characterSheet.actorId = action.payload;
    },
    
    hideCharacterSheet: (state) => {
      state.characterSheet.isOpen = false;
    },
    
    // Sidebar
    toggleSidebar: (state, action: PayloadAction<boolean | undefined>) => {
      state.sidebar.isOpen = action.payload !== undefined ? action.payload : !state.sidebar.isOpen;
    },
    
    setSidebarTab: (state, action: PayloadAction<string>) => {
      state.sidebar.activeTab = action.payload;
    },
    
    // Modals
    showModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      if (action.payload in state.modals) {
        state.modals[action.payload] = true;
      }
    },
    
    hideModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      if (action.payload in state.modals) {
        state.modals[action.payload] = false;
      }
    },
    
    // Confirm dialogs
    showConfirmDialog: (state, action: PayloadAction<string>) => {
      state.confirmDialogs[action.payload] = true;
    },
    
    hideConfirmDialog: (state, action: PayloadAction<string>) => {
      state.confirmDialogs[action.payload] = false;
    }
  }
});

// Export actions
export const {
  setActivePanel,
  showCharacterSheet,
  hideCharacterSheet,
  toggleSidebar,
  setSidebarTab,
  showModal,
  hideModal,
  showConfirmDialog,
  hideConfirmDialog
} = uiSlice.actions;

// Thunk actions
export const showCharacterSheetAction = (actorId: string) => ({
  type: UI_SHOW_CHARACTER_SHEET,
  payload: { actorId }
});

export const hideCharacterSheetAction = () => ({
  type: UI_HIDE_CHARACTER_SHEET
});

export default uiSlice.reducer; 