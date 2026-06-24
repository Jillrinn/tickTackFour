import { screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { renderGameTimer } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - UI簡素化', () => {
  test('アクティブ解除ボタンが削除されている', () => {
    renderGameTimer();

    // アクティブ解除ボタンが存在しないことを確認
    expect(screen.queryByRole('button', { name: 'アクティブ解除' })).not.toBeInTheDocument();
  });

  test('一時停止ボタンでアクティブ解除が代替可能', () => {
    renderGameTimer();

    // 一時停止ボタンが存在することを確認
    expect(screen.getByRole('button', { name: /停止|再開/i })).toBeInTheDocument();
  });

  test('現在のゲーム状態テキストが非表示になっている', () => {
    renderGameTimer();

    // ゲーム状態セクションが存在しないことを確認
    expect(screen.queryByRole('heading', { name: 'ゲーム状態', level: 2 })).not.toBeInTheDocument();
  });

  test('アクティブプレイヤー情報はプレイヤーカードの視覚的表現で伝達される', () => {
    renderGameTimer();

    // ゲーム状態テキストは非表示だが、プレイヤー一覧は表示される
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();
  });

  test('一時停止状態は一時停止ボタンのテキストで伝達される', () => {
    renderGameTimer();

    // 一時停止ボタンのテキストで状態が分かる
    const pauseButton = screen.getByRole('button', { name: /停止|再開/i });
    expect(pauseButton).toHaveTextContent(/停止|再開/i);
  });

  test('プレイヤー数は視覚的にプレイヤーカードの数で伝達される', () => {
    renderGameTimer();

    // プレイヤーカードの数で分かる（デフォルト4人）
    // プレイヤーカードのみをカウント（他のlistitemを除外）
    const playerNameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
    expect(playerNameInputs).toHaveLength(4);
  });

  test('削除後も必要な機能はすべて利用可能', () => {
    renderGameTimer();

    // プレイヤー一覧が表示される
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();

    // 設定ボタンが表示される
    expect(screen.getByRole('heading', { name: '設定', level: 3 })).toBeInTheDocument();

    // 次のプレイヤーボタンが表示される（複数存在する可能性があるため）
    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);

    // 一時停止ボタンが表示される
    expect(screen.getByRole('button', { name: /停止|再開/i })).toBeInTheDocument();
  });
});
