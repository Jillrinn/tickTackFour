# 実装計画

## Phase 1: E2Eテスト環境の構築

- [x] 1. E2Eテスト実行環境の基盤を整備する
- [x] 1.1 Playwrightのインストールと基本設定を完了する
  - Playwrightパッケージとブラウザドライバをインストール
  - playwright.config.ts を作成し、ベースURL、タイムアウト、リトライ戦略を設定
  - Chrome、Firefox、Safariの3ブラウザ設定を追加
  - package.json にE2Eテスト実行スクリプトを追加（test:e2e、test:e2e:ui、test:e2e:headed、test:e2e:debug）
  - トレース記録とスクリーンショット設定を有効化
  - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 1.2 E2Eテストディレクトリ構造を作成する
  - プロジェクトルートに `e2e/` ディレクトリを作成
  - サブディレクトリを作成（specs/, pages/, fixtures/, helpers/）
  - E2Eテスト専用のTypeScript設定ファイル（e2e/tsconfig.json）を作成
  - .gitignore にPlaywrightの成果物ディレクトリを追加（playwright-report/, test-results/）
  - _Requirements: 1.7, 7.7_

- [x] 1.3 基本テストとレポート機能を検証する
  - シンプルな動作確認テストを作成してPlaywright実行を確認
  - HTMLレポート生成機能を検証
  - 失敗時のスクリーンショットとトレース記録機能を確認
  - 3ブラウザでのテスト実行を検証
  - _Requirements: 1.4, 1.5, 8.1, 8.2_

## Phase 2: Page Objectモデル基盤の実装

- [x] 2. 再利用可能なPage Objectモデル基盤を構築する
- [x] 2.1 ゲームタイマーページオブジェクトを実装する
  - GameTimerPageクラスを作成し、ページ全体の操作を提供
  - ページナビゲーションメソッド（navigate, verifyPageLoaded）を実装
  - プレイヤー数操作メソッド（setPlayerCount, getPlayerCount）を実装
  - コンポーネントページオブジェクトへの参照を準備
  - 基本ロケーター定義（gameTimer, gameHeader, playersSection, controlsSection）を作成
  - _Requirements: 9.1, 9.2_

- [x] 2.2 コンポーネントページオブジェクトを実装する
  - PlayerCardクラスを作成（プレイヤーカード操作・状態取得メソッド）
  - GameControlsクラスを作成（ゲーム制御ボタン操作メソッド）
  - GameStatusクラスを作成（ゲーム状態情報取得メソッド）
  - data-testid属性を優先したロケーター定義を実装
  - 各コンポーネントの状態確認メソッド（isActive, isTimedOut, isButtonDisabled等）を実装
  - _Requirements: 9.1, 9.5_

- [x] 2.3 テストヘルパーとフィクスチャを実装する
  - assertionsヘルパーを作成（assertPlayerCount, assertTimerMode, assertTimeInRange等）
  - waitingヘルパーを作成（waitForTimerProgress, waitForPlayerCountChange等）
  - gameStateフィクスチャを作成（default, countdownMode, withActivePlayer等のテストデータ）
  - navigationヘルパーを作成（共通ナビゲーション処理）
  - _Requirements: 9.2, 9.3, 9.4_

## Phase 3: 基本機能テストの実装

- [x] 3. プレイヤー管理とタイマー動作のテストを実装する
- [x] 3.1 プレイヤー管理機能のテストを実装する
  - player-management.spec.ts を作成
  - デフォルトプレイヤー数（4人）の初期表示を検証
  - プレイヤー数変更操作（4人→5人→6人→4人）を検証
  - プレイヤーカード表示内容（名前、ID、経過時間）を検証
  - プレイヤー数変更時の状態リセット（経過時間0秒、アクティブプレイヤーnull）を検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3.2 タイマー動作機能のテストを実装する
  - timer-operations.spec.ts を作成
  - カウントアップモードでのタイマー進行（1秒待機→1秒増加）を検証
  - カウントダウンモードでのタイマー減少（600秒設定→1秒待機→599秒）を検証
  - タイムアウト検出（残り時間0秒でtimeoutクラス付与）を検証
  - カウントダウン秒数カスタマイズ（300秒設定→反映確認）を検証
  - 経過時間フォーマット（MM:SS形式）を検証
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

## Phase 4: 高度な機能テストの実装

- [ ] 4. プレイヤー操作、ゲーム制御、レスポンシブUIのテストを実装する
- [x] 4.1 プレイヤー操作機能のテストを実装する
  - active-player.spec.ts を作成
  - アクティブプレイヤー設定（ボタンクリック→activeクラス付与）を検証
  - 次のプレイヤーへ切り替え（順序通り切り替え→最後から最初への循環）を検証
  - +10秒ボタン機能（クリック→経過時間+10秒）を検証
  - アクティブ解除機能（アクティブプレイヤーをnullに設定）を検証
  - タイムアウト時のボタン無効化（残り時間0秒→ボタンdisabled）を検証
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 4.2 ゲーム制御機能のテストを実装する
  - game-controls.spec.ts を作成
  - 一時停止/再開機能（一時停止→タイマー停止→再開→タイマー再開）を検証
  - 一時停止中のタイマー停止を検証
  - リセット機能（全プレイヤー経過時間0秒、アクティブプレイヤーnull、一時停止false、タイマーモードcount-up）を検証
  - ボタンテキスト変更（一時停止⇔再開）を検証
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 4.3 レスポンシブUI機能のテストを実装する
  - responsive-ui.spec.ts を作成
  - 375px幅での単列レイアウトを検証
  - 768px幅での2列グリッドレイアウトを検証
  - 1024px幅での3列グリッドレイアウトを検証
  - 1440px幅での4列グリッドレイアウトを検証
  - 全画面サイズでのフォントサイズ最小値（14px）を検証
  - 全画面サイズでのボタンサイズ最小値（44×44px）を検証
  - ビューポート変更時のレイアウト再配置を検証
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

## Phase 5: 将来対応とCI/CD統合

- [ ] 5. Phase 2への拡張準備とCI/CDパイプライン統合を完了する
- [ ] 5.1 Phase 2専用テストの雛形を実装する
  - persistence.spec.ts を作成（DB永続化検証テスト雛形）
  - realtime-sync.spec.ts を作成（SignalRリアルタイム同期テスト雛形）
  - test.skip(process.env.PHASE !== '2') による実行制御を実装
  - 複数ブラウザコンテキスト使用パターンを実装（リアルタイム同期検証用）
  - リロード後の状態復元検証パターンを実装（永続化検証用）
  - 環境変数（PHASE=1|2）での切り替え動作を確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 5.2 CI/CDパイプライン統合を実装する
  - .github/workflows/e2e-tests.yml を作成
  - プルリクエスト作成時の自動テスト実行を設定
  - 開発サーバーの自動起動と待機処理を設定
  - テスト成果物（HTMLレポート、スクリーンショット、トレース）のアップロードを設定
  - Phase 2用ワークフロー雛形をコメントアウトで配置
  - テスト失敗時のデプロイ停止とプルリクエストコメント機能を設定
  - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [ ] 5.3 E2Eテスト統合と最終検証を実施する
  - 全テストスイートの統合実行を確認（ローカル環境）
  - 主要ユーザーフロー100%カバレッジを検証
  - CI環境での自動テスト実行を確認
  - テストレポート・Trace Viewer機能を検証
  - README.md にE2Eテスト実行方法を追加
  - package.json にE2Eテスト関連スクリプトを整理
  - _Requirements: 8.7, 9.6, 9.7_

## 注意事項

### TDD実装プロセス（必須）
各タスクの実装時は以下のTDDプロセスに従うこと：
1. **RED phase**: 実装前にテストケースを作成
2. **GREEN phase**: 最小限の実装でテストをパス
3. **REFACTOR phase**: 必要に応じてリファクタリング
4. `npm run test:e2e` で全テストが成功することを確認

### Chrome DevTools検証プロセス（必須）
実装完了後、以下の手順で実機検証を実施：
1. `npm run dev` で開発サーバー起動
2. `mcp__chrome-devtools__navigate_page` でアプリケーションにアクセス
3. `mcp__chrome-devtools__take_snapshot` で初期状態確認
4. 実装した機能の操作（`click`, `fill`, `evaluate_script`等）
5. 各操作後に`take_snapshot`で状態変化を確認
6. タイマー動作は`Bash(sleep N)`後にスナップショットで時間経過を確認

### タスク完了とコミットプロセス（必須）
検証完了後、以下を必ず実施：
1. `tasks.md` の該当タスクをチェック済み`[x]`に変更
2. 詳細なコミットメッセージでGitコミット作成
3. 即座にコミット（複数タスクをまとめない）

### 要件トレーサビリティ
- **要件1（E2Eテストインフラ）**: Task 1.1, 1.2, 1.3
- **要件2（プレイヤー管理）**: Task 3.1
- **要件3（タイマー動作）**: Task 3.2
- **要件4（プレイヤー操作）**: Task 4.1
- **要件5（ゲーム制御）**: Task 4.2
- **要件6（レスポンシブUI）**: Task 4.3
- **要件7（バックエンド統合）**: Task 5.1
- **要件8（CI/CD統合）**: Task 5.2, 5.3
- **要件9（ベストプラクティス）**: Task 2.1, 2.2, 2.3, 5.3
