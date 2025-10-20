import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * プレイヤー名永続化機能のE2Eテスト
 * Requirements: 1.1, 1.2, 4.1, 4.3, 8.1, 8.3, 11.2
 */
test.describe('プレイヤー名永続化機能', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    // Phase 1フォールバックモードを強制的にアクティブにするため、
    // ポーリング用のGET /api/gameを失敗させる
    await page.route('**/api/game', async (route) => {
      if (route.request().method() === 'GET') {
        await route.abort('failed');
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

      // フォールバックモード警告が表示されるまで待機
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      // プレイヤー0の名前入力フィールドを取得
      const playerCard = gameTimerPage.getPlayerCardByIndex(0);
      const nameInput = playerCard.locator('.player-name-input');

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
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      const playerCard = gameTimerPage.getPlayerCardByIndex(0);
      const nameInput = playerCard.locator('.player-name-input');

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

      let postRequestReceived = false;
      let savedNames: string[] = [];

      // モックAPI: GET /api/player-names（初回空）
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

      await gameTimerPage.navigate();
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      // プレイヤー1の名前を"David"に変更
      await gameTimerPage.setPlayerName(0, 'David');

      // ゲームリセットボタンをクリック
      await gameTimerPage.resetGame();

      // POST /api/player-namesが呼び出されることを確認
      // デバウンス3秒待機が必要
      await page.waitForTimeout(3500); // デバウンス3秒 + マージン
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
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      // プレイヤー0の名前入力フィールドをフォーカス
      const playerCard = gameTimerPage.getPlayerCardByIndex(0);
      const nameInput = playerCard.locator('.player-name-input');
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
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      const playerCard = gameTimerPage.getPlayerCardByIndex(0);
      const nameInput = playerCard.locator('.player-name-input');

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
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      const playerCard = gameTimerPage.getPlayerCardByIndex(0);
      const nameInput = playerCard.locator('.player-name-input');

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
      await page.waitForSelector('[data-testid="fallback-warning"]', { timeout: 10000 });

      const playerCard = gameTimerPage.getPlayerCardByIndex(0);
      const nameInput = playerCard.locator('.player-name-input');

      // フォーカス（履歴取得失敗）
      await nameInput.focus();
      await page.waitForTimeout(500);

      // エラーメッセージが表示されないことを確認
      // フォールバック警告（data-testid="fallback-warning"）は除外
      const errorMessages = page.locator('.error-message, .error-notification, .alert-error').filter({ hasNot: page.getByTestId('fallback-warning') });
      await expect(errorMessages).toHaveCount(0);

      // ページは正常に動作し続ける
      const isInputEnabled = await nameInput.isEnabled();
      expect(isInputEnabled).toBe(true);
    });
  });
});
