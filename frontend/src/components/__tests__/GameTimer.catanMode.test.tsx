import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderGameTimer } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

// serverState フィールドと表示の対応:
//   isCatanMode  ← serverState.gameMode === 'catan'
//   isGameActive ← serverState.activePlayerIndex !== -1
//   currentPhase ← serverState.phase
//   phase-badge  ← isCatanMode && isGameActive
//   catan-phase1 ← isActive && isCatanMode && currentPhase === 1

describe('GameTimer カタンモードUI', () => {
  it('設定にカタンモードトグルが表示される', () => {
    renderGameTimer();
    expect(screen.getByTestId('game-mode-toggle')).toBeInTheDocument();
  });

  it('カタンON＋ゲーム開始でフェーズバッジ（フェーズ1）が表示される', () => {
    renderGameTimer({
      serverState: { gameMode: 'catan', phase: 1, activePlayerIndex: 0 },
    });
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveTextContent('フェーズ1');
  });

  it('未開始ではフェーズバッジは表示されない', () => {
    renderGameTimer({
      serverState: { gameMode: 'catan', activePlayerIndex: -1 },
    });
    expect(screen.queryByTestId('phase-badge')).not.toBeInTheDocument();
  });

  it('フェーズ1ではバッジに phase-1 クラスが付き、通常モードと色を区別できる', () => {
    renderGameTimer({
      serverState: { gameMode: 'catan', phase: 1, activePlayerIndex: 0 },
    });
    expect(screen.getByTestId('phase-badge')).toHaveClass('phase-1');
  });

  it('カタン フェーズ1ではアクティブプレイヤーカードに catan-phase1 クラスが付く', () => {
    const { container } = renderGameTimer({
      serverState: { gameMode: 'catan', phase: 1, activePlayerIndex: 0 },
    });
    const activeCard = container.querySelector('.player-card.active');
    expect(activeCard).not.toBeNull();
    expect(activeCard).toHaveClass('catan-phase1');
  });
});
