import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 * Phase 1: フロントエンドのみ（インメモリ）
 * Phase 2: バックエンド統合（Cosmos DB + SignalR）
 */
export default defineConfig({
  // テストディレクトリ: Phase 1/2統合テストスイート
  testDir: './e2e/specs',

  // 並列実行設定
  fullyParallel: true,

  // CIでの失敗時リトライ
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // ワーカー数（CI環境では1、ローカルでは並列実行）
  workers: process.env.CI ? 1 : undefined,

  // レポーター設定
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // グローバルタイムアウト設定
  timeout: 30000, // 30秒（タイマーテストで時間経過を検証するため）

  use: {
    // ベースURL
    baseURL: 'http://localhost:5173',

    // トレース記録（初回リトライ時のみ）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画（失敗時のみ）
    video: 'retain-on-failure',

    // アサーションタイムアウト
    expect: {
      timeout: 5000,
    },
  },

  // ブラウザプロジェクト設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // 開発サーバー設定（ローカル実行時）
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd frontend && npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
