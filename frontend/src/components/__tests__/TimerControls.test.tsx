import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TimerControls } from '../TimerControls';
import type { GameState } from '../../types/GameState';

describe('TimerControls', () => {
  const mockGameState: GameState = {
    players: [
      {
        id: 'player-1',
        name: 'プレイヤー1',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date()
      },
      {
        id: 'player-2',
        name: 'プレイヤー2',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date()
      }
    ],
    activePlayerId: null,
    isPaused: false,
    timerMode: 'countup',
    createdAt: new Date(),
    lastUpdatedAt: new Date()
  };

  it('ターン切り替えボタンが表示される', () => {
    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    expect(screen.getByText('次のプレイヤーへ')).toBeInTheDocument();
  });

  it('一時停止/再開ボタンが表示される', () => {
    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    expect(screen.getByText('一時停止')).toBeInTheDocument();
  });

  it('リセットボタンが表示される', () => {
    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    expect(screen.getByText('リセット')).toBeInTheDocument();
  });

  it('プレイヤー数変更UIが表示される', () => {
    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    expect(screen.getByLabelText('プレイヤー数')).toBeInTheDocument();
  });

  it('タイマーモード切り替えボタンが表示される', () => {
    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    expect(screen.getByText(/カウントダウンモード/)).toBeInTheDocument();
  });

  it('ターン切り替えボタンクリックでコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSwitchTurn = vi.fn();

    render(
      <TimerControls
        gameState={{
          ...mockGameState,
          activePlayerId: 'player-1',
          players: mockGameState.players.map((p, i) =>
            i === 0 ? { ...p, isActive: true } : p
          )
        }}
        onSwitchTurn={onSwitchTurn}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    await user.click(screen.getByText('次のプレイヤーへ'));
    expect(onSwitchTurn).toHaveBeenCalled();
  });

  it('一時停止ボタンクリックでコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onPauseGame = vi.fn();

    render(
      <TimerControls
        gameState={{
          ...mockGameState,
          activePlayerId: 'player-1',
          players: mockGameState.players.map((p, i) =>
            i === 0 ? { ...p, isActive: true } : p
          )
        }}
        onSwitchTurn={vi.fn()}
        onPauseGame={onPauseGame}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    await user.click(screen.getByText('一時停止'));
    expect(onPauseGame).toHaveBeenCalled();
  });

  it('リセットボタンクリックでコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onResetGame = vi.fn();

    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={onResetGame}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    await user.click(screen.getByText('リセット'));
    expect(onResetGame).toHaveBeenCalled();
  });

  it('一時停止中は再開ボタンが表示される', () => {
    render(
      <TimerControls
        gameState={{
          ...mockGameState,
          isPaused: true
        }}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={vi.fn()}
      />
    );

    expect(screen.getByText('再開')).toBeInTheDocument();
    expect(screen.queryByText('一時停止')).not.toBeInTheDocument();
  });

  it('プレイヤー数変更でコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onUpdatePlayers = vi.fn();

    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={onUpdatePlayers}
        onSetTimerMode={vi.fn()}
      />
    );

    const select = screen.getByLabelText('プレイヤー数') as HTMLSelectElement;
    await user.selectOptions(select, '5');

    expect(onUpdatePlayers).toHaveBeenCalledWith(5);
  });

  it('タイマーモード切り替えでコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSetTimerMode = vi.fn();

    render(
      <TimerControls
        gameState={mockGameState}
        onSwitchTurn={vi.fn()}
        onPauseGame={vi.fn()}
        onResumeGame={vi.fn()}
        onResetGame={vi.fn()}
        onUpdatePlayers={vi.fn()}
        onSetTimerMode={onSetTimerMode}
      />
    );

    await user.click(screen.getByText(/カウントダウンモード/));
    expect(onSetTimerMode).toHaveBeenCalledWith('countdown', expect.any(Number));
  });
});
