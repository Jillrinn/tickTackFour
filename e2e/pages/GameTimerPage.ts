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
   * プレイヤー数を変更
   */
  async setPlayerCount(count: 4 | 5 | 6): Promise<void> {
    switch (count) {
      case 4:
        await this.player4Button.click();
        break;
      case 5:
        await this.player5Button.click();
        break;
      case 6:
        await this.player6Button.click();
        break;
    }
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
   * タイマーモードをカウントアップに設定
   */
  async setTimerModeCountUp(): Promise<void> {
    await this.countUpButton.click();
  }

  /**
   * タイマーモードをカウントダウンに設定
   */
  async setTimerModeCountDown(seconds?: number): Promise<void> {
    if (seconds !== undefined) {
      await this.countdownSecondsInput.fill(seconds.toString());
    }
    await this.countDownButton.click();
  }

  /**
   * 次のプレイヤーへ切り替え
   */
  async switchToNextPlayer(): Promise<void> {
    await this.nextPlayerButton.click();
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
}
