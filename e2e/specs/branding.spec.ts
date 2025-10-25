import { test, expect } from '@playwright/test';

test.describe('ONEmore Turn ブランディング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('ブラウザタブのタイトルが「ONEmore Turn」である', async ({ page }) => {
    await expect(page).toHaveTitle('ONEmore Turn');
  });

  test('ファビコンが正しく読み込まれる', async ({ page }) => {
    // link[rel="icon"]要素を探す
    const faviconLink = page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveAttribute('href', '/favicon.png');
  });

  test('アプリ画面上部にヘッダーロゴが表示される', async ({ page }) => {
    // data-testidでロゴを探す
    const logo = page.getByTestId('app-header-logo');
    await expect(logo).toBeVisible();

    // src属性を確認
    await expect(logo).toHaveAttribute('src', '/ONEmore Turn LOGO.png');

    // alt属性を確認
    await expect(logo).toHaveAttribute('alt', 'ONEmore Turnロゴ');
  });

  test('アプリ画面上部にタイトルテキストが表示される', async ({ page }) => {
    // data-testidでタイトルを探す
    const title = page.getByTestId('app-header-title');
    await expect(title).toBeVisible();

    // テキスト内容を確認
    await expect(title).toHaveText('ONEmore Turn');

    // h1要素であることを確認（セマンティックHTML）
    const titleElement = await title.elementHandle();
    const tagName = await titleElement?.evaluate(el => el.tagName);
    expect(tagName).toBe('H1');
  });

  test('スマートフォンサイズ（375px）でロゴサイズが適切に調整される', async ({ page }) => {
    // ビューポートをスマートフォンサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    const logo = page.getByTestId('app-header-logo');
    await expect(logo).toBeVisible();

    // ロゴの高さを確認（CSSで40pxに設定されている）
    const logoBox = await logo.boundingBox();
    expect(logoBox).toBeTruthy();
    expect(logoBox!.height).toBeCloseTo(40, 5); // 40px ± 5px
  });

  test('タブレットサイズ（768px）でロゴサイズが適切に調整される', async ({ page }) => {
    // ビューポートをタブレットサイズに設定
    await page.setViewportSize({ width: 768, height: 1024 });

    const logo = page.getByTestId('app-header-logo');
    await expect(logo).toBeVisible();

    // ロゴの高さを確認（CSSで56pxに設定されている）
    const logoBox = await logo.boundingBox();
    expect(logoBox).toBeTruthy();
    expect(logoBox!.height).toBeCloseTo(56, 5); // 56px ± 5px
  });

  test('PCサイズ（1024px）でロゴサイズが適切に調整される', async ({ page }) => {
    // ビューポートをPCサイズに設定
    await page.setViewportSize({ width: 1024, height: 768 });

    const logo = page.getByTestId('app-header-logo');
    await expect(logo).toBeVisible();

    // ロゴの高さを確認（CSSで72pxに設定されている）
    const logoBox = await logo.boundingBox();
    expect(logoBox).toBeTruthy();
    expect(logoBox!.height).toBeCloseTo(72, 5); // 72px ± 5px
  });

  test('大画面サイズ（1440px）でロゴサイズが適切に調整される', async ({ page }) => {
    // ビューポートを大画面サイズに設定
    await page.setViewportSize({ width: 1440, height: 900 });

    const logo = page.getByTestId('app-header-logo');
    await expect(logo).toBeVisible();

    // ロゴの高さを確認（CSSで80pxに設定されている）
    const logoBox = await logo.boundingBox();
    expect(logoBox).toBeTruthy();
    expect(logoBox!.height).toBeCloseTo(80, 5); // 80px ± 5px
  });

  test('アクセシビリティ: alt属性が設定されている', async ({ page }) => {
    const logo = page.getByTestId('app-header-logo');
    const alt = await logo.getAttribute('alt');

    expect(alt).toBe('ONEmore Turnロゴ');
  });

  test('アクセシビリティ: セマンティックHTMLが使用されている', async ({ page }) => {
    // header要素を探す
    const header = page.locator('header.app-header');
    await expect(header).toBeVisible();
  });
});
