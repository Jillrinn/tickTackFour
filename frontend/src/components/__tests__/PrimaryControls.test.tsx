import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrimaryControls } from '../PrimaryControls';

describe('PrimaryControls', () => {
  it('一時停止状態でないときは「一時停止」ボタンを表示する', () => {
    const mockOnPauseToggle = vi.fn();
    render(<PrimaryControls isPaused={false} onPauseToggle={mockOnPauseToggle} />);

    const button = screen.getByRole('button', { name: '一時停止' });
    expect(button).toBeDefined();
  });

  it('一時停止状態のときは「再開」ボタンを表示する', () => {
    const mockOnPauseToggle = vi.fn();
    render(<PrimaryControls isPaused={true} onPauseToggle={mockOnPauseToggle} />);

    const button = screen.getByRole('button', { name: '再開' });
    expect(button).toBeDefined();
  });

  it('一時停止ボタンをクリックするとonPauseToggle(true)が呼ばれる', () => {
    const mockOnPauseToggle = vi.fn();
    render(<PrimaryControls isPaused={false} onPauseToggle={mockOnPauseToggle} />);

    const button = screen.getByRole('button', { name: '一時停止' });
    fireEvent.click(button);

    expect(mockOnPauseToggle).toHaveBeenCalledWith(true);
  });

  it('再開ボタンをクリックするとonPauseToggle(false)が呼ばれる', () => {
    const mockOnPauseToggle = vi.fn();
    render(<PrimaryControls isPaused={true} onPauseToggle={mockOnPauseToggle} />);

    const button = screen.getByRole('button', { name: '再開' });
    fireEvent.click(button);

    expect(mockOnPauseToggle).toHaveBeenCalledWith(false);
  });

  it('data-testid="primary-controls"が設定されている', () => {
    const mockOnPauseToggle = vi.fn();
    const { container } = render(<PrimaryControls isPaused={false} onPauseToggle={mockOnPauseToggle} />);

    const element = container.querySelector('[data-testid="primary-controls"]');
    expect(element).toBeDefined();
  });

  it('一時停止/再開ボタンにdata-testid="pause-toggle-btn"が設定されている', () => {
    const mockOnPauseToggle = vi.fn();
    const { container } = render(<PrimaryControls isPaused={false} onPauseToggle={mockOnPauseToggle} />);

    const button = container.querySelector('[data-testid="pause-toggle-btn"]');
    expect(button).toBeDefined();
  });
});
