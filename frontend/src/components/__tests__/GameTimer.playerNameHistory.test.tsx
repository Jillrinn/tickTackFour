import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderGameTimer, mockNameHistory } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - Task 7.1: プレイヤー名履歴<datalist>統合', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('各プレイヤー名入力フィールドにlist属性が設定されている', () => {
    renderGameTimer();

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    nameInputs.forEach((input) => {
      expect(input).toHaveAttribute('list');
      const listId = input.getAttribute('list');
      expect(listId).toBeTruthy();
    });
  });

  it('各プレイヤー名入力フィールドに対応する<datalist>要素が存在する', () => {
    renderGameTimer();

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    nameInputs.forEach((input) => {
      const listId = input.getAttribute('list');
      const datalist = document.getElementById(listId!);
      expect(datalist).toBeInTheDocument();
      expect(datalist?.tagName).toBe('DATALIST');
    });
  });

  it('履歴がない場合、<datalist>内に<option>要素が表示されない', () => {
    // ハーネスデフォルト: usePlayerNameHistoryはnames: []を返す
    renderGameTimer();

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const listId = nameInputs[0].getAttribute('list');
    const datalist = document.getElementById(listId!);

    expect(datalist?.children.length).toBe(0);
  });

  it('履歴がある場合、<datalist>内に<option>要素が生成される', () => {
    // 3件の履歴を持つ状態でレンダリング
    const mockNames = ['Alice', 'Bob', 'Charlie'];
    renderGameTimer({ nameHistory: mockNames });

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const listId = nameInputs[0].getAttribute('list');
    const datalist = document.getElementById(listId!);

    expect(datalist?.children.length).toBe(3);

    const options = Array.from(datalist?.children || []) as HTMLOptionElement[];
    expect(options[0].value).toBe('Alice');
    expect(options[1].value).toBe('Bob');
    expect(options[2].value).toBe('Charlie');
  });

  it('全てのプレイヤー名入力フィールドが同じ履歴データを共有する（共有<datalist>）', () => {
    // 2件の履歴を持つ状態でレンダリング
    const mockNames = ['Alice', 'Bob'];
    renderGameTimer({ nameHistory: mockNames });

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    // 全ての入力フィールドが同じ<datalist>IDを参照している（共有datalist）
    const listIds = nameInputs.map((input) => input.getAttribute('list'));
    const uniqueIds = [...new Set(listIds)];
    expect(uniqueIds).toHaveLength(1); // 全入力が同一IDを参照

    // 共有datalistに2件の履歴が表示されている
    const sharedListId = listIds[0]!;
    const datalist = document.getElementById(sharedListId);
    expect(datalist?.children.length).toBe(2);

    const options = Array.from(datalist?.children || []) as HTMLOptionElement[];
    expect(options[0].value).toBe('Alice');
    expect(options[1].value).toBe('Bob');
  });

  it('入力フィールドフォーカス時にfetchNamesが呼ばれる', async () => {
    const user = userEvent.setup();
    renderGameTimer({ nameHistory: [] });

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];

    await user.click(firstInput);

    // フォーカス時にfetchNamesが呼ばれることを確認
    await waitFor(() => {
      expect(mockNameHistory.fetchNames).toHaveBeenCalledTimes(1);
    });
  });

  it('履歴から名前を選択すると入力フィールドに設定される', async () => {
    const user = userEvent.setup();

    // 3件の履歴を持つ状態でレンダリング
    const mockNames = ['Alice', 'Bob', 'Charlie'];
    renderGameTimer({ nameHistory: mockNames });

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];

    // 入力フィールドをクリアして履歴から選択（ブラウザのネイティブ動作をシミュレート）
    await user.clear(firstInput);
    await user.type(firstInput, 'Alice');

    expect(firstInput).toHaveValue('Alice');
  });

  it('名前履歴が空のとき<datalist>要素は存在するが空のまま', () => {
    // ハーネスデフォルト: usePlayerNameHistoryはnames: []を返す
    renderGameTimer();

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];

    // <datalist>は存在するが空
    const listId = firstInput.getAttribute('list');
    const datalist = document.getElementById(listId!);
    expect(datalist).toBeInTheDocument();
    expect(datalist?.children.length).toBe(0);
  });
});
