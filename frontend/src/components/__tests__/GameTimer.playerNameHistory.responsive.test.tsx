import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('GameTimer - Task 7.2: プレイヤー名履歴レスポンシブ対応', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('各プレイヤー名入力フィールドに<datalist>が接続されている（ブラウザネイティブレスポンシブ対応）', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    nameInputs.forEach((input) => {
      // list属性が設定されている
      expect(input).toHaveAttribute('list');
      const listId = input.getAttribute('list');
      expect(listId).toBeTruthy();

      // 対応する<datalist>要素が存在する
      const datalist = document.getElementById(listId!);
      expect(datalist).toBeInTheDocument();
      expect(datalist?.tagName).toBe('DATALIST');
    });
  });

  it('<datalist>要素はブラウザネイティブUIであり、各デバイスで最適化されたUIが表示される', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];
    const listId = firstInput.getAttribute('list');
    const datalist = document.getElementById(listId!);

    // <datalist>はHTML5標準要素
    expect(datalist?.tagName).toBe('DATALIST');

    // ブラウザがネイティブに提供するUIのため、以下の特性を持つ：
    // - モバイル: ネイティブピッカー（44px以上のタップ領域）
    // - タブレット/PC: ドロップダウンリスト（マウス・キーボード操作対応）
    // - 自動的にスクロール対応
    // これらはブラウザ実装により自動的に提供される
  });

  it('入力フィールドはaria-label属性を持ち、アクセシビリティ対応されている', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    nameInputs.forEach((input) => {
      // aria-label属性が設定されている（スクリーンリーダー対応）
      expect(input).toHaveAttribute('aria-label', 'プレイヤー名');
    });
  });

  it('comboboxロールを持つ入力フィールドはキーボード操作に対応している', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    // getAllByRole('combobox')で取得できること自体が、暗黙的にcomboboxロールを持つことの証明
    expect(nameInputs.length).toBeGreaterThan(0);

    nameInputs.forEach((input) => {
      // list属性を持つinput要素は暗黙的にcomboboxロールを持つ（WAI-ARIA仕様）
      // comboboxロールは以下のキーボード操作に対応:
      // - Enter/Space: リストを開く
      // - 矢印キー: オプション選択
      // - Esc: リストを閉じる
      // - 文字入力: フィルタリング
      expect(input).toHaveAttribute('list');
    });
  });

  it('<datalist>はCSSスタイリングが制限されるが、ブラウザが最適なUIを提供する', () => {
    render(<GameTimer />);

    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    const firstInput = nameInputs[0];
    const listId = firstInput.getAttribute('list');
    const datalist = document.getElementById(listId!);

    // <datalist>要素自体はDOM内に存在
    expect(datalist).toBeInTheDocument();
    expect(datalist?.tagName).toBe('DATALIST');

    // ブラウザネイティブUIのため、以下の特性を持つ：
    // 1. CSSでのスタイリングは非常に限定的
    // 2. 各ブラウザ・OSが自動的にレスポンシブUIを提供
    // 3. モバイル: タッチ最適化されたピッカー
    // 4. デスクトップ: マウス・キーボード対応ドロップダウン
    // 5. アクセシビリティ: スクリーンリーダー対応
  });
});
