import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * プレイヤー名永続化機能のE2Eテスト
 * Requirements: 1.1, 1.2, 4.1, 4.3, 8.1, 8.3, 11.2
 *
 * 注: フォールバックモードは削除済み。
 * GET /api/game をモックして通常モード（APIモード）でテストを実行する。
 *
 * UI構造の注意:
 * - プレイヤー名入力欄(.player-name-input)は設定エリア内の
 *   [data-testid="player-name-edit-list"] 配下にある。
 *   .player-card 内には存在しない。
 * - 履歴 datalist は全入力欄で共有（id: "player-name-history-shared"）。
 */

/** 通常モード用のゲーム状態モック */
const NORMAL_MODE_GAME_STATE = {
  players: [
    { name: 'プレイヤー1', elapsedSeconds: 0 },
    { name: 'プレイヤー2', elapsedSeconds: 0 },
    { name: 'プレイヤー3', elapsedSeconds: 0 },
    { name: 'プレイヤー4', elapsedSeconds: 0 },
  ],
  activePlayerIndex: -1,
  timerMode: 'countup',
  countdownSeconds: 600,
  isPaused: true,
  etag: 'e2e-etag',
  turnStartedAt: null,
  pausedAt: null,
  gameMode: 'normal',
  phase: 0,
};

test.describe('プレイヤー名永続化機能', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    // 通常モード（APIモード）: GET /api/game をモックして有効なゲーム状態を返す
    await page.route('**/api/game', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { ETag: 'e2e-etag' },
          body: JSON.stringify(NORMAL_MODE_GAME_STATE),
        });
      } else {
        await route.continue();
      }
    });

    gameTimerPage = new GameTimerPage(page);
  });

  test.describe('Task 11.1: プレイヤー名履歴取得と選択フロー', () => {
    test('プレイヤー名入力フィールドフォーカス時に履歴が表示される', async ({ page }) => {
      // Requirements: 4.1

      // モックAPI: GET /api/player-names
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { name: 'Alice', createdAt: '2025-10-21T00:00:00.000Z' },
              { name: 'Bob', createdAt: '2025-10-21T00:01:00.000Z' },
              { name: 'Charlie', createdAt: '2025-10-21T00:02:00.000Z' }
            ])
          });
        } else {
          await route.continue();
        }
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機（名前編集入力欄が存在することを確認）
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      // プレイヤー0の名前入力フィールドを取得（設定エリアの編集欄）
      const nameInput = page.locator('[data-testid="player-name-edit-input-0"]');

      // フォーカス（履歴取得トリガー）
      await nameInput.focus();

      // <datalist>要素の存在確認
      const listId = await nameInput.getAttribute('list');
      expect(listId).toBeTruthy();

      const datalist = page.locator(`#${listId}`);
      await expect(datalist).toHaveCount(1); // <datalist>は仕様上hidden

      // <option>要素が3件存在することを確認
      const options = datalist.locator('option');
      await expect(options).toHaveCount(3);

      // オプションの値を確認
      const optionValues = await options.evaluateAll((elements) =>
        elements.map((el) => (el as HTMLOptionElement).value)
      );
      expect(optionValues).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    test('履歴から名前を選択すると入力フィールドに設定される', async ({ page }) => {
      // Requirements: 4.3

      // モックAPI: GET /api/player-names
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { name: 'Alice', createdAt: '2025-10-21T00:00:00.000Z' },
              { name: 'Bob', createdAt: '2025-10-21T00:01:00.000Z' }
            ])
          });
        } else {
          await route.continue();
        }
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      const nameInput = page.locator('[data-testid="player-name-edit-input-0"]');

      // フォーカスして履歴を取得
      await nameInput.focus();
      await page.waitForTimeout(500); // API呼び出し待機

      // 名前入力（ブラウザネイティブの<datalist>選択をシミュレート）
      await nameInput.fill('Alice');

      // 入力フィールドに"Alice"が設定されることを確認
      const inputValue = await nameInput.inputValue();
      expect(inputValue).toBe('Alice');
    });
  });

  test.describe('Task 11.2: プレイヤー名保存フロー', () => {
    test('プレイヤー名変更後のゲームリセット時に名前が保存される', async ({ page }) => {
      // Requirements: 1.1
      // フロー: サーバー状態に非デフォルト名("David")があるゲームを用意 → リセット実行 →
      //   handleResetGame が playerNameHistory.saveNames(["David"]) を呼ぶ →
      //   saveNames内の3秒デバウンス後に POST /api/player-names が送信される

      let postRequestReceived = false;
      let savedNames: string[] = [];

      // GET /api/game: プレイヤー0を"David"（非デフォルト名）に設定
      // beforeEach で設定済みの route を上書き
      await page.unroute('**/api/game');
      await page.route('**/api/game', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { ETag: 'e2e-etag' },
            body: JSON.stringify({
              ...NORMAL_MODE_GAME_STATE,
              players: [
                { name: 'David', elapsedSeconds: 0 },
                { name: 'プレイヤー2', elapsedSeconds: 0 },
                { name: 'プレイヤー3', elapsedSeconds: 0 },
                { name: 'プレイヤー4', elapsedSeconds: 0 },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });

      // モックAPI: GET /api/player-names（初回空）、POST /api/player-names（保存確認）
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        } else if (route.request().method() === 'POST') {
          // POST /api/player-names
          const requestBody = route.request().postDataJSON();
          savedNames = requestBody.names;
          postRequestReceived = true;

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ savedCount: savedNames.length })
          });
        }
      });

      // POST /api/reset のモック（リセット操作）
      await page.route('**/api/reset', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { ETag: 'e2e-etag-reset' },
          body: JSON.stringify({ ...NORMAL_MODE_GAME_STATE, etag: 'e2e-etag-reset' }),
        });
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機（"David"がサーバー状態に反映される）
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      // ゲームリセットボタンをクリック（handleResetGame が saveNames(["David"]) を呼ぶ）
      await gameTimerPage.resetGame();

      // POST /api/player-namesが呼び出されることを確認
      // saveNames内部に3秒デバウンスがあるため、3.5秒待機が必要
      await page.waitForTimeout(3500);
      expect(postRequestReceived).toBe(true);

      // "David"が保存されることを確認
      expect(savedNames).toContain('David');
    });

    test('ページリロード後に履歴が反映される', async ({ page }) => {
      // Requirements: 1.2

      // モックAPI: GET /api/player-names（保存済みデータを返す）
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { name: 'David', createdAt: '2025-10-21T00:00:00.000Z' },
              { name: 'Eve', createdAt: '2025-10-21T00:01:00.000Z' }
            ])
          });
        } else {
          await route.continue();
        }
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      // プレイヤー0の名前入力フィールドをフォーカス（設定エリア）
      const nameInput = page.locator('[data-testid="player-name-edit-input-0"]');
      await nameInput.focus();
      await page.waitForTimeout(500); // API呼び出し待機

      // <datalist>に"David"と"Eve"が表示されることを確認
      const listId = await nameInput.getAttribute('list');
      const datalist = page.locator(`#${listId}`);
      const options = datalist.locator('option');

      const optionValues = await options.evaluateAll((elements) =>
        elements.map((el) => (el as HTMLOptionElement).value)
      );

      expect(optionValues).toContain('David');
      expect(optionValues).toContain('Eve');
    });
  });

  test.describe('Task 11.3: API障害時のフォールバックテスト', () => {
    test('500エラー時にプルダウンが空のまま動作する', async ({ page }) => {
      // Requirements: 8.1

      // モックAPI: GET /api/player-names（500エラー）
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        } else {
          await route.continue();
        }
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      const nameInput = page.locator('[data-testid="player-name-edit-input-0"]');

      // フォーカス（履歴取得を試みる）
      await nameInput.focus();
      await page.waitForTimeout(500); // API呼び出し待機

      // <datalist>が空であることを確認
      const listId = await nameInput.getAttribute('list');
      const datalist = page.locator(`#${listId}`);

      // <datalist>要素は存在するが、<option>が0件（<datalist>は仕様上hidden）
      await expect(datalist).toHaveCount(1);
      const options = datalist.locator('option');
      await expect(options).toHaveCount(0);
    });

    test('API障害時も通常のテキスト入力が可能である', async ({ page }) => {
      // Requirements: 8.3

      // モックAPI: GET /api/player-names（ネットワークエラー）
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      const nameInput = page.locator('[data-testid="player-name-edit-input-0"]');

      // フォーカス（履歴取得失敗）
      await nameInput.focus();
      await page.waitForTimeout(500);

      // 通常のテキスト入力が可能であることを確認
      await nameInput.fill('NewPlayer');
      const inputValue = await nameInput.inputValue();
      expect(inputValue).toBe('NewPlayer');
    });

    test('API障害時にエラーUI通知が表示されない', async ({ page }) => {
      // Requirements: 11.2

      // モックAPI: GET /api/player-names（500エラー）
      await page.route('**/api/player-names', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        } else {
          await route.continue();
        }
      });

      await gameTimerPage.navigate();

      // 通常モードのUIが表示されるまで待機
      await page.waitForSelector('[data-testid="player-name-edit-list"]', { timeout: 10000 });

      const nameInput = page.locator('[data-testid="player-name-edit-input-0"]');

      // フォーカス（履歴取得失敗）
      await nameInput.focus();
      await page.waitForTimeout(500);

      // エラーメッセージが表示されないことを確認
      const errorMessages = page.locator('.error-message, .error-notification, .alert-error');
      await expect(errorMessages).toHaveCount(0);

      // ページは正常に動作し続ける
      const isInputEnabled = await nameInput.isEnabled();
      expect(isInputEnabled).toBe(true);
    });
  });
});
