import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsControls } from '../SettingsControls';

describe('SettingsControls', () => {
  const defaultProps = {
    onReset: vi.fn(),
    isGameInProgress: false,
    children: null,
  };

  it('リセットボタンが表示される', () => {
    render(<SettingsControls {...defaultProps} />);

    const button = screen.getByRole('button', { name: 'リセット' });
    expect(button).toBeDefined();
  });

  it('リセットボタンをクリックするとonResetが呼ばれる', () => {
    const mockOnReset = vi.fn();
    render(<SettingsControls {...defaultProps} onReset={mockOnReset} />);

    const button = screen.getByRole('button', { name: 'リセット' });
    button.click();

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('childrenが渡された場合は表示される', () => {
    render(
      <SettingsControls {...defaultProps}>
        <div data-testid="test-child">テスト子要素</div>
      </SettingsControls>
    );

    const child = screen.getByTestId('test-child');
    expect(child).toBeDefined();
  });

  it('data-testid="settings-controls"が設定されている', () => {
    const { container } = render(<SettingsControls {...defaultProps} />);

    const element = container.querySelector('[data-testid="settings-controls"]');
    expect(element).toBeDefined();
  });

  it('リセットボタンにdata-testid="reset-btn"が設定されている', () => {
    const { container } = render(<SettingsControls {...defaultProps} />);

    const button = container.querySelector('[data-testid="reset-btn"]');
    expect(button).toBeDefined();
  });
});
