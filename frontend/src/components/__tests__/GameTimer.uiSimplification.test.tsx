import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
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

describe('GameTimer - UI簡素化', () => {
  test('アクティブ解除ボタンが削除されている', () => {
    render(<GameTimer />);

    // アクティブ解除ボタンが存在しないことを確認
    expect(screen.queryByRole('button', { name: 'アクティブ解除' })).not.toBeInTheDocument();
  });

  test('一時停止ボタンでアクティブ解除が代替可能', () => {
    render(<GameTimer />);

    // 一時停止ボタンが存在することを確認
    expect(screen.getByRole('button', { name: /一時停止|再開/ })).toBeInTheDocument();
  });

  test('現在のゲーム状態テキストが非表示になっている', () => {
    render(<GameTimer />);

    // ゲーム状態セクションが存在しないことを確認
    expect(screen.queryByRole('heading', { name: 'ゲーム状態', level: 2 })).not.toBeInTheDocument();
  });

  test('アクティブプレイヤー情報はプレイヤーカードの視覚的表現で伝達される', () => {
    render(<GameTimer />);

    // ゲーム状態テキストは非表示だが、プレイヤー一覧は表示される
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();
  });

  test('一時停止状態は一時停止ボタンのテキストで伝達される', () => {
    render(<GameTimer />);

    // 一時停止ボタンのテキストで状態が分かる
    const pauseButton = screen.getByRole('button', { name: /一時停止|再開/ });
    expect(pauseButton).toHaveTextContent(/一時停止|再開/);
  });

  test('プレイヤー数は視覚的にプレイヤーカードの数で伝達される', () => {
    render(<GameTimer />);

    // プレイヤーカードの数で分かる（デフォルト4人）
    // プレイヤーカードのみをカウント（他のlistitemを除外）
    const playerNameInputs = screen.getAllByRole('textbox', { name: /プレイヤー名/ });
    expect(playerNameInputs).toHaveLength(4);
  });

  test('削除後も必要な機能はすべて利用可能', () => {
    render(<GameTimer />);

    // プレイヤー一覧が表示される
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();

    // 設定ボタンが表示される
    expect(screen.getByRole('heading', { name: '設定', level: 3 })).toBeInTheDocument();

    // 次のプレイヤーボタンが表示される（複数存在する可能性があるため）
    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤー/ });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);

    // 一時停止ボタンが表示される
    expect(screen.getByRole('button', { name: /一時停止|再開/ })).toBeInTheDocument();
  });
});
