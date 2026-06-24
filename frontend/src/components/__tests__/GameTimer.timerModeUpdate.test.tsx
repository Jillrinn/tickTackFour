import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';
import { useServerGameState } from '../../hooks/useServerGameState';
import { useGameApi } from '../../hooks/useGameApi';
import { usePollingSync } from '../../hooks/usePollingSync';
import { useETagManager } from '../../hooks/useETagManager';
import { usePlayerNameHistory } from '../../hooks/usePlayerNameHistory';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

// 要件4（タイマーモード変更制御）は、タイマーモードトグルUIの存在を前提としている
// タイマーモードトグルUIは現在 {false &&} で非表示中のため、このテストファイルを無効化
// 関連仕様: countdown-mode-fix Phase 0.5でタイマーモードUI復元後に再有効化予定
describe.skip('GameTimer - Timer Mode Update Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ゲーム開始状態の判定', () => {
    it('未開始状態（activePlayerIndex=-1, 全elapsedSeconds=0）ではトグルが有効化されていること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: -1 },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(false);
    });

    it('開始済み状態（activePlayerIndex>=0）ではトグルが無効化されていること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(true);
    });

    it('開始済み状態（elapsedSeconds>0）ではトグルが無効化されていること', () => {
      renderGameTimer({
        serverState: {
          activePlayerIndex: -1,
          players: [
            { name: 'プレイヤー1', elapsedSeconds: 10 },
            { name: 'プレイヤー2', elapsedSeconds: 0 },
            { name: 'プレイヤー3', elapsedSeconds: 0 },
            { name: 'プレイヤー4', elapsedSeconds: 0 },
          ],
        },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(true);
    });

    it('一時停止中でもゲーム開始後（activePlayerIndex>=0）はトグルが無効化されたままであること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: true },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(true);
    });

    it('未開始状態ではトグルが有効化されており、updateGame APIがcountdownで呼ばれること', async () => {
      const user = userEvent.setup();
      renderGameTimer({
        serverState: { activePlayerIndex: -1, timerMode: 'countup' },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(false);

      await user.click(toggle);
      expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
      expect(mockApi.updateGame.mock.calls[0][1]).toMatchObject({ timerMode: 'countdown' });
    });
  });

  describe('カウントダウン秒数入力のdisable制御', () => {
    it('未開始状態ではカウントダウン秒数入力が有効化されていること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: -1, timerMode: 'countdown' },
      });

      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.disabled).toBe(false);
    });

    it('開始済み状態（activePlayerIndex>=0）ではカウントダウン秒数入力が無効化されること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false, timerMode: 'countdown' },
      });

      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.disabled).toBe(true);
    });

    it('一時停止中でもゲーム開始後はカウントダウン秒数入力が無効化されていること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: true, timerMode: 'countdown' },
      });

      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.disabled).toBe(true);
    });

    it('未開始状態（activePlayerIndex=-1）ではカウントダウン秒数入力が有効化されること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: -1, timerMode: 'countdown' },
      });

      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.disabled).toBe(false);
    });
  });

  describe('ツールチップ表示', () => {
    it('未開始状態ではツールチップが表示されないこと', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: -1 },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.title).toBe('');
    });

    it('開始済み状態（activePlayerIndex>=0）ではトグルにツールチップが表示されること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.title).toBe('ゲーム開始後はタイマーモードを変更できません');
    });

    it('開始済み状態（activePlayerIndex>=0, timerMode=countdown）ではカウントダウン入力にツールチップが表示されること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false, timerMode: 'countdown' },
      });

      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.title).toBe('ゲーム開始後はカウントダウン秒数を変更できません');
    });

    it('未開始状態（activePlayerIndex=-1）ではトグルのtitle属性が空であること', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: -1 },
      });

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.title).toBe('');
    });
  });
});
