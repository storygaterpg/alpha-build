// src/components/CharacterSheet.tsx

import React from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { hideSheet } from '../store/gameSlice';
import { CharacterSheet as CharacterSheetType } from '../store/gameSlice';

/**
 * Modal displaying character or enemy sheet with stats.
 * Shows when `sheetVisible` is true in the Redux store.
 */
export default function CharacterSheet() {
  const dispatch = useAppDispatch();
  const sheet = useAppSelector(state => state.game.sheetData);
  const visible = useAppSelector(state => state.game.sheetVisible);

  // Don't render if no sheet is visible or data is missing
  if (!visible || !sheet) return null;

  // Render each stat as a line
  const renderStats = () =>
    Object.entries(sheet.stats).map(([key, value]) => (
      <div key={key}>
        {key}: {value}
      </div>
    ));

  // Render each skill as a line
  const renderSkills = () =>
    Object.entries(sheet.skills).map(([key, value]) => (
      <div key={key}>
        {key}: {value}
      </div>
    ));

  return (
    <div
      className="sheet-modal"
      onClick={() => dispatch(hideSheet())}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="sheet-content"
        onClick={e => e.stopPropagation()}
      >
        <h2>{sheet.name}</h2>
        <p>
          HP: {sheet.hp} / {sheet.maxHp}
        </p>

        <h3>Stats</h3>
        {renderStats()}

        <h3>Skills</h3>
        {renderSkills()}

        <button onClick={() => dispatch(hideSheet())}>
          Close
        </button>
      </div>
    </div>
  );
}
