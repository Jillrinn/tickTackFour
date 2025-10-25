import './AppHeader.css';

export function AppHeader(): JSX.Element {
  return (
    <header className="app-header">
      <img
        src="/ONEmore Turn LOGO.png"
        alt="ONEmore Turnロゴ"
        className="app-header__logo"
        data-testid="app-header-logo"
      />
      <h1 className="app-header__title" data-testid="app-header-title">
        ONEmore Turn
      </h1>
    </header>
  );
}
