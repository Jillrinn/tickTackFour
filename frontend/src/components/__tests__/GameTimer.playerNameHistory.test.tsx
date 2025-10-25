import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';

// フォールバックモードを強制（テスト用）
vi.mock('../../hooks/useFallbackMode', () => ({
  useFallbackMode: () => ({
    isInFallbackMode: true,
    lastError: null,
    retryCount: 0,
    activateFallbackMode: vi.fn(),
    deactivateFallbackMode: vi.fn(),
    incrementRetryCount: vi.fn()
  })
}));

describe('GameTimer - Task 7.1: プレイヤー名履歴<datalist>統合', () => {
  beforeEach(() => {
    // fetchのモックをリセット
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('各プレイヤー名入力フィールドにlist属性が設定されている', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    nameInputs.forEach((input) => {
      expect(input).toHaveAttribute('list');
      const listId = input.getAttribute('list');
      expect(listId).toBeTruthy();
    });
  });

  it('各プレイヤー名入力フィールドに対応する<datalist>要素が存在する', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    nameInputs.forEach((input) => {
      const listId = input.getAttribute('list');
      const datalist = document.getElementById(listId!);
      expect(datalist).toBeInTheDocument();
      expect(datalist?.tagName).toBe('DATALIST');
    });
  });

  it('履歴がない場合、<datalist>内に<option>要素が表示されない', () => {
    // fetchのモック: 空配列を返す
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response);

    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const listId = nameInputs[0].getAttribute('list');
    const datalist = document.getElementById(listId!);

    expect(datalist?.children.length).toBe(0);
  });

  it('履歴がある場合、<datalist>内に<option>要素が生成される', async () => {
    // fetchのモック: 3件の履歴を返す
    const mockNames = ['Alice', 'Bob', 'Charlie'];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNames.map(name => ({ name, createdAt: new Date().toISOString() }))
    } as Response);

    render(<GameTimer />);

    // 最初の入力フィールドをフォーカスして履歴取得をトリガー
    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];

    firstInput.focus();

    // API呼び出しが完了するまで待機
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/player-names', {
        signal: expect.any(AbortSignal)
      });
    });

    // <datalist>内の<option>要素を確認
    const listId = firstInput.getAttribute('list');
    const datalist = document.getElementById(listId!);

    await waitFor(() => {
      expect(datalist?.children.length).toBe(3);
    });

    const options = Array.from(datalist?.children || []) as HTMLOptionElement[];
    expect(options[0].value).toBe('Alice');
    expect(options[1].value).toBe('Bob');
    expect(options[2].value).toBe('Charlie');
  });

  it('全てのプレイヤー名入力フィールドが同じ履歴データを共有する', async () => {
    // fetchのモック
    const mockNames = ['Alice', 'Bob'];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNames.map(name => ({ name, createdAt: new Date().toISOString() }))
    } as Response);

    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    // 最初の入力フィールドをフォーカスして履歴取得をトリガー
    nameInputs[0].focus();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // 全ての入力フィールドの<datalist>が同じ内容を持つことを確認
    for (const input of nameInputs) {
      const listId = input.getAttribute('list');
      const datalist = document.getElementById(listId!);

      await waitFor(() => {
        expect(datalist?.children.length).toBe(2);
      });

      const options = Array.from(datalist?.children || []) as HTMLOptionElement[];
      expect(options[0].value).toBe('Alice');
      expect(options[1].value).toBe('Bob');
    }
  });

  it('履歴から名前を選択すると入力フィールドに設定される', async () => {
    const user = userEvent.setup();

    // fetchのモック
    const mockNames = ['Alice', 'Bob', 'Charlie'];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNames.map(name => ({ name, createdAt: new Date().toISOString() }))
    } as Response);

    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];

    // フォーカスして履歴取得をトリガー
    firstInput.focus();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // 入力フィールドをクリアして履歴から選択（ブラウザのネイティブ動作をシミュレート）
    await user.clear(firstInput);
    await user.type(firstInput, 'Alice');

    expect(firstInput).toHaveValue('Alice');
  });

  it('API失敗時も<datalist>要素は存在する（空のまま）', async () => {
    // fetchのモック: エラーを返す
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];

    firstInput.focus();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // <datalist>は存在するが空
    const listId = firstInput.getAttribute('list');
    const datalist = document.getElementById(listId!);
    expect(datalist).toBeInTheDocument();
    expect(datalist?.children.length).toBe(0);
  });
});
