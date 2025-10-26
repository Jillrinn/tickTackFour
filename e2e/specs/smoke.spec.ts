import { test, expect } from '@playwright/test';

/**
 * スモークテスト: Playwright実行と基本機能の検証
 */
test.describe('スモークテスト', () => {
  test('アプリケーションが正常にロードされる', async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('/');

    // ページタイトルの確認
    await expect(page).toHaveTitle('ONEmore Turn');

    // メインコンテンツの表示確認
    const gameTimer = page.locator('#root');
    await expect(gameTimer).toBeVisible();
  });

  test('3ブラウザでの実行を検証', async ({ page, browserName }) => {
    await page.goto('/');

    // ブラウザ名をコンソールに出力
    console.log(`Testing on: ${browserName}`);

    // 基本的な要素の存在確認
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('スクリーンショット機能を検証', async ({ page }) => {
    await page.goto('/');

    // スクリーンショットを撮影（テスト成功時は保存されない）
    await page.screenshot({ path: 'test-results/smoke-test.png' });

    // 基本要素の確認
    await expect(page.locator('#root')).toBeVisible();
  });
});
