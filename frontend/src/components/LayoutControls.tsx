import React, { useState } from 'react';
import { 
  Button, 
  ButtonGroup, 
  Popover, 
  Menu, 
  MenuItem, 
  Divider, 
  Dialog, 
  Classes, 
  FormGroup, 
  InputGroup,
  Intent
} from '@blueprintjs/core';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { 
  resetLayout, 
  applyPresetLayout, 
  saveLayout, 
  loadLayout, 
  deleteLayout,
  LayoutPresetId
} from '../store/slices/settingsSlice';
import { RootState } from '../store';
import { AppToaster } from '../App';

// Safe wrapper for using AppToaster
const safeShowToast = (props: any) => {
  if (AppToaster && typeof AppToaster.show === 'function') {
    try {
      AppToaster.show(props);
    } catch (error) {
      console.error('Failed to show toast:', error);
    }
  } else {
    console.log('Toast message (AppToaster not available):', props.message);
  }
};

/**
 * LayoutControls component
 * 
 * Provides UI controls for managing the game layout
 */
const LayoutControls: React.FC = () => {
  const dispatch = useDispatch();
  const lastLayoutId = useSelector((state: RootState) => state.settings.lastLayoutId);
  const savedLayouts = useSelector((state: RootState) => state.settings.savedLayouts);
  const currentLayout = useSelector((state: RootState) => state.settings.currentLayout);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  
  // Handle applying a preset layout
  const handleApplyPreset = (presetId: LayoutPresetId) => {
    dispatch(applyPresetLayout(presetId));
  };
  
  // Handle resetting the layout
  const handleResetLayout = () => {
    dispatch(resetLayout());
  };
  
  // Handle saving the current layout
  const handleSaveLayout = () => {
    if (layoutName.trim()) {
      dispatch(saveLayout({ 
        id: uuidv4(), 
        name: layoutName 
      }));
      setLayoutName('');
      setIsDialogOpen(false);
    }
  };
  
  // Handle loading a saved layout
  const handleLoadLayout = (layoutId: string) => {
    dispatch(loadLayout(layoutId));
  };
  
  // Handle deleting a saved layout
  const handleDeleteLayout = (layoutId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(deleteLayout(layoutId));
  };
  
  // Get the current preset name
  const getCurrentPresetName = (): string => {
    if (lastLayoutId === 'combat') return 'Combat View';
    if (lastLayoutId === 'story') return 'Story View';
    if (lastLayoutId === 'roleplay') return 'Roleplay View';
    
    // Check if it's a custom saved layout
    const customLayout = savedLayouts.find(layout => layout.id === lastLayoutId);
    if (customLayout) return customLayout.name;
    
    return 'Custom Layout';
  };
  
  return (
    <div className="layout-controls">
      <ButtonGroup minimal={true}>
        <Button 
          icon="reset" 
          text="Reset" 
          onClick={handleResetLayout} 
          title="Reset to combat layout"
        />
        
        <Popover
          content={
            <Menu>
              <MenuItem 
                text="Combat View" 
                icon="shield" 
                active={lastLayoutId === 'combat'}
                onClick={() => handleApplyPreset('combat')} 
              />
              <MenuItem 
                text="Story View" 
                icon="book" 
                active={lastLayoutId === 'story'}
                onClick={() => handleApplyPreset('story')} 
              />
              <MenuItem 
                text="Roleplay View" 
                icon="people" 
                active={lastLayoutId === 'roleplay'}
                onClick={() => handleApplyPreset('roleplay')} 
              />
              
              {savedLayouts.length > 0 && (
                <>
                  <Divider />
                  <MenuItem text="Saved Layouts" disabled={true} />
                  {savedLayouts.map((layout) => (
                    <MenuItem 
                      key={layout.id}
                      text={layout.name}
                      icon="floppy-disk"
                      active={lastLayoutId === layout.id}
                      onClick={() => handleLoadLayout(layout.id)}
                      labelElement={
                        <Button 
                          icon="trash" 
                          minimal={true} 
                          small={true}
                          onClick={(e) => handleDeleteLayout(layout.id, e)}
                        />
                      }
                    />
                  ))}
                </>
              )}
              
              <Divider />
              <MenuItem 
                text="Save Current Layout..." 
                icon="floppy-disk" 
                onClick={() => setIsDialogOpen(true)} 
              />
            </Menu>
          }
          placement="bottom"
        >
          <Button 
            icon="layout-grid" 
            rightIcon="caret-down" 
            text={getCurrentPresetName()} 
          />
        </Popover>
      </ButtonGroup>
      
      <Button
        icon="bug"
        className="glass-btn" 
        onClick={() => {
          console.log('Current layout state:', currentLayout);
          safeShowToast({
            message: currentLayout ? 'Layout exists!' : 'No layout found!',
            intent: currentLayout ? Intent.SUCCESS : Intent.DANGER
          });
        }}
        style={{ marginLeft: '8px' }}
      >
        Debug
      </Button>
      
      <Button
        icon="info-sign"
        className="glass-btn" 
        onClick={() => {
          console.log('Debug info:');
          console.log('- Available components: MapPanel, ChatPanel, ActionBar, TurnIndicator, etc.');
          console.log('- Redux state:', {
            currentLayout,
            savedLayouts,
            lastLayoutId
          });
          
          safeShowToast({
            message: 'Debug info logged to console',
            intent: Intent.PRIMARY
          });
        }}
        style={{ marginLeft: '8px' }}
      >
        Info
      </Button>
      
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Save Layout"
        className={Classes.DARK}
      >
        <div className={Classes.DIALOG_BODY}>
          <FormGroup
            label="Layout Name"
            labelFor="layout-name"
            helperText="Enter a name for your custom layout"
          >
            <InputGroup
              id="layout-name"
              placeholder="My Custom Layout"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              autoFocus
            />
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              intent={Intent.PRIMARY} 
              onClick={handleSaveLayout}
              disabled={!layoutName.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default LayoutControls; 