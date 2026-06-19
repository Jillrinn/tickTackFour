import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { useServerGameState } from '../hooks/useServerGameState';
import { usePollingSync, type PollingErrorInfo } from '../hooks/usePollingSync';
import { useGameApi } from '../hooks/useGameApi';
import { useETagManager } from '../hooks/useETagManager';
import { useFallbackMode } from '../hooks/useFallbackMode';
import { usePlayerNameHistory } from '../hooks/usePlayerNameHistory';
import { useGameTimer } from '../hooks/useGameTimer';
import { TopTimePlayerIndicator } from './TopTimePlayerIndicator';
import type { GameStateWithTime } from '../types/GameState';
import { getCatanPhase } from '../utils/turnSequence';
import './GameTimer.css';

// 設定カードの全プレイヤー名入力が共有する履歴 datalist の id
const PLAYER_NAME_HISTORY_LIST_ID = 'player-name-history-shared';

/**
 * 設定カード「プレイヤー名変更」の1行（ラベル + 入力欄）。
 * フォールバックモード/通常モードで共通利用し、モード差はハンドラ経由で吸収する。
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
 * GameTimerルートコンポーネント（Phase 1→2移行完了）
 * - Phase 1: useGameState() → フォールバックモード専用（インメモリー状態管理）
 * - Phase 2: useServerGameState() → 通常モード（バックエンドAPI連携とポーリング同期）
 *
 * 状態管理の切り替え:
 * - フォールバックモード時（API接続失敗）: fallbackStateを使用
 * - 通常モード時（API接続成功）: serverGameStateを使用
 */
export function GameTimer() {
  // Phase 1: フォールバックモード専用（インメモリー状態管理）
  const fallbackState = useGameState();

  // Phase 2: サーバー状態管理（新規hook）
  const serverGameState = useServerGameState();

  // カウントダウンモード用の初期時間設定（秒単位）
  const [countdownSeconds, setCountdownSeconds] = React.useState(600);

  // Task 3.4: ETag管理と楽観的ロック対応
  const { etag, updateEtag, clearConflictMessage } = useETagManager();

  // Task 4.1: インメモリーモードへのフォールバック機能
  const { isInFallbackMode, activateFallbackMode, deactivateFallbackMode } = useFallbackMode();

  // Task 7.1: プレイヤー名履歴管理
  const playerNameHistory = usePlayerNameHistory();

  // プレイヤー名入力フィールドのフォーカス時に履歴を取得
  const handlePlayerNameFocus = React.useCallback(() => {
    playerNameHistory.fetchNames();
  }, [playerNameHistory]);

  // ポーリング失敗時のエラーハンドラ
  const handlePollingError = React.useCallback((errorInfo: PollingErrorInfo) => {
    console.warn('[GameTimer] ポーリング3回連続失敗、フォールバックモードに切り替えます', errorInfo);
    // E2Eテスト環境ではバックエンド起動待ちのため、フォールバックモード切り替えを無効化
    // window.location.hostname === 'localhost' の場合は本番環境ではないと判断
    if (import.meta.env.MODE === 'production') {
      activateFallbackMode(errorInfo.lastError);
    }
  }, [activateFallbackMode]);

  // Task 3.1: ポーリング同期サービスの実装
  // 5秒ごとにバックエンドからゲーム状態を取得し、serverGameStateを更新
  // テスト環境では無効化（jsdomで相対URLが使えないため）
  usePollingSync((state: GameStateWithTime) => {
    console.log('[PollingSync] Server state updated:', state);
    // 名前編集はドラフト管理（サーバー状態と独立）のため、そのまま反映してよい
    serverGameState.updateFromServer(state);
    updateEtag(state.etag);

    // Task 5.4: ポーリング同期時にゲーム全体時間も更新（通常モード）
    // serverGameState.getTotalGameTime()は最新のserverStateに基づいて計算される
    setTotalGameTime(serverGameState.getTotalGameTime());

    // API接続成功時、フォールバックモードから復帰
    if (isInFallbackMode) {
      deactivateFallbackMode();
    }
  }, {
    enabled: import.meta.env.MODE !== 'test',
    onError: handlePollingError
  });

  // Task 3.3: API呼び出し用のカスタムフック
  const { switchTurn, pauseGame: pauseGameApi, resumeGame: resumeGameApi, resetGame: resetGameApi, updateGame, updatePlayerName } = useGameApi();

  // 現在使用する状態とメソッドを決定（モード切替）
  // フォールバックモード時: fallbackState、通常モード時: serverGameState
  // テスト環境では常にfallbackStateを使用（ポーリングが無効のため）
  const gameState = (import.meta.env.VITEST || isInFallbackMode) ? fallbackState.gameState : null;
  const formatTime = (import.meta.env.VITEST || isInFallbackMode) ? fallbackState.formatTime : serverGameState.formatTime;

  // 一時停止状態を取得（ハンドラ関数で使用）
  const isPaused = (import.meta.env.VITEST || isInFallbackMode)
    ? fallbackState.gameState.isPaused
    : (serverGameState.serverState?.isPaused ?? false);

  // ゲームがアクティブかどうかを取得（ボタンの有効化判定で使用）
  const isGameActive = (import.meta.env.VITEST || isInFallbackMode)
    ? (fallbackState.gameState.activePlayerId !== null)
    : (serverGameState.serverState ? serverGameState.serverState.activePlayerIndex !== -1 : false);

  // ゲームが開始済みかどうかを判定（設定の無効化判定で使用）
  // 開始済み: activePlayerIndex が 0 以上 OR いずれかのプレイヤーが実際にプレイした形跡がある
  // カウントアップモード: elapsedTimeSeconds > 0
  // カウントダウンモード: elapsedTimeSeconds < initialTimeSeconds
  const isGameStarted = (import.meta.env.VITEST || isInFallbackMode)
    ? (fallbackState.gameState.activePlayerId !== null || fallbackState.gameState.players.some(p => {
        const timerMode = fallbackState.gameState.timerMode;
        return timerMode === 'countup'
          ? p.elapsedTimeSeconds > 0
          : p.elapsedTimeSeconds < p.initialTimeSeconds;
      }))
    : (serverGameState.serverState
        ? (serverGameState.serverState.activePlayerIndex !== -1 || serverGameState.serverState.players.some(p => {
            // Phase 0暫定対応: カウントダウンモードUI非表示のため、カウントアップモードのみチェック
            return p.elapsedSeconds > 0;
          }))
        : false // serverGameState.serverStateがnullの場合、未開始と判定
      );

  // カタンモード関連の表示用算出（フォールバック/通常モード両対応）
  const currentGameMode = (import.meta.env.VITEST || isInFallbackMode)
    ? fallbackState.gameState.gameMode
    : (serverGameState.serverState?.gameMode ?? 'normal');

  const currentPhase = (import.meta.env.VITEST || isInFallbackMode)
    ? getCatanPhase(fallbackState.gameState.turnNumber, fallbackState.gameState.players.length)
    : (serverGameState.serverState?.phase ?? 0);

  const isCatanMode = currentGameMode === 'catan';

  // タイムアウトしたプレイヤーID（Task 12.2） - フォールバックモード時のみ
  const timedOutPlayerId = isInFallbackMode ? fallbackState.getTimedOutPlayerId() : null;

  // 最長時間プレイヤーを取得
  const longestPlayer = isInFallbackMode ? fallbackState.getLongestTimePlayer() : serverGameState.getLongestTimePlayer();

  // timer-display-sync-fix Phase 3: 単一タイマー更新メカニズム（Task 4.1）
  // forceUpdate状態: 全タイマー表示を強制再レンダリングするためのダミー状態
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_forceUpdateCounter, setForceUpdateCounter] = React.useState(0);

  // timer-synchronization Phase 5: ゲーム全体時間の同期状態管理
  // Task 5.1: getTotalGameTime()結果をstateで管理し、タイマーtickで明示的に更新
  const [totalGameTime, setTotalGameTime] = React.useState(0);

  // timer-synchronization: useGameTimerフック統合（フォールバックモードのみ）
  // onTimerTickコールバックでプレイヤー時間を更新
  useGameTimer(
    isInFallbackMode && gameState ? gameState : { players: [], activePlayerId: null, isPaused: true, timerMode: 'countup', createdAt: new Date(), lastUpdatedAt: new Date(), pausedAt: null },
    (playerId, newElapsedTime) => {
      // フォールバックモードの場合のみ、プレイヤー時間を更新
      if (isInFallbackMode && gameState) {
        fallbackState.updatePlayerTime(playerId, newElapsedTime);
      }
    }
  );

  // timer-display-sync-fix Phase 3: 単一タイマー更新メカニズム（Task 4.1）
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
      // ゲーム全体時間も同時に更新（フォールバックモード・通常モード両対応）
      if (isInFallbackMode) {
        setTotalGameTime(fallbackState.getTotalGameTime());
      } else {
        setTotalGameTime(serverGameState.getTotalGameTime());
      }
    }, 1000);

    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameActive, isPaused, isInFallbackMode]);

  // Task 5.7: 通常モード切り替え時の初期値設定
  React.useEffect(() => {
    if (!isInFallbackMode) {
      setTotalGameTime(serverGameState.getTotalGameTime());
    }
  }, [isInFallbackMode, serverGameState]);

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
  // 入力中はここに保持し、「保存」ボタン押下で初めてゲーム状態へ反映する
  const [draftNames, setDraftNames] = React.useState<string[]>([]);

  // 名前編集の対象プレイヤー（モード非依存）と確定済みの名前
  const nameEditPlayers = (import.meta.env.MODE === 'test' || isInFallbackMode)
    ? (gameState?.players ?? [])
    : (serverGameState.serverState?.players ?? []);
  const committedNames = nameEditPlayers.map((player) => player.name);

  // プレイヤー人数が変わったらドラフトを確定名で再初期化（人数不変なら編集中の値を保持）
  React.useEffect(() => {
    setDraftNames(nameEditPlayers.map((player) => player.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameEditPlayers.length, isInFallbackMode]);

  // 未保存の名前変更があるか（保存ボタンの有効/無効に使用）
  const hasUnsavedNameChanges =
    draftNames.length === committedNames.length &&
    draftNames.some((name, index) => name !== committedNames[index]);

  // 1つのドラフト名を更新（入力中はゲーム状態へは反映しない）
  const handleDraftNameChange = React.useCallback((playerIndex: number, value: string) => {
    setDraftNames((prev) => {
      const next = [...prev];
      next[playerIndex] = value;
      return next;
    });
  }, []);

  // 保存: ドラフトのうち変更があったプレイヤーのみをゲーム状態へ反映する
  const handleSavePlayerNames = React.useCallback(() => {
    draftNames.forEach((name, index) => {
      if (name === committedNames[index]) return; // 変更なしはスキップ
      if (import.meta.env.MODE === 'test' || isInFallbackMode) {
        const player = gameState?.players[index];
        if (player) {
          fallbackState.updatePlayerName(player.id, name);
        }
      } else {
        // 通常モード: 楽観的更新 + デバウンスAPI呼び出し
        handlePlayerNameChange(index, name);
      }
    });
  }, [draftNames, committedNames, isInFallbackMode, gameState, fallbackState, handlePlayerNameChange]);

  // Task 8: ブラウザ閉じる前（beforeunload）にプレイヤー名を保存
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const players = isInFallbackMode ? gameState?.players : serverGameState.serverState?.players;
      if (players) {
        const nonDefaultNames = players
          .map(p => p.name)
          .filter(name => !name.match(/^プレイヤー\d+$/)); // デフォルト名（「プレイヤー1」等）を除外

        if (nonDefaultNames.length > 0) {
          // navigator.sendBeacon()を使ってブラウザ閉じる前に確実に送信
          // ただし、usePlayerNameHistoryのsaveNamesはasync関数なので、
          // テスト環境ではfetchを使って検証可能にする
          playerNameHistory.saveNames(nonDefaultNames);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInFallbackMode, gameState, serverGameState.serverState?.players, playerNameHistory]);

  // Task 3.3: API呼び出しハンドラ
  // テスト環境またはフォールバックモード時はローカル状態管理を使用、本番環境ではAPI呼び出しを実行
  const handleSwitchTurn = React.useCallback(async () => {
    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      fallbackState.switchToNextPlayer();
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot switch turn');
      return;
    }
    const result = await switchTurn(etag);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      // Task 2.1: API呼び出し完了後、即座にサーバー状態を取得して画面をリフレッシュ
      await serverGameState.syncWithServer();
    }
  }, [isInFallbackMode, etag, switchTurn, fallbackState, updateEtag, clearConflictMessage, serverGameState]);

  // ネームカードクリック: そのプレイヤーへ手番をジャンプ（タイマー開始）。通常(API)モード専用
  // - アクティブ本人は何もしない
  // - 一時停止中はジャンプするが停止は維持（バックエンド側でisPaused維持）
  const handleSelectActivePlayer = React.useCallback(async (playerIndex: number) => {
    if (isCatanMode) return; // カタンモードでは手番ジャンプ不可
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

  // ネームカードをクリック可能にするためのprops（アクティブ本人は非クリック）
  const getCardClickProps = React.useCallback((playerIndex: number, isActive: boolean, playerName: string) => {
    if (isActive || isCatanMode) return {};
    // 注: <li>のlistitemロールを保持するためrole="button"は付けない
    // （tabIndex + onKeyDown + aria-labelでキーボード操作とラベルを担保）
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
    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      fallbackState.setPaused(!isPaused);
      return;
    }
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
      // Task 2.2: API呼び出し完了後、即座にサーバー状態を取得して画面をリフレッシュ
      await serverGameState.syncWithServer();
    }
  }, [isInFallbackMode, etag, isPaused, pauseGameApi, resumeGameApi, fallbackState, updateEtag, clearConflictMessage, serverGameState]);

  const handleResetGame = React.useCallback(async () => {
    // Task 8: リセット前にデフォルト名以外のプレイヤー名を保存
    const players = isInFallbackMode ? gameState?.players : serverGameState.serverState?.players;
    if (players) {
      const nonDefaultNames = players
        .map(p => p.name)
        .filter(name => !name.match(/^プレイヤー\d+$/)); // デフォルト名（「プレイヤー1」等）を除外

      if (nonDefaultNames.length > 0) {
        await playerNameHistory.saveNames(nonDefaultNames);
      }
    }

    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      fallbackState.resetGame();
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot reset game');
      return;
    }
    const result = await resetGameApi(etag);
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
      // Task 2.3: API呼び出し完了後、即座にサーバー状態を取得して画面をリフレッシュ
      await serverGameState.syncWithServer();
    }
  }, [isInFallbackMode, etag, resetGameApi, fallbackState, updateEtag, clearConflictMessage, gameState, serverGameState, playerNameHistory]);

  const handlePlayerCountChange = React.useCallback(async (playerCount: number) => {
    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      fallbackState.setPlayerCount(playerCount);
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot change player count');
      return;
    }
    const result = await updateGame(etag, { playerCount });
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      clearConflictMessage();
    }
  }, [isInFallbackMode, etag, updateGame, fallbackState, updateEtag, clearConflictMessage]);

  const handleTimerModeChange = React.useCallback(async (checked: boolean) => {
    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      if (checked) {
        fallbackState.setTimerMode('countdown', countdownSeconds);
      } else {
        fallbackState.setTimerMode('countup');
      }
      return;
    }
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
      // API呼び出し後、即座にゲーム状態を同期
      serverGameState.updateFromServer(result);
      clearConflictMessage();
    }
  }, [isInFallbackMode, etag, countdownSeconds, updateGame, fallbackState, updateEtag, clearConflictMessage, serverGameState]);

  const handleGameModeChange = React.useCallback(async (checked: boolean) => {
    const mode = checked ? 'catan' : 'normal';
    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      fallbackState.setGameMode(mode);
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot change game mode');
      return;
    }
    const result = await updateGame(etag, { gameMode: mode });
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      serverGameState.updateFromServer(result);
      clearConflictMessage();
    }
  }, [isInFallbackMode, etag, updateGame, fallbackState, updateEtag, clearConflictMessage, serverGameState]);

  return (
    <div className="game-timer">
      <main className="game-main">
        {/* Task 4.1: フォールバックモード警告 */}
        {isInFallbackMode && (
          <div className="fallback-mode-warning" role="alert" aria-live="assertive" data-testid="fallback-warning">
            ⚠️ API接続が失敗しました。インメモリーモードで動作しています。
          </div>
        )}

        {/* Task 2.1-2.3: 固定ヘッダー */}
        <div className="sticky-header" data-testid="sticky-header">
          <div className="sticky-header-content" data-testid="sticky-header-content">
            {isCatanMode && isGameActive && (
              <span className="phase-badge" data-testid="phase-badge">
                フェーズ{currentPhase}
              </span>
            )}
            <div className="sticky-header-info" data-testid="active-player-info">
              {isInFallbackMode ? (
                // フォールバックモード: Phase 1ローカル状態
                gameState && gameState.activePlayerId ? (
                  <>
                    <span className="sticky-header-label">現在のプレイヤー:</span>
                    <span className="sticky-header-player">
                      {gameState.players.find(p => p.id === gameState.activePlayerId)?.name || 'プレイヤー'}
                    </span>
                    <span className="sticky-header-time">
                      {formatTime(gameState.players.find(p => p.id === gameState.activePlayerId)?.elapsedTimeSeconds || 0)}
                    </span>
                  </>
                ) : (
                  <span className="sticky-header-status">ゲーム未開始</span>
                )
              ) : (
                // 通常モード: Phase 2サーバー状態
                serverGameState.serverState && serverGameState.serverState.activePlayerIndex !== -1 ? (
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
                )
              )}
            </div>
            {/* Task 5.1-5.2: ゲーム全体のプレイ時間表示 */}
            <div className="total-game-time" data-testid="total-game-time">
              <span className="total-game-time-label">ゲーム全体:</span>
              <span
                className={`total-game-time-value ${
                  (() => {
                    // Task 5.6: 両モードでtotalGameTime stateを使用
                    const totalSeconds = totalGameTime;

                    // Task 5.2: 時間の長さに応じて色を変更
                    // 1時間未満（<3600秒）: normal（緑系）
                    // 1-2時間（3600-7200秒）: warning（オレンジ系）
                    // 2時間以上（>7200秒）: danger（赤系）
                    if (totalSeconds < 3600) return 'normal';
                    if (totalSeconds < 7200) return 'warning';
                    return 'danger';
                  })()
                }`}
              >
                {/* Task 5.6: 両モードでtotalGameTime stateを使用してフォーマット */}
                {isInFallbackMode
                  ? fallbackState.formatGameTime(totalGameTime)
                  : serverGameState.formatGameTime(totalGameTime)
                }
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
            {(import.meta.env.MODE === 'test' || isInFallbackMode) ? (
              // フォールバックモード: Phase 1ローカル状態
              gameState && gameState.players.map((player) => {
                const isTimedOut = player.id === timedOutPlayerId;
                const isDisabled = fallbackState.isPlayerControlDisabled(player.id);
                return (
                  <li key={player.id} className={`player-card ${player.isActive ? 'active' : ''} ${isTimedOut ? 'timeout' : ''}`}>
                    <div className="player-info">
                      {/* プレイヤー名は表示のみ。変更は設定カードの「プレイヤー名変更」から行う */}
                      <span className="player-name">{player.name}</span>
                    </div>
                    <div className="player-time">経過時間: {formatTime(player.elapsedTimeSeconds)}</div>
                    {player.isActive && player.turnStartedAt && (
                      <div className="turn-time" data-testid="turn-time">
                        現在のターン: {formatTime(fallbackState.getCurrentTurnTime())}
                      </div>
                    )}
                    <div className="player-actions">
                      <button
                        onClick={() => fallbackState.updatePlayerTime(player.id, player.elapsedTimeSeconds + 10)}
                        disabled={isDisabled}
                      >
                        +10秒
                      </button>
                      <button
                        onClick={() => fallbackState.setActivePlayer(player.id)}
                        disabled={isDisabled || isCatanMode}
                      >
                        アクティブに設定
                      </button>
                    </div>
                  </li>
                );
              })
            ) : (
              // 通常モード: Phase 2サーバー状態
              (serverGameState.serverState?.players || []).map((player, index) => {
                const isActive = index === (serverGameState.serverState?.activePlayerIndex ?? -1);
                return (
                  <li
                    key={index}
                    className={`player-card ${isActive ? 'active' : 'clickable'}`}
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
              })
            )}
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
                  value={isInFallbackMode ? (gameState?.players.length || 4) : (serverGameState.serverState?.players.length || 4)}
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
                  {/* 全入力欄で共有する履歴候補（人数分の重複生成を避ける） */}
                  <datalist id={PLAYER_NAME_HISTORY_LIST_ID}>
                    {playerNameHistory.names.map((name, historyIndex) => (
                      <option key={historyIndex} value={name} />
                    ))}
                  </datalist>
                  {/* 入力中はドラフトに保持し、「保存」押下で初めて反映（フォールバック/通常モード共通） */}
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
                        checked={isInFallbackMode ? (gameState?.timerMode === 'countdown') : (serverGameState.serverState?.timerMode === 'countdown')}
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
                  {(isInFallbackMode ? (gameState?.timerMode === 'countdown') : (serverGameState.serverState?.timerMode === 'countdown')) && (
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