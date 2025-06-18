import React from 'react';

interface MapToolbarProps {
  moveActive: boolean;
  onMoveClick: () => void;
  onShortenPathClick: () => void;
  onClearClick: () => void;
  disabled?: boolean;
  stepCount?: number;
}

const MapToolbar: React.FC<MapToolbarProps> = ({
  moveActive,
  onMoveClick,
  onShortenPathClick,
  onClearClick,
  disabled = false,
  stepCount = 0,
}) => {
  return (
    <div className="map-toolbar-glass">
      <div className="toolbar-step-count">{stepCount} steps</div>
      <button
        className={`toolbar-btn move-btn${moveActive ? ' active' : ''}`}
        onClick={onMoveClick}
        disabled={disabled}
        aria-pressed={moveActive}
      >
        Move
      </button>
      {/* Shorten Path feature not implemented yet */}
      {/* <button className="toolbar-btn shorten-btn" disabled>Shorten Path</button> */}
      <button
        className="toolbar-btn clear-btn"
        onClick={onClearClick}
        disabled={disabled}
      >
        Clear
      </button>
    </div>
  );
};

export default MapToolbar; 