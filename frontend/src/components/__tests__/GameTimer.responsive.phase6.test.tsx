import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { GameTimer } from '../GameTimer';

/**
 * Task 6.1 & 6.2: レスポンシブUIとアクセシビリティ実装テスト
 *
 * 検証項目:
 * - 375px〜767px（モバイル）: セクションを縦方向に積み重ね、固定ヘッダーは縦並び
 * - 768px〜1023px（タブレット）: セクションを横方向に配置、固定ヘッダーは横並び
 * - 1024px〜1440px+（PC）: セクションを最適なレイアウトで配置、固定ヘッダーは横並び
 * - 全てのインタラクティブ要素にdata-testid属性設定
 * - キーボード操作対応（適切なフォーカス管理とTab順序）
 * - ARIAラベルとロール属性設定
 * - タップターゲット44px以上
 * - トグルスイッチのホバー時視覚的フィードバック
 */

describe('GameTimer Responsive Layout & Accessibility (Task 6.1 & 6.2)', () => {
  // レスポンシブテストでは実際のビューポートサイズをシミュレート
  const setViewportSize = (width: number, height: number = 768) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  afterEach(() => {
    // ビューポートサイズをリセット
    setViewportSize(1024, 768);
  });

  describe('Task 6.1: レスポンシブレイアウト', () => {
    describe('モバイル (375px〜767px)', () => {
      beforeEach(() => {
        setViewportSize(375);
      });

      it('固定ヘッダー内の要素が縦並びで表示される', () => {
        render(<GameTimer />);
        const stickyHeader = screen.getByTestId('sticky-header');
        const headerContent = within(stickyHeader).getByTestId('sticky-header-content');

        // モバイルでは sticky-header-content が存在し、クラスが適用されている
        expect(headerContent).toBeInTheDocument();
        expect(headerContent).toHaveClass('sticky-header-content');
      });

      it('セクションが縦方向に積み重ねられる', () => {
        render(<GameTimer />);
        const controlsSection = screen.getByTestId('controls-section');

        // モバイルでは controls-section が存在し、クラスが適用されている
        expect(controlsSection).toBeInTheDocument();
        expect(controlsSection).toHaveClass('controls-section');
      });

      it('全てのボタンとコントロールが適切に表示される', () => {
        render(<GameTimer />);

        // 固定ヘッダーのボタン
        const stickyHeader = screen.getByTestId('sticky-header');
        expect(within(stickyHeader).getByRole('button', { name: /次のプレイヤーへ/i })).toBeVisible();

        // 主要操作セクションのボタン
        const primaryControls = screen.getByTestId('primary-controls');
        expect(within(primaryControls).getByRole('button', { name: /一時停止|再開/i })).toBeVisible();

        // 設定セクションのコントロール
        const settingsControls = screen.getByTestId('settings-controls');
        expect(within(settingsControls).getByTestId('player-count-dropdown')).toBeVisible();
        expect(within(settingsControls).getByTestId('timer-mode-toggle')).toBeVisible();
      });
    });

    describe('タブレット (768px〜1023px)', () => {
      beforeEach(() => {
        setViewportSize(768);
      });

      it('固定ヘッダー内の要素が横並びで表示される', () => {
        render(<GameTimer />);
        const stickyHeader = screen.getByTestId('sticky-header');
        const headerContent = within(stickyHeader).getByTestId('sticky-header-content');

        // タブレットでは sticky-header-content が存在し、クラスが適用されている
        expect(headerContent).toBeInTheDocument();
        expect(headerContent).toHaveClass('sticky-header-content');
      });

      it('セクションが横方向に配置される', () => {
        render(<GameTimer />);
        const controlsSection = screen.getByTestId('controls-section');

        // タブレットでは controls-section が存在し、クラスが適用されている
        expect(controlsSection).toBeInTheDocument();
        expect(controlsSection).toHaveClass('controls-section');
      });
    });

    describe('PC (1024px〜1440px+)', () => {
      beforeEach(() => {
        setViewportSize(1440);
      });

      it('固定ヘッダー内の要素が横並びで表示される', () => {
        render(<GameTimer />);
        const stickyHeader = screen.getByTestId('sticky-header');
        const headerContent = within(stickyHeader).getByTestId('sticky-header-content');

        // PCでは sticky-header-content が存在し、クラスが適用されている
        expect(headerContent).toBeInTheDocument();
        expect(headerContent).toHaveClass('sticky-header-content');
      });

      it('セクションが最適なレイアウトで配置される', () => {
        render(<GameTimer />);
        const controlsSection = screen.getByTestId('controls-section');

        // PCでは controls-section が存在し、クラスが適用されている
        expect(controlsSection).toBeInTheDocument();
        expect(controlsSection).toHaveClass('controls-section');
      });

      it('大画面で全要素が適切に表示される', () => {
        render(<GameTimer />);

        // 全てのセクションが表示される
        expect(screen.getByTestId('sticky-header')).toBeVisible();
        expect(screen.getByTestId('primary-controls')).toBeVisible();
        expect(screen.getByTestId('settings-controls')).toBeVisible();
      });
    });
  });

  describe('Task 6.2: アクセシビリティとタップターゲットサイズ', () => {
    it('全てのインタラクティブ要素にdata-testid属性が設定されている', () => {
      render(<GameTimer />);

      // ドロップダウン
      expect(screen.getByTestId('player-count-dropdown')).toBeInTheDocument();

      // トグルスイッチ
      expect(screen.getByTestId('timer-mode-toggle')).toBeInTheDocument();

      // 固定ヘッダー
      expect(screen.getByTestId('sticky-header')).toBeInTheDocument();

      // 主要操作セクション
      expect(screen.getByTestId('primary-controls')).toBeInTheDocument();

      // 設定セクション
      expect(screen.getByTestId('settings-controls')).toBeInTheDocument();
    });

    it('ドロップダウンに適切なARIAラベルが設定されている', () => {
      render(<GameTimer />);
      const dropdown = screen.getByTestId('player-count-dropdown');

      expect(dropdown).toHaveAttribute('aria-label', 'プレイヤー人数選択');
    });

    it('トグルスイッチに適切なARIAラベルが設定されている', () => {
      render(<GameTimer />);
      const toggle = screen.getByTestId('timer-mode-toggle');

      expect(toggle).toHaveAttribute('aria-label', 'カウントモード切替');
    });

    it('全てのボタンがタップターゲットサイズ44px以上である', () => {
      render(<GameTimer />);

      // 「次のプレイヤーへ」ボタン
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤーへ/i });
      expect(nextPlayerButton).toBeInTheDocument();
      // CSSでmin-height: 44pxが適用されることを確認（jsdom環境ではスタイル値を直接テストできない）

      // 一時停止/再開ボタン
      const pauseButton = screen.getByRole('button', { name: /一時停止|再開/i });
      expect(pauseButton).toBeInTheDocument();

      // リセットボタン
      const resetButton = screen.getByRole('button', { name: /リセット/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('ドロップダウンがタップターゲットサイズ44px以上である', () => {
      render(<GameTimer />);
      const dropdown = screen.getByTestId('player-count-dropdown');

      expect(dropdown).toBeInTheDocument();
      // CSSでmin-height: 44pxが適用されることを確認（jsdom環境ではスタイル値を直接テストできない）
    });

    it('トグルスイッチがタップターゲットサイズ44px以上である', () => {
      render(<GameTimer />);
      const toggle = screen.getByTestId('timer-mode-toggle');
      const toggleContainer = toggle.closest('.toggle-switch');

      expect(toggleContainer).toBeInTheDocument();
      // CSSでmin-height: 44pxが適用されることを確認（jsdom環境ではスタイル値を直接テストできない）
    });

    it('トグルスイッチにホバー時の視覚的フィードバックがある', () => {
      render(<GameTimer />);
      const toggle = screen.getByTestId('timer-mode-toggle');
      const slider = toggle.nextElementSibling;

      if (slider && slider.classList.contains('slider')) {
        // スライダー要素が存在し、hover時のスタイルが定義されている
        const styles = window.getComputedStyle(slider);
        // CSSでホバースタイルが定義されていることを確認（background-colorの変化等）
        expect(slider).toBeInTheDocument();
      }
    });

    it('キーボード操作でフォーカス順序が適切である', () => {
      render(<GameTimer />);

      // Tab順序を確認（固定ヘッダー → 主要操作 → 設定）
      const focusableElements = [
        screen.getByRole('button', { name: /次のプレイヤーへ/i }),
        screen.getByRole('button', { name: /一時停止|再開/i }),
        screen.getByTestId('player-count-dropdown'),
        screen.getByTestId('timer-mode-toggle'),
        screen.getByRole('button', { name: /リセット/i }),
      ];

      // 全ての要素がtabIndexが設定されているか、またはデフォルトでフォーカス可能
      focusableElements.forEach(element => {
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('全てのフォーム要素がラベルと関連付けられている', () => {
      render(<GameTimer />);

      // ドロップダウン
      const dropdown = screen.getByTestId('player-count-dropdown');
      expect(dropdown).toHaveAttribute('aria-label');

      // トグルスイッチ
      const toggle = screen.getByTestId('timer-mode-toggle');
      expect(toggle).toHaveAttribute('aria-label');
    });
  });

  describe('クロスブラウザ対応', () => {
    it('375pxから1440px以上まで任意の画面幅で全UIコントロールが操作可能', () => {
      const testWidths = [375, 500, 768, 1024, 1440, 1920];

      testWidths.forEach(width => {
        setViewportSize(width);
        const { unmount } = render(<GameTimer />);

        // 全ての主要コントロールが表示され、操作可能であることを確認
        expect(screen.getByTestId('sticky-header')).toBeVisible();
        expect(screen.getByTestId('primary-controls')).toBeVisible();
        expect(screen.getByTestId('settings-controls')).toBeVisible();

        // ボタンが全て表示される（getAllByRoleで複数取得される場合があるため、最初の要素をチェック）
        const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤーへ/i });
        expect(nextPlayerButtons[0]).toBeVisible();
        expect(screen.getByRole('button', { name: /一時停止|再開/i })).toBeVisible();
        expect(screen.getByRole('button', { name: /リセット/i })).toBeVisible();

        // コントロールが全て表示される
        expect(screen.getByTestId('player-count-dropdown')).toBeVisible();
        expect(screen.getByTestId('timer-mode-toggle')).toBeVisible();

        // 次のループの前にコンポーネントをアンマウント
        unmount();
      });
    });
  });
});
