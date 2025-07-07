import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MapToolbar from '../../components/MapToolbar';

describe('MapToolbar', () => {
  const onMoveClick = jest.fn();
  const onClearClick = jest.fn();

  beforeEach(() => {
    onMoveClick.mockClear();
    onClearClick.mockClear();
  });

  it('renders the step count', () => {
    render(<MapToolbar moveActive={false} onMoveClick={onMoveClick} onShortenPathClick={() => {}} onClearClick={onClearClick} stepCount={5} />);
    expect(screen.getByText('5 steps')).toBeInTheDocument();
  });

  it('renders Move and Clear buttons with correct classes and labels when inactive', () => {
    render(<MapToolbar moveActive={false} onMoveClick={onMoveClick} onShortenPathClick={() => {}} onClearClick={onClearClick} disabled={false} />);
    const moveBtn = screen.getByRole('button', { name: 'Move' });
    expect(moveBtn).toHaveClass('toolbar-btn', 'move-btn');
    expect(moveBtn).not.toHaveClass('active');
    expect(moveBtn).toHaveAttribute('aria-pressed', 'false');

    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    expect(clearBtn).toHaveClass('toolbar-btn', 'clear-btn');
    expect(clearBtn).toBeEnabled();
  });

  it('renders Optimize path label and active class when moveActive is true', () => {
    render(<MapToolbar moveActive={true} onMoveClick={onMoveClick} onShortenPathClick={() => {}} onClearClick={onClearClick} />);
    const optimizeBtn = screen.getByRole('button', { name: 'Optimize path' });
    expect(optimizeBtn).toHaveClass('toolbar-btn', 'move-btn', 'active');
    expect(optimizeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<MapToolbar moveActive={false} onMoveClick={onMoveClick} onShortenPathClick={() => {}} onClearClick={onClearClick} disabled={true} />);
    const moveBtn = screen.getByRole('button', { name: 'Move' });
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    expect(moveBtn).toBeDisabled();
    expect(clearBtn).toBeDisabled();
  });

  it('calls onMoveClick and onClearClick when buttons are clicked', () => {
    render(<MapToolbar moveActive={false} onMoveClick={onMoveClick} onShortenPathClick={() => {}} onClearClick={onClearClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(onMoveClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClearClick).toHaveBeenCalledTimes(1);
  });
}); 