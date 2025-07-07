import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Tab,
  Tabs,
  Button,
  Intent,
  ButtonGroup,
  Divider,
  InputGroup,
  Icon,
  H3,
  H4,
  Callout,
  Tooltip,
  Switch,
  Slider,
  HTMLSelect,
  FormGroup,
  TextArea,
  Tag,
  Classes,
} from '@blueprintjs/core';
import { RootState } from '../store';
import {
  updateAudioSettings,
  updateGraphicsSettings,
  updateControlsSettings,
  updatePreferencesSettings,
  updateProfileSettings,
  updatePrivacySettings,
  updateNotificationSettings,
  updateMapSettings,
  updateKeyBinding,
  resetAudioSettings,
  resetGraphicsSettings,
  resetControlsSettings,
  resetPreferencesSettings,
  resetAllSettings,
  setActiveCategory,
  setSearchQuery,
  markChangesSaved,
  addToBlockList,
  removeFromBlockList,
} from '../store/slices/settingsSlice';
import '../styles/SettingsPage.css';

interface SettingItemProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  tooltip?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({ title, description, children, tooltip }) => {
  const content = (
    <div className="setting-item">
      <div className="setting-info">
        <div className="setting-title">{title}</div>
        {description && <div className="setting-description">{description}</div>}
      </div>
      <div className="setting-control">
        {children}
      </div>
    </div>
  );

  return tooltip ? (
    <Tooltip content={tooltip} position="top">
      {content}
    </Tooltip>
  ) : content;
};

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const navigate = useNavigate();
  
  const [tempBlockUser, setTempBlockUser] = useState('');
  const [keyBindingCapture, setKeyBindingCapture] = useState<string | null>(null);

  // Search functionality
  const filteredSettings = useMemo(() => {
    if (!settings.searchQuery) return null;
    
    const query = settings.searchQuery.toLowerCase();
    const matchedSettings: { category: string; matches: string[] }[] = [];
    
    // Define searchable content for each category
    const searchableContent = {
      general: ['theme', 'language', 'timezone', 'date format', 'time format', 'auto save', 'tutorials', 'animations'],
      audio: ['master volume', 'effects', 'music', 'voice', 'mute', 'spatial audio', 'sound'],
      graphics: ['quality', 'anti-aliasing', 'shadows', 'particles', 'animation speed', 'fps', 'vsync', 'render'],
      controls: ['key bindings', 'mouse', 'sensitivity', 'tooltips', 'keyboard', 'shortcuts'],
      map: ['grid', 'coordinates', 'minimap', 'zoom', 'pan', 'health bars', 'name tags', 'fog of war'],
      profile: ['display name', 'email', 'avatar', 'bio', 'public', 'friends'],
      privacy: ['data sharing', 'analytics', 'leaderboards', 'messages', 'block list', 'two factor'],
      notifications: ['desktop', 'sound', 'game events', 'chat', 'friend requests', 'email', 'push'],
    };
    
    Object.entries(searchableContent).forEach(([category, content]) => {
      const matches = content.filter(item => item.includes(query));
      if (matches.length > 0) {
        matchedSettings.push({ category, matches });
      }
    });
    
    return matchedSettings;
  }, [settings.searchQuery]);

  const handleKeyCapture = (action: string, event: React.KeyboardEvent) => {
    event.preventDefault();
    const key = event.key;
    dispatch(updateKeyBinding({ action, key }));
    setKeyBindingCapture(null);
  };

  const handleAddBlockUser = () => {
    if (tempBlockUser.trim()) {
      dispatch(addToBlockList(tempBlockUser.trim()));
      setTempBlockUser('');
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <H3>General Preferences</H3>
      
      <SettingItem 
        title="Theme" 
        description="Choose your preferred color scheme"
        tooltip="Auto theme will follow your system preference"
      >
        <HTMLSelect
          value={settings.preferences.theme}
          onChange={(e) => dispatch(updatePreferencesSettings({ theme: e.target.value as any }))}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </HTMLSelect>
      </SettingItem>

      <SettingItem 
        title="Language" 
        description="Select your preferred language"
      >
        <HTMLSelect
          value={settings.preferences.language}
          onChange={(e) => dispatch(updatePreferencesSettings({ language: e.target.value }))}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="ja">日本語</option>
        </HTMLSelect>
      </SettingItem>

      <SettingItem 
        title="Date Format" 
        description="How dates are displayed throughout the app"
      >
        <HTMLSelect
          value={settings.preferences.dateFormat}
          onChange={(e) => dispatch(updatePreferencesSettings({ dateFormat: e.target.value as any }))}
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </HTMLSelect>
      </SettingItem>

      <SettingItem 
        title="Time Format" 
        description="12-hour or 24-hour time display"
      >
        <HTMLSelect
          value={settings.preferences.timeFormat}
          onChange={(e) => dispatch(updatePreferencesSettings({ timeFormat: e.target.value as any }))}
        >
          <option value="12h">12-hour</option>
          <option value="24h">24-hour</option>
        </HTMLSelect>
      </SettingItem>

      <SettingItem 
        title="Auto-save" 
        description="Automatically save your progress"
      >
        <Switch
          checked={settings.preferences.autoSave}
          onChange={(e) => dispatch(updatePreferencesSettings({ autoSave: e.currentTarget.checked }))}
        />
      </SettingItem>

      {settings.preferences.autoSave && (
        <SettingItem 
          title="Auto-save Interval" 
          description="How often to auto-save (minutes)"
        >
          <Slider
            min={1}
            max={30}
            stepSize={1}
            labelStepSize={5}
            value={settings.preferences.autoSaveInterval}
            onChange={(value) => dispatch(updatePreferencesSettings({ autoSaveInterval: value }))}
            labelRenderer={(value) => `${value}m`}
          />
        </SettingItem>
      )}

      <SettingItem 
        title="Show Tutorials" 
        description="Display helpful tips and tutorials"
      >
        <Switch
          checked={settings.preferences.showTutorials}
          onChange={(e) => dispatch(updatePreferencesSettings({ showTutorials: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Enable Animations" 
        description="Show smooth transitions and animations"
      >
        <Switch
          checked={settings.preferences.enableAnimations}
          onChange={(e) => dispatch(updatePreferencesSettings({ enableAnimations: e.currentTarget.checked }))}
        />
      </SettingItem>

      <div className="settings-actions">
        <Button 
          intent={Intent.WARNING} 
          onClick={() => dispatch(resetPreferencesSettings())}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );

  const renderAudioSettings = () => (
    <div className="settings-section">
      <H3>Audio Settings</H3>
      
      <SettingItem 
        title="Mute All Audio" 
        description="Temporarily disable all sound"
      >
        <Switch
          checked={settings.audio.muteAll}
          onChange={(e) => dispatch(updateAudioSettings({ muteAll: e.currentTarget.checked }))}
        />
      </SettingItem>

      {!settings.audio.muteAll && (
        <>
          <SettingItem 
            title="Master Volume" 
            description="Overall volume level"
          >
            <Slider
              min={0}
              max={100}
              stepSize={1}
              labelStepSize={25}
              value={settings.audio.masterVolume}
              onChange={(value) => dispatch(updateAudioSettings({ masterVolume: value }))}
              labelRenderer={(value) => `${value}%`}
            />
          </SettingItem>

          <SettingItem 
            title="Effects Volume" 
            description="Sound effects and UI sounds"
          >
            <Slider
              min={0}
              max={100}
              stepSize={1}
              labelStepSize={25}
              value={settings.audio.effectsVolume}
              onChange={(value) => dispatch(updateAudioSettings({ effectsVolume: value }))}
              labelRenderer={(value) => `${value}%`}
            />
          </SettingItem>

          <SettingItem 
            title="Music Volume" 
            description="Background music and ambience"
          >
            <Slider
              min={0}
              max={100}
              stepSize={1}
              labelStepSize={25}
              value={settings.audio.musicVolume}
              onChange={(value) => dispatch(updateAudioSettings({ musicVolume: value }))}
              labelRenderer={(value) => `${value}%`}
            />
          </SettingItem>

          <SettingItem 
            title="Voice Volume" 
            description="Character voices and voice chat"
          >
            <Slider
              min={0}
              max={100}
              stepSize={1}
              labelStepSize={25}
              value={settings.audio.voiceVolume}
              onChange={(value) => dispatch(updateAudioSettings({ voiceVolume: value }))}
              labelRenderer={(value) => `${value}%`}
            />
          </SettingItem>

          <SettingItem 
            title="Spatial Audio" 
            description="3D positional audio effects"
            tooltip="Makes sounds appear to come from different directions based on their position"
          >
            <Switch
              checked={settings.audio.enableSpatialAudio}
              onChange={(e) => dispatch(updateAudioSettings({ enableSpatialAudio: e.currentTarget.checked }))}
            />
          </SettingItem>
        </>
      )}

      <div className="settings-actions">
        <Button 
          intent={Intent.WARNING} 
          onClick={() => dispatch(resetAudioSettings())}
        >
          Reset Audio Settings
        </Button>
      </div>
    </div>
  );

  const renderGraphicsSettings = () => (
    <div className="settings-section">
      <H3>Graphics & Performance</H3>
      
      <SettingItem 
        title="Render Quality" 
        description="Overall graphics quality preset"
      >
        <HTMLSelect
          value={settings.graphics.renderQuality}
          onChange={(e) => dispatch(updateGraphicsSettings({ renderQuality: e.target.value as any }))}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
        </HTMLSelect>
      </SettingItem>

      <SettingItem 
        title="Anti-aliasing" 
        description="Smooth jagged edges"
        tooltip="Reduces pixelated edges but may impact performance"
      >
        <Switch
          checked={settings.graphics.antiAliasing}
          onChange={(e) => dispatch(updateGraphicsSettings({ antiAliasing: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Shadows" 
        description="Enable shadow rendering"
      >
        <Switch
          checked={settings.graphics.shadows}
          onChange={(e) => dispatch(updateGraphicsSettings({ shadows: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Particle Effects" 
        description="Enable visual particle effects"
      >
        <Switch
          checked={settings.graphics.particleEffects}
          onChange={(e) => dispatch(updateGraphicsSettings({ particleEffects: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Animation Speed" 
        description="Speed multiplier for animations"
      >
        <Slider
          min={0.25}
          max={2}
          stepSize={0.25}
          labelStepSize={0.5}
          value={settings.graphics.animationSpeed}
          onChange={(value) => dispatch(updateGraphicsSettings({ animationSpeed: value }))}
          labelRenderer={(value) => `${value}x`}
        />
      </SettingItem>

      <SettingItem 
        title="Show FPS Counter" 
        description="Display frames per second"
      >
        <Switch
          checked={settings.graphics.showFPS}
          onChange={(e) => dispatch(updateGraphicsSettings({ showFPS: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="V-Sync" 
        description="Synchronize with monitor refresh rate"
        tooltip="Prevents screen tearing but may introduce input lag"
      >
        <Switch
          checked={settings.graphics.vsync}
          onChange={(e) => dispatch(updateGraphicsSettings({ vsync: e.currentTarget.checked }))}
        />
      </SettingItem>

      <div className="settings-actions">
        <Button 
          intent={Intent.WARNING} 
          onClick={() => dispatch(resetGraphicsSettings())}
        >
          Reset Graphics Settings
        </Button>
      </div>
    </div>
  );

  const renderControlsSettings = () => (
    <div className="settings-section">
      <H3>Controls & Input</H3>
      
      <SettingItem 
        title="Mouse Sensitivity" 
        description="Adjust mouse movement speed"
      >
        <Slider
          min={1}
          max={100}
          stepSize={1}
          labelStepSize={25}
          value={settings.controls.mouseSensitivity}
          onChange={(value) => dispatch(updateControlsSettings({ mouseSensitivity: value }))}
          labelRenderer={(value) => `${value}%`}
        />
      </SettingItem>

      <SettingItem 
        title="Invert Mouse" 
        description="Reverse mouse Y-axis movement"
      >
        <Switch
          checked={settings.controls.invertMouse}
          onChange={(e) => dispatch(updateControlsSettings({ invertMouse: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Enable Tooltips" 
        description="Show helpful tooltips on hover"
      >
        <Switch
          checked={settings.controls.enableTooltips}
          onChange={(e) => dispatch(updateControlsSettings({ enableTooltips: e.currentTarget.checked }))}
        />
      </SettingItem>

      {settings.controls.enableTooltips && (
        <SettingItem 
          title="Tooltip Delay" 
          description="Delay before showing tooltips (ms)"
        >
          <Slider
            min={0}
            max={3000}
            stepSize={100}
            labelStepSize={1000}
            value={settings.controls.tooltipDelay}
            onChange={(value) => dispatch(updateControlsSettings({ tooltipDelay: value }))}
            labelRenderer={(value) => `${value}ms`}
          />
        </SettingItem>
      )}

      <Divider />
      
      <H4>Key Bindings</H4>
      <div className="key-bindings">
        {Object.entries(settings.controls.keyBindings).map(([action, key]) => (
          <SettingItem 
            key={action}
            title={action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            description={`Currently: ${key}`}
          >
            <Button
              text={keyBindingCapture === action ? "Press a key..." : "Change"}
              intent={keyBindingCapture === action ? Intent.PRIMARY : Intent.NONE}
              onClick={() => setKeyBindingCapture(action)}
              onKeyDown={keyBindingCapture === action ? (e) => handleKeyCapture(action, e) : undefined}
              autoFocus={keyBindingCapture === action}
            />
          </SettingItem>
        ))}
      </div>

      <div className="settings-actions">
        <Button 
          intent={Intent.WARNING} 
          onClick={() => dispatch(resetControlsSettings())}
        >
          Reset Controls
        </Button>
      </div>
    </div>
  );

  const renderMapSettings = () => (
    <div className="settings-section">
      <H3>Map & Display</H3>
      
      <SettingItem 
        title="Show Grid" 
        description="Display the map grid overlay"
      >
        <Switch
          checked={settings.map.gridVisible}
          onChange={(e) => dispatch(updateMapSettings({ gridVisible: e.currentTarget.checked }))}
        />
      </SettingItem>

      {settings.map.gridVisible && (
        <>
          <SettingItem 
            title="Grid Color" 
            description="Color of the grid lines"
          >
            <input
              type="color"
              value={settings.map.gridColor}
              onChange={(e) => dispatch(updateMapSettings({ gridColor: e.target.value }))}
              className="color-picker"
            />
          </SettingItem>

          <SettingItem 
            title="Grid Opacity" 
            description="Transparency of the grid lines"
          >
            <Slider
              min={0}
              max={100}
              stepSize={5}
              labelStepSize={25}
              value={settings.map.gridOpacity}
              onChange={(value) => dispatch(updateMapSettings({ gridOpacity: value }))}
              labelRenderer={(value) => `${value}%`}
            />
          </SettingItem>
        </>
      )}

      <SettingItem 
        title="Show Coordinates" 
        description="Display tile coordinates on hover"
      >
        <Switch
          checked={settings.map.showCoordinates}
          onChange={(e) => dispatch(updateMapSettings({ showCoordinates: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Enable Minimap" 
        description="Show minimap overview"
      >
        <Switch
          checked={settings.map.enableMinimap}
          onChange={(e) => dispatch(updateMapSettings({ enableMinimap: e.currentTarget.checked }))}
        />
      </SettingItem>

      {settings.map.enableMinimap && (
        <SettingItem 
          title="Minimap Position" 
          description="Where to display the minimap"
        >
          <HTMLSelect
            value={settings.map.minimapPosition}
            onChange={(e) => dispatch(updateMapSettings({ minimapPosition: e.target.value as any }))}
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </HTMLSelect>
        </SettingItem>
      )}

      <SettingItem 
        title="Zoom Speed" 
        description="How fast the camera zooms"
      >
        <Slider
          min={1}
          max={20}
          stepSize={1}
          labelStepSize={5}
          value={settings.map.zoomSpeed}
          onChange={(value) => dispatch(updateMapSettings({ zoomSpeed: value }))}
          labelRenderer={(value) => `${value}x`}
        />
      </SettingItem>

      <SettingItem 
        title="Pan Speed" 
        description="How fast the camera pans"
      >
        <Slider
          min={1}
          max={20}
          stepSize={1}
          labelStepSize={5}
          value={settings.map.panSpeed}
          onChange={(value) => dispatch(updateMapSettings({ panSpeed: value }))}
          labelRenderer={(value) => `${value}x`}
        />
      </SettingItem>

      <SettingItem 
        title="Mouse Wheel Zoom" 
        description="Use mouse wheel to zoom"
      >
        <Switch
          checked={settings.map.enableMouseWheelZoom}
          onChange={(e) => dispatch(updateMapSettings({ enableMouseWheelZoom: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Show Health Bars" 
        description="Display character health bars"
      >
        <Switch
          checked={settings.map.showHealthBars}
          onChange={(e) => dispatch(updateMapSettings({ showHealthBars: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Show Name Tags" 
        description="Display character names"
      >
        <Switch
          checked={settings.map.showNameTags}
          onChange={(e) => dispatch(updateMapSettings({ showNameTags: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Fog of War" 
        description="Hide unexplored areas"
      >
        <Switch
          checked={settings.map.fogOfWar}
          onChange={(e) => dispatch(updateMapSettings({ fogOfWar: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Measurement Units" 
        description="Units for distance measurements"
      >
        <HTMLSelect
          value={settings.map.measurementUnits}
          onChange={(e) => dispatch(updateMapSettings({ measurementUnits: e.target.value as any }))}
        >
          <option value="feet">Feet</option>
          <option value="meters">Meters</option>
          <option value="squares">Grid Squares</option>
        </HTMLSelect>
      </SettingItem>
    </div>
  );

  const renderProfileSettings = () => (
    <div className="settings-section">
      <H3>Profile Information</H3>
      
      <SettingItem 
        title="Display Name" 
        description="How your name appears to other players"
      >
        <InputGroup
          value={settings.profile.displayName}
          onChange={(e) => dispatch(updateProfileSettings({ displayName: e.target.value }))}
          placeholder="Enter your display name"
        />
      </SettingItem>

      <SettingItem 
        title="Email Address" 
        description="Your email for account recovery and notifications"
      >
        <InputGroup
          type="email"
          value={settings.profile.email}
          onChange={(e) => dispatch(updateProfileSettings({ email: e.target.value }))}
          placeholder="Enter your email"
        />
      </SettingItem>

      <SettingItem 
        title="Bio" 
        description="Tell others about yourself"
      >
        <TextArea
          value={settings.profile.bio}
          onChange={(e) => dispatch(updateProfileSettings({ bio: e.target.value }))}
          placeholder="Write a short bio..."
          rows={3}
          fill
        />
      </SettingItem>

      <SettingItem 
        title="Public Profile" 
        description="Allow others to view your profile"
      >
        <Switch
          checked={settings.profile.isPublic}
          onChange={(e) => dispatch(updateProfileSettings({ isPublic: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Allow Friend Requests" 
        description="Let other players send you friend requests"
      >
        <Switch
          checked={settings.profile.allowFriendRequests}
          onChange={(e) => dispatch(updateProfileSettings({ allowFriendRequests: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Show Online Status" 
        description="Display when you're online to friends"
      >
        <Switch
          checked={settings.profile.showOnlineStatus}
          onChange={(e) => dispatch(updateProfileSettings({ showOnlineStatus: e.currentTarget.checked }))}
        />
      </SettingItem>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="settings-section">
      <H3>Privacy & Security</H3>
      
      <SettingItem 
        title="Share Game Data" 
        description="Allow sharing of game statistics and achievements"
      >
        <Switch
          checked={settings.privacy.shareGameData}
          onChange={(e) => dispatch(updatePrivacySettings({ shareGameData: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Analytics" 
        description="Help improve the game by sharing usage data"
      >
        <Switch
          checked={settings.privacy.allowAnalytics}
          onChange={(e) => dispatch(updatePrivacySettings({ allowAnalytics: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Show in Leaderboards" 
        description="Display your scores in public leaderboards"
      >
        <Switch
          checked={settings.privacy.showInLeaderboards}
          onChange={(e) => dispatch(updatePrivacySettings({ showInLeaderboards: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Direct Messages" 
        description="Allow other players to message you directly"
      >
        <Switch
          checked={settings.privacy.allowDirectMessages}
          onChange={(e) => dispatch(updatePrivacySettings({ allowDirectMessages: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Two-Factor Authentication" 
        description="Add an extra layer of security to your account"
      >
        <Switch
          checked={settings.privacy.twoFactorEnabled}
          onChange={(e) => dispatch(updatePrivacySettings({ twoFactorEnabled: e.currentTarget.checked }))}
        />
      </SettingItem>

      <Divider />
      
      <H4>Blocked Users</H4>
      <div className="blocked-users">
        <div className="add-block-user">
          <InputGroup
            value={tempBlockUser}
            onChange={(e) => setTempBlockUser(e.target.value)}
            placeholder="Enter username to block"
            rightElement={
              <Button
                intent={Intent.WARNING}
                minimal
                icon="add"
                onClick={handleAddBlockUser}
                disabled={!tempBlockUser.trim()}
              />
            }
          />
        </div>
        <div className="block-list">
          {settings.privacy.blockList.length === 0 ? (
            <div className="no-blocked-users">No blocked users</div>
          ) : (
            settings.privacy.blockList.map((user: string) => (
              <Tag
                key={user}
                onRemove={() => dispatch(removeFromBlockList(user))}
                large
              >
                {user}
              </Tag>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <H3>Notifications</H3>
      
      <SettingItem 
        title="Desktop Notifications" 
        description="Show notifications on your desktop"
      >
        <Switch
          checked={settings.notifications.enableDesktopNotifications}
          onChange={(e) => dispatch(updateNotificationSettings({ enableDesktopNotifications: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Sound Notifications" 
        description="Play sounds for notifications"
      >
        <Switch
          checked={settings.notifications.enableSoundNotifications}
          onChange={(e) => dispatch(updateNotificationSettings({ enableSoundNotifications: e.currentTarget.checked }))}
        />
      </SettingItem>

      <Divider />

      <H4>Notification Types</H4>
      
      <SettingItem 
        title="Game Events" 
        description="Combat, skill checks, and other game events"
      >
        <Switch
          checked={settings.notifications.gameEvents}
          onChange={(e) => dispatch(updateNotificationSettings({ gameEvents: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Chat Messages" 
        description="New messages in chat"
      >
        <Switch
          checked={settings.notifications.chatMessages}
          onChange={(e) => dispatch(updateNotificationSettings({ chatMessages: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Friend Requests" 
        description="New friend requests and acceptances"
      >
        <Switch
          checked={settings.notifications.friendRequests}
          onChange={(e) => dispatch(updateNotificationSettings({ friendRequests: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="System Updates" 
        description="App updates and maintenance notifications"
      >
        <Switch
          checked={settings.notifications.systemUpdates}
          onChange={(e) => dispatch(updateNotificationSettings({ systemUpdates: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Email Notifications" 
        description="Receive notifications via email"
      >
        <Switch
          checked={settings.notifications.emailNotifications}
          onChange={(e) => dispatch(updateNotificationSettings({ emailNotifications: e.currentTarget.checked }))}
        />
      </SettingItem>

      <SettingItem 
        title="Push Notifications" 
        description="Mobile push notifications (when supported)"
      >
        <Switch
          checked={settings.notifications.pushNotifications}
          onChange={(e) => dispatch(updateNotificationSettings({ pushNotifications: e.currentTarget.checked }))}
        />
      </SettingItem>
    </div>
  );

  const renderSearchResults = () => {
    if (!filteredSettings || filteredSettings.length === 0) {
      return (
        <div className="search-results">
          <Callout intent={Intent.PRIMARY} title="No results found">
            No settings found matching "{settings.searchQuery}". Try different keywords or browse categories.
          </Callout>
        </div>
      );
    }

    return (
      <div className="search-results">
        <H3>Search Results for "{settings.searchQuery}"</H3>
        {filteredSettings.map(({ category, matches }) => (
          <Card key={category} className="search-result-category">
            <H4>{category.charAt(0).toUpperCase() + category.slice(1)}</H4>
            <div className="search-matches">
              {matches.map((match, index) => (
                <Tag key={index} minimal>
                  {match}
                </Tag>
              ))}
            </div>
            <Button
              text={`Go to ${category}`}
              minimal
              rightIcon="arrow-right"
              onClick={() => {
                dispatch(setActiveCategory(category));
                dispatch(setSearchQuery(''));
              }}
            />
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <H3>Settings</H3>
        <div className="settings-search">
          <InputGroup
            leftIcon="search"
            placeholder="Search settings..."
            value={settings.searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            rightElement={
              settings.searchQuery ? (
                <Button
                  icon="cross"
                  minimal
                  onClick={() => dispatch(setSearchQuery(''))}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      {settings.searchQuery ? (
        renderSearchResults()
      ) : (
        <div className="settings-content">
          <Tabs
            id="settings-tabs"
            selectedTabId={settings.activeCategory}
            onChange={(tabId) => dispatch(setActiveCategory(tabId as string))}
            vertical
            large
          >
            <Tab id="general" title="General" panel={renderGeneralSettings()} />
            <Tab id="audio" title="Audio" panel={renderAudioSettings()} />
            <Tab id="graphics" title="Graphics" panel={renderGraphicsSettings()} />
            <Tab id="controls" title="Controls" panel={renderControlsSettings()} />
            <Tab id="map" title="Map" panel={renderMapSettings()} />
            <Tab id="profile" title="Profile" panel={renderProfileSettings()} />
            <Tab id="privacy" title="Privacy" panel={renderPrivacySettings()} />
            <Tab id="notifications" title="Notifications" panel={renderNotificationSettings()} />
          </Tabs>
        </div>
      )}

      <div className="settings-footer">
        <div className="settings-footer-actions">
          <ButtonGroup>
            <Button 
              intent={Intent.DANGER} 
              icon="reset"
              onClick={() => {
                if (confirm('This will reset ALL settings to their defaults. Are you sure?')) {
                  dispatch(resetAllSettings());
                }
              }}
            >
              Reset All Settings
            </Button>
            <Button intent={Intent.SUCCESS} icon="saved">
              All changes saved automatically
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {/* Floating Home Button */}
      <Button
        className="floating-home-button"
        intent={Intent.PRIMARY}
        icon="home"
        onClick={() => navigate('/')}
        large
      >
        Home
      </Button>
    </div>
  );
};

export default SettingsPage; 