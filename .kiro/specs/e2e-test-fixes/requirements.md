# Requirements Document

## Introduction
このドキュメントは、E2Eテストスイートの包括的な修正に関する要件を定義します。2025年10月8日に完了した`ui-controls-enhancement`仕様によるUI刷新により、57件のE2Eテストが失敗している状況を解消します。

### ビジネス価値
- **品質保証の回復**: UI刷新後の機能品質をE2Eテストで自動検証可能にする
- **開発速度の向上**: 修正されたE2Eテストにより、リグレッション検出を自動化し、安心して機能開発を継続できる
- **保守性の向上**: 新しいUI構造に対応したPage Object Modelにより、将来的なUI変更にも柔軟に対応可能になる

### 現状の課題
現在のE2Eテストは旧UI（Phase 1: フォールバックモード）を前提に作成されており、新UI（Phase 2: 通常モード）には対応していません。テストはブラウザで実行されるため通常モードのUIで動作しますが、テストコードはフォールバックモードのUI要素（プレイヤーカード内のボタン、プレイヤー名編集用`<input>`等）を期待しています。

### 実装モード
プロジェクトは以下の2つのモードで動作します：

1. **フォールバックモード（Phase 1）**:
   - 条件: `import.meta.env.MODE === 'test'` または API接続失敗
   - UI: プレイヤーカード内にボタンあり、プレイヤー名編集可能（`<input>`）
   - 状態管理: useGameState (ローカル)

2. **通常モード（Phase 2）**:
   - 条件: API接続成功（ブラウザでの通常実行）
   - UI: 固定ヘッダーに「次のプレイヤーへ→」ボタン、プレイヤー名表示のみ（`<span>`）
   - 状態管理: useServerGameState (ポーリング同期)

E2Eテストはブラウザで実行されるため、**通常モード**のUI要素を対象にテストを修正する必要があります。

### スコープ
この仕様では**E2Eテストの修正のみ**を対象とし、プレイヤー名編集機能のバグ修正は含みません。バグ修正は別の仕様で対応します。

---

## Requirements

### Requirement 1: Page Object Modelの更新（通常モード対応）
**Objective:** As a テスト開発者, I want Page Object Modelを通常モードの新UIに対応させる, so that E2Eテストが新しいUI要素を正しく操作できる

#### Acceptance Criteria

1. WHEN GameTimerPage.tsのsetPlayerActive()メソッドを呼び出す THEN GameTimerPage SHALL 「次のプレイヤーへ→」ボタンを使用してプレイヤーを順次切り替える
2. WHEN GameTimerPage.tsのchangePlayerCount()メソッドを呼び出す THEN GameTimerPage SHALL ドロップダウン（`<select>`要素）を操作してプレイヤー数を変更する
3. WHEN GameTimerPage.tsのchangeTimerMode()メソッドを呼び出す THEN GameTimerPage SHALL トグルスイッチ（`<input type="checkbox">`）を操作してタイマーモードを変更する
4. WHEN GameTimerPage.tsのswitchToNextPlayer()メソッドを呼び出す THEN GameTimerPage SHALL 固定ヘッダー内の「次のプレイヤーへ→」ボタンをクリックする

### Requirement 2: アクティブプレイヤー操作テストの修正
**Objective:** As a テスト開発者, I want アクティブプレイヤー操作テストを通常モードに対応させる, so that プレイヤー切り替え機能が正しく動作することを検証できる

#### Acceptance Criteria

1. WHEN active-player.spec.tsのテストを実行 THEN テストスイート SHALL 固定ヘッダーの「次のプレイヤーへ→」ボタンを使用してプレイヤーを切り替える
2. WHEN プレイヤーをアクティブに設定するテストを実行 THEN テストスイート SHALL switchToNextPlayer()メソッドを使用して順次プレイヤーを切り替える
3. WHEN アクティブプレイヤーの時間計測テストを実行 THEN テストスイート SHALL アクティブプレイヤーの時間が増加することを検証する
4. WHEN 非アクティブプレイヤーの時間停止テストを実行 THEN テストスイート SHALL 非アクティブプレイヤーの時間が停止することを検証する
5. WHEN 全7件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 3: ゲームコントロールテストの修正
**Objective:** As a テスト開発者, I want ゲームコントロールテストを通常モードに対応させる, so that 一時停止・再開・リセット機能が正しく動作することを検証できる

#### Acceptance Criteria

1. WHEN game-controls.spec.tsのテストを実行 THEN テストスイート SHALL switchToNextPlayer()メソッドを使用してプレイヤーを切り替える
2. WHEN 一時停止・再開テストを実行 THEN テストスイート SHALL 一時停止ボタンで時間が停止し、再開ボタンで時間が再開することを検証する
3. WHEN リセットテストを実行 THEN テストスイート SHALL リセットボタンで全プレイヤーの時間と状態が初期化されることを検証する
4. WHEN 全6件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 4: プレイヤー数管理テストの修正
**Objective:** As a テスト開発者, I want プレイヤー数管理テストをドロップダウン操作に対応させる, so that プレイヤー数変更機能が正しく動作することを検証できる

#### Acceptance Criteria

1. WHEN player-management.spec.tsのテストを実行 THEN テストスイート SHALL ドロップダウン（`<select>`要素）を使用してプレイヤー数を変更する
2. WHEN プレイヤー数を4人から5人に変更するテストを実行 THEN テストスイート SHALL changePlayerCount(5)メソッドで5人に変更されることを検証する
3. WHEN プレイヤー数を5人から6人に変更するテストを実行 THEN テストスイート SHALL changePlayerCount(6)メソッドで6人に変更されることを検証する
4. WHEN プレイヤー数を6人から4人に変更するテストを実行 THEN テストスイート SHALL changePlayerCount(4)メソッドで4人に変更されることを検証する
5. WHEN 全8件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 5: タイマーモード変更テストの修正
**Objective:** As a テスト開発者, I want タイマーモード変更テストをトグルスイッチ操作に対応させる, so that タイマーモード切り替え機能が正しく動作することを検証できる

#### Acceptance Criteria

1. WHEN timer-operations.spec.tsのテストを実行 THEN テストスイート SHALL トグルスイッチ（`<input type="checkbox">`）を使用してタイマーモードを変更する
2. WHEN カウントアップからカウントダウンに変更するテストを実行 THEN テストスイート SHALL changeTimerMode('カウントダウン')メソッドでトグルを操作して変更を検証する
3. WHEN カウントダウンからカウントアップに変更するテストを実行 THEN テストスイート SHALL changeTimerMode('カウントアップ')メソッドでトグルを操作して変更を検証する
4. WHEN 全6件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 6: プレイヤー名編集テストのスキップ対応
**Objective:** As a テスト開発者, I want プレイヤー名編集テストをフォールバックモード専用としてスキップする, so that 通常モード（プレイヤー名読み取り専用）でテストが失敗しないようにする

#### Acceptance Criteria

1. WHEN player-management.spec.tsまたは関連テストでプレイヤー名編集テストを実行 THEN テストスイート SHALL 通常モードではテストをスキップする
2. WHEN プレイヤー名編集テストに`.skip()`または条件付きスキップを追加 THEN テストスイート SHALL フォールバックモード専用テストとして分離する
3. WHEN 全7件のプレイヤー名編集テストを実行 THEN テストスイート SHALL 通常モードでは全てスキップされる

### Requirement 7: ターン時間トラッキングテストの修正
**Objective:** As a テスト開発者, I want ターン時間トラッキングテストのタイミング戦略を見直す, so that ボタン押下タイミングと状態同期の問題を解決できる

#### Acceptance Criteria

1. WHEN turn-time-tracking.spec.tsのテストを実行 THEN テストスイート SHALL ボタンクリック後に適切な待機時間（wait/polling）を設定する
2. WHEN ターン切り替え後の時間検証テストを実行 THEN テストスイート SHALL ポーリング同期を考慮して状態が更新されるまで待機する
3. WHEN ターン時間リセットテストを実行 THEN テストスイート SHALL リセット操作後に状態が初期化されるまで待機する
4. WHEN 全10件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 8: UIコントロール強化テストの修正
**Objective:** As a テスト開発者, I want UIコントロール強化テストをPage Objectメソッドの更新に対応させる, so that 新UI要素（ドロップダウン、トグル）を正しく操作できる

#### Acceptance Criteria

1. WHEN ui-controls-enhancement.spec.tsのテストを実行 THEN テストスイート SHALL 更新されたPage Objectメソッドを使用する
2. WHEN ドロップダウン操作テストを実行 THEN テストスイート SHALL changePlayerCount()メソッドでドロップダウンを操作して検証する
3. WHEN トグルスイッチ操作テストを実行 THEN テストスイート SHALL changeTimerMode()メソッドでトグルを操作して検証する
4. WHEN 固定ヘッダー操作テストを実行 THEN テストスイート SHALL 固定ヘッダー内のボタンとUI要素を正しく操作して検証する
5. WHEN 全11件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 9: レスポンシブUIテストの修正
**Objective:** As a テスト開発者, I want レスポンシブUIテストを新UI構造に対応させる, so that 新しい要素配置とスタイルで正しく動作することを検証できる

#### Acceptance Criteria

1. WHEN responsive-ui.spec.tsのテストを実行 THEN テストスイート SHALL 新しいUI構造（固定ヘッダー、セクション分割）に対応した要素検証を実施する
2. WHEN モバイルビューポートテストを実行 THEN テストスイート SHALL 固定ヘッダーと主要操作セクションが正しく表示されることを検証する
3. WHEN 全2件のテストを実行 THEN テストスイート SHALL 全てのテストが成功する

### Requirement 10: E2Eテスト実行と結果検証
**Objective:** As a プロジェクトチーム, I want 修正後のE2Eテスト全体を実行して結果を検証する, so that UI刷新後の機能品質が保証される

#### Acceptance Criteria

1. WHEN 全E2Eテストスイートを実行（`npx playwright test`） THEN テスト実行 SHALL 50件の失敗テストが全て成功する（57件 - 7件スキップ = 50件）
2. WHEN 全E2Eテストスイートを実行 THEN テスト実行 SHALL 既存の18件の成功テストが引き続き成功する
3. WHEN 全E2Eテストスイートを実行 THEN テスト実行 SHALL Phase 2専用テスト（11 skipped）とプレイヤー名編集テスト（7 skipped）が引き続きスキップされる
4. WHEN 全E2Eテストスイートを実行 THEN テスト実行 SHALL 合計68件のテスト（50修正成功 + 18既存成功）が全て成功する
5. WHEN E2Eテスト結果を確認 THEN テスト結果レポート SHALL 成功したテスト数、スキップされたテスト数、失敗したテスト数を明示的に表示する
6. WHEN E2Eテスト結果を確認 THEN テスト結果レポート SHALL 失敗テストが0件であることを示す
7. WHEN E2Eテスト結果をGitコミットメッセージに記録 THEN コミットメッセージ SHALL テスト成功数とスキップ数を含める
