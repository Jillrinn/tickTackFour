import React from 'react';
import { useServerGameState } from '../hooks/useServerGameState';
import { usePollingSync, type PollingErrorInfo } from '../hooks/usePollingSync';
import { useGameApi } from '../hooks/useGameApi';
import { useETagManager } from '../hooks/useETagManager';
import { usePlayerNameHistory } from '../hooks/usePlayerNameHistory';
import { TopTimePlayerIndicator } from './TopTimePlayerIndicator';
import type { GameStateWithTime } from '../types/GameState';
import './GameTimer.css';

// 設定カードの全プレイヤー名入力が共有する履歴 datalist の id
const PLAYER_NAME_HISTORY_LIST_ID = 'player-name-history-shared';

/**
 * 設定カード「プレイヤー名変更」の1行（ラベル + 入力欄）。
 */
function PlayerNameEditInput({
  index,
  name,
  onChange,
  onFocus,
  onBlur
}: {
  index: number;
  name: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur?: () => void;
}) {
  return (
    <div className="player-name-edit-row">
      <span className="player-name-edit-label">P{index + 1}</span>
      <input
        type="text"
        className="player-name-input"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        list={PLAYER_NAME_HISTORY_LIST_ID}
        aria-label="プレイヤー名"
        data-testid={`player-name-edit-input-${index}`}
      />
    </div>
  );
}

/**
 * GameTimerルートコンポーネント（通常モード単一経路）
 * useServerGameState() → 通常モード（バックエンドAPI連携とポーリング同期）
 */
export function GameTimer() {
  // Phase 2: サーバー状態管理
  const serverGameState = useServerGameState();

  // カウントダウンモード用の初期時間設定（秒単位）
  const [countdownSeconds, setCountdownSeconds] = React.useState(600);

  // Task 3.4: ETag管理と楽観的ロック対応
  const { etag, updateEtag, clearConflictMessage } = useETagManager();

  // Task 7.1: プレイヤー名履歴管理
  const playerNameHistory = usePlayerNameHistory();

  // プレイヤー名入力フィールドのフォーカス時に履歴を取得
  const handlePlayerNameFocus = React.useCallback(() => {
    playerNameHistory.fetchNames();
  }, [playerNameHistory]);

  // ポーリング失敗時のエラーハンドラ
  const handlePollingError = React.useCallback((errorInfo: PollingErrorInfo) => {
    console.warn('[GameTimer] ポーリング3回連続失敗', errorInfo);
  }, []);

  // Task 3.1: ポーリング同期サービスの実装
  // 1秒ごとにバックエンドからゲーム状態を取得し、serverGameStateを更新
  usePollingSync((state: GameStateWithTime) => {
    console.log('[PollingSync] Server state updated:', state);
    // ポーリング由来の更新ではプレイヤー名をローカル保持し、保存反映前の古いサーバー名で上書きしない
    serverGameState.updateFromServer(state, null, true);
    updateEtag(state.etag);

    // Task 5.4: ポーリング同期時にゲーム全体時間も更新（通常モード）
    setTotalGameTime(serverGameState.getTotalGameTime());
  }, {
    enabled: import.meta.env.MODE !== 'test',
    interval: 1000,
    onError: handlePollingError
  });

  // Task 3.3: API呼び出し用のカスタムフック
  const { switchTurn, pauseGame: pauseGameApi, resumeGame: resumeGameApi, resetGame: resetGameApi, updateGame, updatePlayerName } = useGameApi();

  // 現在使用する状態とメソッドを決定（通常モード単一経路）
  const formatTime = serverGameState.formatTime;

  // 一時停止状態を取得
  const isPaused = serverGameState.serverState?.isPaused ?? false;

  // ゲームがアクティブかどうかを取得（ボタンの有効化判定で使用）
  const isGameActive = serverGameState.serverState
    ? serverGameState.serverState.activePlayerIndex !== -1
    : false;

  // ゲームが開始済みかどうかを判定（設定の無効化判定で使用）
  const isGameStarted = serverGameState.serverState
    ? (serverGameState.serverState.activePlayerIndex !== -1 || serverGameState.serverState.players.some(p => {
        // Phase 0暫定対応: カウントダウンモードUI非表示のため、カウントアップモードのみチェック
        return p.elapsedSeconds > 0;
      }))
    : false;

  // カタンモード関連の表示用算出
  const currentGameMode = serverGameState.serverState?.gameMode ?? 'normal';

  const currentPhase = serverGameState.serverState?.phase ?? 0;

  const isCatanMode = currentGameMode === 'catan';

  // タイムアウトしたプレイヤーID: 通常モードに同等APIが無いため null 固定
  const timedOutPlayerId: string | null = null;
  // timedOutPlayerId は将来のタイムアウト通知UI拡張用に宣言のみ保持
  void timedOutPlayerId;

  // 最長時間プレイヤーを取得
  const longestPlayer = serverGameState.getLongestTimePlayer();

  // timer-display-sync-fix Phase 3: 単一タイマー更新メカニズム
  // forceUpdate状態: 全タイマー表示を強制再レンダリングするためのダミー状態
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_forceUpdateCounter, setForceUpdateCounter] = React.useState(0);

  // timer-synchronization Phase 5: ゲーム全体時間の同期状態管理
  const [totalGameTime, setTotalGameTime] = React.useState(0);

  // timer-display-sync-fix Phase 3: 単一タイマー更新メカニズム
  // 全タイマー表示を1秒間隔で同期更新
  React.useEffect(() => {
    // タイマー実行条件: アクティブプレイヤーが存在 かつ 一時停止中でない
    const shouldRunTimer = isGameActive && !isPaused;

    if (!shouldRunTimer) {
      return;
    }

    // 1秒ごとにforceUpdateをトリガー → 全タイマー表示が再レンダリングされて同期
    const timerId = setInterval(() => {
      setForceUpdateCounter(prev => prev + 1);
      // ゲーム全体時間も同時に更新（通常モード）
      setTotalGameTime(serverGameState.getTotalGameTime());
    }, 1000);

    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameActive, isPaused]);

  // Task 5.7: 初期値設定
  React.useEffect(() => {
    setTotalGameTime(serverGameState.getTotalGameTime());
  }, [serverGameState]);

  // Task 4.2: プレイヤー名変更のデバウンス処理用タイマー
  const debounceTimerRef = React.useRef<Record<number, number>>({});

  // Task 4.2: プレイヤー名変更ハンドラ（楽観的更新 + デバウンスAPI呼び出し）
  const handlePlayerNameChange = React.useCallback(
    (playerIndex: number, newName: string) => {
      // 楽観的更新: ローカル状態を即座に更新
      serverGameState.updatePlayerNameOptimistic(playerIndex, newName);

      // 既存のデバウンスタイマーをクリア
      if (debounceTimerRef.current[playerIndex]) {
        clearTimeout(debounceTimerRef.current[playerIndex]);
      }

      // 300ms後にAPI呼び出し
      debounceTimerRef.current[playerIndex] = setTimeout(async () => {
        const result = await updatePlayerName(playerIndex, newName, etag ?? '');

        if (result === null) {
          // API失敗: ローカル状態をサーバー状態にロールバック
          console.error('Failed to update player name via API');
          // ポーリングで最新状態を取得するため、ここでは何もしない
        } else if ('type' in result && result.type === 'conflict') {
          // 409 Conflict: 他のユーザーが更新済み
          console.warn('Conflict detected, rolling back to latest state');
          const latestState = ('latestState' in result ? result.latestState : undefined) as GameStateWithTime | undefined;
          if (latestState) {
            serverGameState.updateFromServer(latestState);
            if (latestState.etag) {
              updateEtag(latestState.etag);
            }
          }
        } else {
          // 200 OK: 成功 (GameStateWithTime型)
          const gameState = result as GameStateWithTime;
          serverGameState.updateFromServer(gameState);
          if (gameState.etag) {
            updateEtag(gameState.etag);
          }
        }

        delete debounceTimerRef.current[playerIndex];
      }, 300) as unknown as number;
    },
    [updatePlayerName, etag, serverGameState, updateEtag]
  );

  // 設定カード「プレイヤー名変更」のドラフト状態
  const [draftNames, setDraftNames] = React.useState<string[]>([]);

  // 名前編集の対象プレイヤーと確定済みの名前（通常モード単一経路）
  const nameEditPlayers = serverGameState.serverState?.players ?? [];
  const committedNames = nameEditPlayers.map((player) => player.name);

  // プレイヤー人数が変わったらドラフトを確定名で再初期化
  React.useEffect(() => {
    setDraftNames(nameEditPlayers.map((player) => player.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameEditPlayers.length]);

  // 未保存の名前変更があるか（保存ボタンの有効/無効に使用）
  const hasUnsavedNameChanges =
    draftNames.length === committedNames.length &&
    draftNames.some((name, index) => name !== committedNames[index]);

  // 1つのドラフト名を更新
  const handleDraftNameChange = React.useCallback((playerIndex: number, value: string) => {
    setDraftNames((prev) => {
      const next = [...prev];
      next[playerIndex] = value;
      return next;
    });
  }, []);

  // 保存: ドラフトのうち変更があったプレイヤーのみをゲーム状態へ反映する（通常モード）
  const handleSavePlayerNames = React.useCallback(() => {
    draftNames.forEach((name, index) => {
      if (name === committedNames[index]) return; // 変更なしはスキップ
      // 通常モード: 楽観的更新 + デバウンスAPI呼び出し
      handlePlayerNameChange(index, name);
    });
  }, [draftNames, committedNames, handlePlayerNameChange]);

  // Task 8: ブラウザ閉じる前（beforeunload）にプレイヤー名を保存
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const players = serverGameState.serverState?.players;
      if (players) {
        const nonDefaultNames = players
          .map(p => p.name)
          .filter(name => !name.match(/^プレイヤー\d+$/));

        if (nonDefaultNames.length > 0) {
          playerNameHistory.saveNames(nonDefaultNames);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [serverGameState.serverState?.players, playerNameHistory]);

  // Task 3.3: API呼び出しハンドラ（通常モード単一経路）
  const handleSwitchTurn = React.useCallback(async () => {
    if (!etag) {
      console.warn('ETag not available, cannot switch turn');
      return;
    }
    const result = await switchTurn(etag);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      await serverGameState.syncWithServer();
    }
  }, [etag, switchTurn, updateEtag, clearConflictMessage, serverGameState]);

  // ネームカードクリック: そのプレイヤーへ手番をジャンプ（タイマー開始）。通常(API)モード専用
  const handleSelectActivePlayer = React.useCallback(async (playerIndex: number) => {
    if (isCatanMode) return;
    const activeIndex = serverGameState.serverState?.activePlayerIndex ?? -1;
    if (playerIndex === activeIndex) return;
    if (!etag) {
      console.warn('ETag not available, cannot select active player');
      return;
    }
    const result = await switchTurn(etag, playerIndex);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      await serverGameState.syncWithServer();
    }
  }, [isCatanMode, etag, switchTurn, serverGameState, updateEtag, clearConflictMessage]);

  // ネームカードをクリック可能にするためのprops
  const getCardClickProps = React.useCallback((playerIndex: number, isActive: boolean, playerName: string) => {
    if (isActive || isCatanMode) return {};
    return {
      onClick: () => handleSelectActivePlayer(playerIndex),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelectActivePlayer(playerIndex);
        }
      },
      tabIndex: 0,
      'aria-label': `${playerName}を手番にする`
    };
  }, [isCatanMode, handleSelectActivePlayer]);

  const handlePauseResume = React.useCallback(async () => {
    if (!etag) {
      console.warn('ETag not available, cannot pause/resume');
      return;
    }
    const result = isPaused
      ? await resumeGameApi(etag)
      : await pauseGameApi(etag);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      await serverGameState.syncWithServer();
    }
  }, [etag, isPaused, pauseGameApi, resumeGameApi, updateEtag, clearConflictMessage, serverGameState]);

  const handleResetGame = React.useCallback(async () => {
    // Task 8: リセット前にデフォルト名以外のプレイヤー名を保存
    const players = serverGameState.serverState?.players;
    if (players) {
      const nonDefaultNames = players
        .map(p => p.name)
        .filter(name => !name.match(/^プレイヤー\d+$/));

      if (nonDefaultNames.length > 0) {
        await playerNameHistory.saveNames(nonDefaultNames);
      }
    }

    if (!etag) {
      console.warn('ETag not available, cannot reset game');
      return;
    }
    const result = await resetGameApi(etag);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      await serverGameState.syncWithServer();
    }
  }, [etag, resetGameApi, updateEtag, clearConflictMessage, serverGameState, playerNameHistory]);

  const handlePlayerCountChange = React.useCallback(async (playerCount: number) => {
    if (!etag) {
      console.warn('ETag not available, cannot change player count');
      return;
    }
    const result = await updateGame(etag, { playerCount });
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
    }
  }, [etag, updateGame, updateEtag, clearConflictMessage]);

  const handleTimerModeChange = React.useCallback(async (checked: boolean) => {
    if (!etag) {
      console.warn('ETag not available, cannot change timer mode');
      return;
    }
    const params = checked
      ? { timerMode: 'countdown' as const, countdownSeconds }
      : { timerMode: 'countup' as const };
    const result = await updateGame(etag, params);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      serverGameState.updateFromServer(result);
      clearConflictMessage();
    }
  }, [etag, countdownSeconds, updateGame, updateEtag, clearConflictMessage, serverGameState]);

  const handleGameModeChange = React.useCallback(async (checked: boolean) => {
    const mode = checked ? 'catan' : 'normal';
    if (!etag) {
      console.warn('ETag not available, cannot change game mode');
      return;
    }
    const result = await updateGame(etag, { gameMode: mode });
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      await serverGameState.syncWithServer();
    }
  }, [etag, updateGame, updateEtag, clearConflictMessage, serverGameState]);

  return (
    <div className="game-timer">
      <main className="game-main">
        {/* Task 2.1-2.3: 固定ヘッダー */}
        <div className="sticky-header" data-testid="sticky-header">
          <div className="sticky-header-content" data-testid="sticky-header-content">
            {isCatanMode && isGameActive && (
              <span className={`phase-badge phase-${currentPhase}`} data-testid="phase-badge">
                フェーズ{currentPhase}
              </span>
            )}
            <div className="sticky-header-info" data-testid="active-player-info">
              {/* 通常モード: Phase 2サーバー状態 */}
              {serverGameState.serverState && serverGameState.serverState.activePlayerIndex !== -1 ? (
                <>
                  <span className="sticky-header-label">現在のプレイヤー:</span>
                  <span className="sticky-header-player">
                    {serverGameState.serverState.players[serverGameState.serverState.activePlayerIndex]?.name || 'プレイヤー'}
                  </span>
                  <span className="sticky-header-time">
                    {formatTime(serverGameState.displayTime)}
                  </span>
                </>
              ) : (
                <span className="sticky-header-status">ゲーム未開始</span>
              )}
            </div>
            {/* Task 5.1-5.2: ゲーム全体のプレイ時間表示 */}
            <div className="total-game-time" data-testid="total-game-time">
              <span className="total-game-time-label">ゲーム全体:</span>
              <span
                className={`total-game-time-value ${
                  (() => {
                    const totalSeconds = totalGameTime;
                    if (totalSeconds < 3600) return 'normal';
                    if (totalSeconds < 7200) return 'warning';
                    return 'danger';
                  })()
                }`}
              >
                {serverGameState.formatGameTime(totalGameTime)}
              </span>
            </div>
            <div className="sticky-header-actions">
              <button
                onClick={handlePauseResume}
                className="pause-btn sticky-header-btn"
                disabled={!isGameActive}
                aria-label={isPaused ? 'ゲームを再開' : 'ゲームを一時停止'}
              >
                {isPaused ? '▶️ タイマー再開' : '⏸️ タイマー停止'}
              </button>
              <button
                onClick={handleSwitchTurn}
                className="next-player-btn sticky-header-btn"
                aria-label={isGameActive ? "次のプレイヤーに切り替え" : "ゲームを開始"}
                data-testid="start-game-button"
              >
                {isGameActive ? '次のプレイヤーへ →' : 'ゲームを開始する'}
              </button>
            </div>
          </div>
        </div>

        {/* 最長時間プレイヤー表示（カウントアップモード時のみ） */}
        <TopTimePlayerIndicator longestPlayer={longestPlayer} />

        <div className="players-section">
          <h3>プレイヤー一覧</h3>
          <ul className="players-grid">
            {/* 通常モード: Phase 2サーバー状態 */}
            {(serverGameState.serverState?.players || []).map((player, index) => {
              const isActive = index === (serverGameState.serverState?.activePlayerIndex ?? -1);
              return (
                <li
                  key={index}
                  className={`player-card ${isActive ? 'active' : 'clickable'} ${isActive && isCatanMode && currentPhase === 1 ? 'catan-phase1' : ''}`}
                  data-testid={`player-card-${index}`}
                  {...getCardClickProps(index, isActive, player.name)}
                >
                  <div className="player-info">
                    {/* プレイヤー名は表示のみ。変更は設定カードの「プレイヤー名変更」から行う */}
                    <span className="player-name">{player.name}</span>
                  </div>
                  <div className="player-time">
                    経過時間: {formatTime(isActive ? serverGameState.displayTime : player.elapsedSeconds)}
                  </div>
                  {isActive && serverGameState.serverState && serverGameState.serverState.turnStartedAt && (
                    <div className="turn-time" data-testid="turn-time">
                      現在のターン: {serverGameState.formatTime(serverGameState.getCurrentTurnTime())}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="controls-section" data-testid="controls-section">
          <h3>設定</h3>

          {/* 設定セクション */}
          <div className="settings-controls" data-testid="settings-controls">
            <div className="settings-grid">
              {/* Task 3.1: プレイヤー人数ドロップダウン */}
              <div className="setting-item">
                <label htmlFor="player-count" className="setting-label">プレイヤー人数</label>
                <select
                  id="player-count"
                  className="styled-select"
                  value={serverGameState.serverState?.players.length || 4}
                  onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
                  disabled={isGameStarted}
                  data-testid="player-count-dropdown"
                  aria-label="プレイヤー人数選択"
                >
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                  <option value={6}>6人</option>
                </select>
              </div>

              {/* カタンモード切替（ゲーム開始前のみ） */}
              <div className="setting-item">
                <label className="setting-label">カタンモード</label>
                <label className="toggle-switch-enhanced">
                  <input
                    type="checkbox"
                    checked={isCatanMode}
                    onChange={(e) => handleGameModeChange(e.target.checked)}
                    disabled={isGameStarted}
                    title={isGameStarted ? 'ゲーム開始後はカタンモードを変更できません' : ''}
                    data-testid="game-mode-toggle"
                    aria-label="カタンモード切替"
                  />
                  <span className="toggle-slider">
                    <span className="toggle-label-left">通常</span>
                    <span className="toggle-label-right">カタン</span>
                  </span>
                </label>
              </div>

              {/* プレイヤー名変更セクション（プレイ中でも変更可能） */}
              <div className="setting-item">
                <label className="setting-label">プレイヤー名変更</label>
                <div className="player-name-edit-list" data-testid="player-name-edit-list">
                  {/* 全入力欄で共有する履歴候補 */}
                  <datalist id={PLAYER_NAME_HISTORY_LIST_ID}>
                    {playerNameHistory.names.map((name, historyIndex) => (
                      <option key={historyIndex} value={name} />
                    ))}
                  </datalist>
                  {nameEditPlayers.map((player, index) => (
                    <PlayerNameEditInput
                      key={index}
                      index={index}
                      name={draftNames[index] ?? player.name}
                      onChange={(value) => handleDraftNameChange(index, value)}
                      onFocus={handlePlayerNameFocus}
                    />
                  ))}
                  <div className="player-name-edit-actions">
                    <button
                      type="button"
                      className="save-names-btn"
                      onClick={handleSavePlayerNames}
                      disabled={!hasUnsavedNameChanges}
                      data-testid="save-player-names"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>

              {/* Phase 0: 暫定対応 - タイマーモードUI非表示（カウントダウンモード修正完了までの暫定措置） */}
              {/* eslint-disable-next-line no-constant-binary-expression */}
              {false && (
                <>
                  {/* Task 4.1 & 4.2: カウントモードトグルスイッチ */}
                  <div className="setting-item">
                    <label className="setting-label">タイマーモード</label>
                    <label className="toggle-switch-enhanced">
                      <input
                        type="checkbox"
                        checked={serverGameState.serverState?.timerMode === 'countdown'}
                        onChange={(e) => handleTimerModeChange(e.target.checked)}
                        disabled={isGameStarted}
                        title={isGameStarted ? 'ゲーム開始後はタイマーモードを変更できません' : ''}
                        data-testid="timer-mode-toggle"
                        aria-label="カウントモード切替"
                      />
                      <span className="toggle-slider">
                        <span className="toggle-label-left">カウントアップ</span>
                        <span className="toggle-label-right">カウントダウン</span>
                      </span>
                    </label>
                  </div>
                  {serverGameState.serverState?.timerMode === 'countdown' && (
                    <div className="countdown-control">
                      <input
                        type="number"
                        value={countdownSeconds}
                        onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                        min="1"
                        max="3600"
                        disabled={isGameStarted}
                        title={isGameStarted ? 'ゲーム開始後はカウントダウン秒数を変更できません' : ''}
                        data-testid="countdown-seconds-input"
                      />
                      <span>秒</span>
                    </div>
                  )}
                </>
              )}
              <div className="setting-item">
                <button onClick={handleResetGame} className="reset-btn">リセット</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default GameTimer;
