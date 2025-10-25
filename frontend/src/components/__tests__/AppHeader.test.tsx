import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '../AppHeader';

describe('AppHeader', () => {
  it('AppHeaderが正しくレンダリングされる', () => {
    const { container } = render(<AppHeader />);
    const header = container.querySelector('header');

    expect(header).toBeTruthy();
    expect(header?.classList.contains('app-header')).toBe(true);
  });

  it('ロゴ画像が正しいパスで表示される', () => {
    render(<AppHeader />);

    const logo = screen.getByRole('img');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('/ONEmore Turn LOGO.png');
  });

  it('alt属性が適切に設定されている', () => {
    render(<AppHeader />);

    const logo = screen.getByRole('img');
    expect(logo.getAttribute('alt')).toBe('ONEmore Turnロゴ');
  });

  it('CSSクラスが正しく適用されている', () => {
    render(<AppHeader />);

    const logo = screen.getByRole('img');
    expect(logo.classList.contains('app-header__logo')).toBe(true);
  });

  it('ロゴのdata-testid属性が設定されている', () => {
    render(<AppHeader />);

    const logo = screen.getByTestId('app-header-logo');
    expect(logo).toBeTruthy();
  });

  it('タイトルテキスト「ONEmore Turn」が表示される', () => {
    render(<AppHeader />);

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('ONEmore Turn');
  });

  it('タイトルにCSSクラスが適用されている', () => {
    render(<AppHeader />);

    const title = screen.getByTestId('app-header-title');
    expect(title.classList.contains('app-header__title')).toBe(true);
  });

  it('タイトルがh1要素である（セマンティックHTML）', () => {
    render(<AppHeader />);

    const title = screen.getByTestId('app-header-title');
    expect(title.tagName).toBe('H1');
  });
});
