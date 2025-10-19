import { Page, Locator } from '@playwright/test';

/**
 * ゲームタイマーページオブジェクト
 * ページ全体の操作と状態取得を提供
 */
export class GameTimerPage {
  readonly page: Page;

  // ルート要素Locator
  readonly gameTimer: Locator;
  readonly gameHeader: Locator;
  readonly playersSection: Locator;
  readonly controlsSection: Locator;

  // プレイヤーカードLocator
  readonly playerCards: Locator;

  // 制御ボタンLocator
  readonly nextPlayerButton: Locator;
  readonly player4Button: Locator;
  readonly player5Button: Locator;
  readonly player6Button: Locator;
  readonly countUpButton: Locator;
  readonly countDownButton: Locator;
  readonly countdownSecondsInput: Locator;
  readonly pauseResumeButton: Locator;
  readonly resetButton: Locator;

  // Task 2-6: 新規UIコンポーネント
  readonly stickyHeader: Locator;
  readonly stickyHeaderInfo: Locator;
  readonly playerCountDropdown: Locator;
  readonly timerModeToggle: Locator;
  readonly primaryControls: Locator;
  readonly settingsControls: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gameTimer = page.locator('.game-timer');
    this.gameHeader = page.locator('.game-header');
    this.playersSection = page.locator('.players-section');
    this.controlsSection = page.locator('.controls-section');

    this.playerCards = page.locator('.player-card');

    this.nextPlayerButton = page.locator('.next-player-btn');
    this.player4Button = page.locator('button:has-text("4人")');
    this.player5Button = page.locator('button:has-text("5人")');
    this.player6Button = page.locator('button:has-text("6人")');
    this.countUpButton = page.locator('button:has-text("カウントアップ")');
    this.countDownButton = page.locator('button:has-text("カウントダウン")');
    this.countdownSecondsInput = page.locator('.countdown-control input[type="number"]');
    this.pauseResumeButton = page.locator('button:has-text("一時停止"), button:has-text("再開")');
    this.resetButton = page.locator('button:has-text("リセット")');

    // Task 2-6: 新規UIコンポーネント
    this.stickyHeader = page.getByTestId('sticky-header');
    this.stickyHeaderInfo = page.getByTestId('active-player-info');
    this.playerCountDropdown = page.getByTestId('player-count-dropdown');
    this.timerModeToggle = page.getByTestId('timer-mode-toggle');
    this.primaryControls = page.getByTestId('primary-controls');
    this.settingsControls = page.getByTestId('settings-controls');
  }

  /**
   * ページにナビゲートし、ロード完了を待機
   */
  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.verifyPageLoaded();
  }

  /**
   * ページが正しくロードされたことを検証
   */
  async verifyPageLoaded(): Promise<void> {
    await this.gameHeader.waitFor({ state: 'visible' });
    await this.playersSection.waitFor({ state: 'visible' });
  }

  /**
   * プレイヤー数を変更（Task 3: ドロップダウンに更新）
   */
  async setPlayerCount(count: 4 | 5 | 6): Promise<void> {
    await this.playerCountDropdown.selectOption({ value: count.toString() });
    // プレイヤーカード数が変更されるまで待機
    await this.page.waitForFunction(
      (expectedCount) => {
        const cards = document.querySelectorAll('.player-card');
        return cards.length === expectedCount;
      },
      count
    );
  }

  /**
   * 現在のプレイヤー数を取得
   */
  async getPlayerCount(): Promise<number> {
    return await this.playerCards.count();
  }

  /**
   * 指定インデックスのプレイヤーカードLocatorを取得
   */
  getPlayerCardByIndex(index: number): Locator {
    return this.playerCards.nth(index);
  }

  /**
   * アクティブなプレイヤーカードLocatorを取得
   */
  getActivePlayerCard(): Locator {
    return this.playerCards.filter({ hasText: 'active' }).first();
  }

  /**
   * タイマーモードをカウントアップに設定（Task 4: トグルスイッチに更新）
   */
  async setTimerModeCountUp(): Promise<void> {
    const isChecked = await this.timerModeToggle.isChecked();
    if (isChecked) {
      // トグルスイッチのラベル要素（親）をクリック
      const toggleLabel = this.timerModeToggle.locator('..');
      await toggleLabel.click({ force: true });
    }
  }

  /**
   * タイマーモードをカウントダウンに設定（Task 4: トグルスイッチに更新）
   *
   * 重要: 秒数を指定する場合、以下の手順で設定されます：
   * 1. 一度カウントアップに切り替え（秒数入力UIを非表示）
   * 2. カウントダウンに切り替え（デフォルト600秒で初期化）
   * 3. 秒数入力フィールドに値を設定
   * 4. 再度カウントアップに切り替え
   * 5. 再度カウントダウンに切り替え（指定秒数で初期化）
   */
  async setTimerModeCountDown(seconds?: number): Promise<void> {
    if (seconds !== undefined) {
      // カスタム秒数を設定する場合は、一度カウントアップに戻してから再設定
      const isChecked = await this.timerModeToggle.isChecked();

      // カウントアップに戻す
      if (isChecked) {
        const toggleLabel = this.timerModeToggle.locator('..');
        await toggleLabel.click({ force: true });
        await this.page.waitForTimeout(100);
      }

      // カウントダウンに切り替え
      const toggleLabel = this.timerModeToggle.locator('..');
      await toggleLabel.click({ force: true });
      await this.countdownSecondsInput.waitFor({ state: 'visible' });
      await this.countdownSecondsInput.fill(seconds.toString());

      // 再度カウントアップに戻す
      await toggleLabel.click({ force: true });
      await this.page.waitForTimeout(100);

      // 最終的にカウントダウンに設定（指定秒数で初期化される）
      await toggleLabel.click({ force: true });
      await this.page.waitForTimeout(100);
    } else {
      // 秒数指定なしの場合は単純に切り替え
      const isChecked = await this.timerModeToggle.isChecked();
      if (!isChecked) {
        const toggleLabel = this.timerModeToggle.locator('..');
        await toggleLabel.click({ force: true });
      }
    }
  }

  /**
   * 次のプレイヤーへ切り替え
   */
  async switchToNextPlayer(): Promise<void> {
    await this.nextPlayerButton.click();
  }

  /**
   * ターン切り替え（switchToNextPlayerのエイリアス）
   */
  async switchTurn(): Promise<void> {
    await this.switchToNextPlayer();
  }

  /**
   * 一時停止/再開トグル
   */
  async togglePause(): Promise<void> {
    await this.pauseResumeButton.click();
  }

  /**
   * ゲームをリセット
   */
  async resetGame(): Promise<void> {
    await this.resetButton.click();
  }

  /**
   * 一時停止/再開ボタンのテキストを取得
   */
  async getPauseResumeButtonText(): Promise<string> {
    return await this.pauseResumeButton.textContent() || '';
  }

  /**
   * 指定プレイヤーの経過時間を取得（秒単位）
   */
  async getPlayerElapsedTime(index: number): Promise<number> {
    const playerCard = this.getPlayerCardByIndex(index);
    const timeText = await playerCard.locator('.player-time').textContent();
    const match = timeText?.match(/(\d+):(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * 指定プレイヤーがアクティブかどうかを確認
   */
  async isPlayerActive(index: number): Promise<boolean> {
    const playerCard = this.getPlayerCardByIndex(index);
    const className = await playerCard.getAttribute('class');
    return className?.includes('active') || false;
  }

  /**
   * アクティブなプレイヤーのインデックスを取得
   */
  async getActivePlayerIndex(): Promise<number> {
    const playerCount = await this.getPlayerCount();
    for (let i = 0; i < playerCount; i++) {
      if (await this.isPlayerActive(i)) {
        return i;
      }
    }
    return -1; // アクティブなプレイヤーがいない場合
  }

  /**
   * 指定プレイヤーがタイムアウトしているかを確認
   */
  async isPlayerTimedOut(index: number): Promise<boolean> {
    const playerCard = this.getPlayerCardByIndex(index);
    const className = await playerCard.getAttribute('class');
    return className?.includes('timeout') || false;
  }

  /**
   * 指定プレイヤーの名前を取得
   */
  async getPlayerName(index: number): Promise<string> {
    const playerCard = this.getPlayerCardByIndex(index);
    const nameInput = playerCard.locator('.player-name-input');
    return await nameInput.inputValue();
  }

  /**
   * 指定プレイヤーの名前を設定
   */
  async setPlayerName(index: number, name: string): Promise<void> {
    const playerCard = this.getPlayerCardByIndex(index);
    const nameInput = playerCard.locator('.player-name-input');
    await nameInput.fill(name);
  }

  /**
   * 指定プレイヤーをアクティブに設定
   */
  async setPlayerActive(index: number): Promise<void> {
    const playerCard = this.getPlayerCardByIndex(index);
    const setActiveButton = playerCard.locator('button:has-text("アクティブに設定")');
    await setActiveButton.click();
  }

  /**
   * 指定プレイヤーに10秒追加
   */
  async addTenSeconds(index: number): Promise<void> {
    const playerCard = this.getPlayerCardByIndex(index);
    const addTimeButton = playerCard.locator('button:has-text("+10秒")');
    await addTimeButton.click();
  }

  /**
   * 指定プレイヤーの「+10秒」ボタンが無効化されているかを確認
   */
  async isAddTimeButtonDisabled(index: number): Promise<boolean> {
    const playerCard = this.getPlayerCardByIndex(index);
    const addTimeButton = playerCard.locator('button:has-text("+10秒")');
    return await addTimeButton.isDisabled();
  }

  /**
   * 指定プレイヤーの「アクティブに設定」ボタンが無効化されているかを確認
   */
  async isSetActiveButtonDisabled(index: number): Promise<boolean> {
    const playerCard = this.getPlayerCardByIndex(index);
    const setActiveButton = playerCard.locator('button:has-text("アクティブに設定")');
    return await setActiveButton.isDisabled();
  }

  /**
   * プレイヤー人数ドロップダウンが無効化されているかを確認（Task 3）
   */
  async isPlayerCountDropdownDisabled(): Promise<boolean> {
    return await this.playerCountDropdown.isDisabled();
  }

  /**
   * カウントモードトグルが無効化されているかを確認（Task 4）
   */
  async isTimerModeToggleDisabled(): Promise<boolean> {
    return await this.timerModeToggle.isDisabled();
  }

  /**
   * 固定ヘッダーが表示されているかを確認（Task 2）
   */
  async isStickyHeaderVisible(): Promise<boolean> {
    return await this.stickyHeader.isVisible();
  }

  /**
   * 固定ヘッダーのアクティブプレイヤー情報テキストを取得（Task 2）
   */
  async getStickyHeaderInfoText(): Promise<string> {
    return await this.stickyHeaderInfo.textContent() || '';
  }

  /**
   * カウントダウン設定UIが表示されているかを確認（Task 4）
   */
  async isCountdownControlVisible(): Promise<boolean> {
    return await this.countdownSecondsInput.isVisible();
  }

  /**
   * ビューポートサイズを変更（Task 6: レスポンシブUI検証）
   */
  async setViewportSize(width: number, height: number = 800): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }
}
