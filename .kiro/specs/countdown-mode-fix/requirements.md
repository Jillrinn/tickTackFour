# 要件定義書

## はじめに

タイマーアプリケーションのカウントダウンモード機能に不具合が発見されました。本仕様は、カウントダウンモード選択時にプレイヤーのタイマーが正しくカウントダウンする機能を実現するための要件を定義します。

**ビジネス価値**: カウントダウンモードは、各プレイヤーに時間制限を設けるゲームモードとして不可欠な機能です。この機能が正しく動作しないと、ゲームの公平性が損なわれ、ユーザー体験が著しく低下します。

## 要件

### Requirement 1: ゲーム未開始時のタイマーモード初期化
**目的**: ゲーム管理者として、ゲーム開始前にカウントダウンモードを選択し、各プレイヤーの初期時間を設定したい。これにより、全プレイヤーが同じ時間制限でゲームを開始できる。

#### 受入基準

1. WHEN ユーザーがタイマーモードトグルをカウントダウンモードに切り替え（チェックボックスON）THEN GameTimerコンポーネント SHALL `timerMode`を`'countdown'`に設定する

2. WHEN ユーザーがカウントダウン秒数を入力（例: 600秒）THEN GameTimerコンポーネント SHALL `countdownSeconds`状態を更新する

3. WHEN カウントダウンモード AND カウントダウン秒数が設定された状態でゲームを開始 THEN GameTimerコンポーネント SHALL 全プレイヤーの`elapsedTimeSeconds`をカウントダウン秒数で初期化する

4. WHERE フォールバックモード（APIサーバー未接続）THEN GameTimerコンポーネント SHALL `useGameState` hookの`setTimerMode`関数を使用してローカル状態を更新する

5. WHERE 通常モード（APIサーバー接続中）THEN GameTimerコンポーネント SHALL POST /api/updateGame APIを呼び出してサーバー状態を更新する

### Requirement 2: カウントダウンタイマーの動作
**目的**: プレイヤーとして、自分のターン中にカウントダウンタイマーが1秒ごとに減少することを確認したい。これにより、残り時間を正確に把握できる。

#### 受入基準

1. WHEN ゲームがカウントダウンモード AND プレイヤーがアクティブ AND ゲームが一時停止されていない THEN GameTimerコンポーネント SHALL 1秒ごとにアクティブプレイヤーの`elapsedTimeSeconds`を1減少させる

2. WHEN アクティブプレイヤーの`elapsedTimeSeconds`が0より大きい THEN GameTimerコンポーネント SHALL タイマーの減少を継続する

3. WHEN ゲームが一時停止された THEN GameTimerコンポーネント SHALL タイマーの減少を停止する

4. WHEN ゲームが再開された THEN GameTimerコンポーネント SHALL タイマーの減少を再開する

5. WHERE フォールバックモード THEN GameTimerコンポーネント SHALL `useGameState` hookのタイマーロジック（useEffect）を使用してカウントダウンを実行する

6. WHERE 通常モード THEN GameTimerコンポーネント SHALL バックエンドAPI（GET /api/game）からポーリング同期された状態を使用してUIを更新する

### Requirement 3: タイマー表示
**目的**: プレイヤーとして、カウントダウンタイマーの残り時間をMM:SS形式で視覚的に確認したい。これにより、直感的に残り時間を把握できる。

#### 受入基準

1. WHEN プレイヤーの`elapsedTimeSeconds`が600秒 THEN PlayerListコンポーネント SHALL "10:00"と表示する

2. WHEN プレイヤーの`elapsedTimeSeconds`が599秒 THEN PlayerListコンポーネント SHALL "09:59"と表示する

3. WHEN プレイヤーの`elapsedTimeSeconds`が0秒 THEN PlayerListコンポーネント SHALL "00:00"と表示する

4. WHEN プレイヤーの`elapsedTimeSeconds`が負の値（異常状態） THEN PlayerListコンポーネント SHALL "00:00"と表示する（防御的プログラミング）

### Requirement 4: 0秒到達時の動作
**目的**: ゲーム管理者として、プレイヤーの時間が0秒に達した時にタイマーが自動的に停止することを期待する。これにより、時間切れのプレイヤーを明確に識別できる。

#### 受入基準

1. WHEN アクティブプレイヤーの`elapsedTimeSeconds`が0秒に達した THEN GameTimerコンポーネント SHALL タイマーを停止する

2. WHEN アクティブプレイヤーの`elapsedTimeSeconds`が0秒に達した THEN GameTimerコンポーネント SHALL アクティブプレイヤーを解除（`activePlayerId`を`null`に設定）する

3. WHEN アクティブプレイヤーの`elapsedTimeSeconds`が0秒に達した THEN GameTimerコンポーネント SHALL 該当プレイヤーの`isActive`フラグを`false`に設定する

4. WHERE フォールバックモード AND タイマーが0秒に達した THEN GameTimerコンポーネント SHALL `useGameState` hookのタイマーロジックで自動停止を実行する

5. WHERE 通常モード AND タイマーが0秒に達した THEN バックエンドAPI SHALL タイマーを停止し、次回のポーリング同期で全クライアントに反映する

### Requirement 5: フォールバックモードとAPIモードの互換性
**目的**: 開発者として、フォールバックモード（ローカル状態管理）とAPIモード（サーバー同期）の両方で同じカウントダウン動作を実現したい。これにより、ネットワーク状態に関わらず一貫したユーザー体験を提供できる。

#### 受入基準

1. WHEN フォールバックモード AND カウントダウンモード選択 THEN GameTimerコンポーネント SHALL `useGameState` hookの`setTimerMode`関数を呼び出す

2. WHEN 通常モード AND カウントダウンモード選択 THEN GameTimerコンポーネント SHALL POST /api/updateGame APIを呼び出し、成功後に`useServerGameState`状態を更新する

3. WHEN フォールバックモード AND ゲーム開始 THEN GameTimerコンポーネント SHALL ローカル状態（`useGameState`）を使用してタイマーを制御する

4. WHEN 通常モード AND ゲーム開始 THEN GameTimerコンポーネント SHALL ポーリング同期（GET /api/game）で取得したサーバー状態を使用してUIを更新する

5. WHERE フォールバックモード THEN GameTimerコンポーネント SHALL `isInFallbackMode`フラグが正しく評価され、フォールバック分岐が実行される

6. WHERE APIサーバーが3回連続で応答失敗 THEN GameTimerコンポーネント SHALL 自動的にフォールバックモードに切り替える（`usePollingSync`のエラーハンドリング）

### Requirement 6: タイマーモード切り替えの制御
**目的**: ゲーム管理者として、ゲーム開始後にタイマーモードを変更できないようにしたい。これにより、ゲーム中のルール変更による混乱を防ぐ。

#### 受入基準

1. WHEN ゲームが未開始（全プレイヤーが非アクティブ） THEN GameTimerコンポーネント SHALL タイマーモードトグルを有効にする

2. WHEN ゲームが開始済み（少なくとも1プレイヤーの`elapsedTimeSeconds` > 0） THEN GameTimerコンポーネント SHALL タイマーモードトグルを無効にする

3. WHEN ゲームがリセットされた THEN GameTimerコンポーネント SHALL タイマーモードトグルを再度有効にする

4. WHERE フォールバックモード AND タイマーモード変更試行 THEN GameTimerコンポーネント SHALL ETagチェックをスキップし、即座にローカル状態を更新する

5. WHERE 通常モード AND ETagが利用不可 THEN GameTimerコンポーネント SHALL コンソールに警告メッセージ"ETag not available, cannot change timer mode"を出力し、API呼び出しをスキップする

### Requirement 7: エラーハンドリングとフィードバック
**目的**: ユーザーとして、タイマーモード変更やゲーム操作が失敗した場合に明確なフィードバックを受け取りたい。これにより、問題を迅速に認識し対処できる。

#### 受入基準

1. WHEN 通常モード AND POST /api/updateGame APIが400エラーを返す THEN GameTimerコンポーネント SHALL エラーメッセージをコンソールに出力する

2. WHEN 通常モード AND POST /api/updateGame APIが409競合エラーを返す THEN GameTimerコンポーネント SHALL 競合メッセージを画面に表示し、ユーザーに状態更新を促す

3. WHEN 通常モード AND GET /api/game APIが3回連続で失敗 THEN GameTimerコンポーネント SHALL フォールバックモードに自動切り替えし、ユーザーに通知する

4. WHEN フォールバックモード AND タイマーモード変更試行 AND ETagが存在しない THEN GameTimerコンポーネント SHALL コンソール警告を出さずに正常にローカル状態を更新する

### Requirement 8: UIの視覚的フィードバック
**目的**: ユーザーとして、カウントダウンモード選択時に関連する設定UIが表示され、直感的に操作できるようにしたい。

#### 受入基準

1. WHEN タイマーモードが`'countdown'`に設定された THEN GameTimerコンポーネント SHALL カウントダウン秒数入力フィールドを表示する

2. WHEN タイマーモードが`'countup'`に設定された THEN GameTimerコンポーネント SHALL カウントダウン秒数入力フィールドを非表示にする

3. WHEN ゲームが開始済み THEN GameTimerコンポーネント SHALL タイマーモードトグルを視覚的に無効化（グレーアウト）する

4. WHEN アクティブプレイヤーのタイマーが0秒に達した THEN PlayerListコンポーネント SHALL 該当プレイヤーカードに視覚的なインジケーター（例: 色の変化、アイコン）を表示する
