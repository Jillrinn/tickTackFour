# Requirements Document

## Introduction

タイマーモード変更機能が正常に動作していない問題を修正します。APIモードにおいて、ゲーム開始後にタイマーモード（カウントアップ/カウントダウン）を変更できる状態になっていますが、これは公平性の観点から禁止すべきです。本機能では、以下を実現します：

1. **ゲーム未開始時**: タイマーモード変更を許可
2. **ゲーム開始後**: タイマーモード変更を完全に禁止（一時停止中でも禁止）
3. **リセット後**: タイマーモード変更を再度許可

この修正により、ゲームの公平性を保ちつつ、ユーザーが初期設定を柔軟に調整できるようになります。

## Requirements

### Requirement 1: ゲーム未開始時のタイマーモード変更許可
**Objective:** ゲーム管理者として、ゲーム開始前にタイマーモードを自由に変更できることを望む、それによりゲームルールに合わせた設定が可能になる

#### Acceptance Criteria

1. WHERE ゲームが未開始状態（activePlayerIndex = -1 かつ 全プレイヤーの経過時間が0秒）THEN GameTimer SHALL タイマーモードトグルスイッチを有効化する
2. WHEN ユーザーがタイマーモードトグルスイッチをクリックする THEN GameTimer SHALL カウントアップ/カウントダウンの切り替えを許可する
3. IF APIモードで動作している THEN GameTimer SHALL updateGame APIを呼び出してバックエンド状態を更新する
4. WHEN タイマーモード変更が成功する THEN GameTimer SHALL 新しいETagを保存し、サーバー状態を即座に同期する
5. WHERE タイマーモード変更後 THE GameTimer SHALL 全プレイヤーの経過時間を00:00のままに保つ

### Requirement 2: ゲーム開始後のタイマーモード変更禁止
**Objective:** ゲームプレイヤーとして、ゲーム開始後にタイマーモードが変更されないことを望む、それによりゲームの公平性が保たれる

#### Acceptance Criteria

1. WHERE ゲームが一度でも開始された後（activePlayerIndex ≠ -1 または いずれかのプレイヤーの経過時間 > 0）THEN GameTimer SHALL タイマーモードトグルスイッチを無効化する
2. WHILE ゲームが一時停止中 THE GameTimer SHALL タイマーモードトグルスイッチを無効化状態に保つ
3. WHEN ユーザーが無効化されたトグルスイッチにマウスオーバーする THEN GameTimer SHALL ツールチップで「ゲームをリセットしてからモードを変更してください」と表示する
4. WHERE ゲーム進行中 THE GameTimer SHALL リセットボタンを押すまでタイマーモード変更を許可しない

### Requirement 3: リセット後の初期状態復帰とタイマーモード有効化
**Objective:** ゲーム管理者として、リセット後にタイマーモードを再設定できることを望む、それにより新しいゲームの準備ができる

#### Acceptance Criteria

1. WHEN ユーザーがリセットボタンを押す THEN GameTimer SHALL ゲーム状態を初期化する（activePlayerIndex = -1, 全プレイヤーの経過時間 = 0, isPaused = true）
2. WHERE リセット直後 THE GameTimer SHALL タイマーモードトグルスイッチを有効化する（disabled = false）
3. IF APIモードで動作している THEN GameTimer SHALL リセットAPI呼び出し後に即座にサーバー状態を取得する
4. WHERE リセット後の初期状態 THE GameTimer SHALL 「ゲームを開始する」ボタンを表示する
5. WHEN リセット完了後 THEN GameTimer SHALL タイマーモードを変更可能にする

### Requirement 4: タイマーモード変更の基本動作
**Objective:** ユーザーとして、タイマーモード変更が確実に反映されることを望む、それにより意図したゲーム設定で開始できる

#### Acceptance Criteria

1. WHEN ユーザーがタイマーモードトグルスイッチをクリックする THEN GameTimer SHALL カウントアップ/カウントダウンのモード切り替えを実行する
2. IF APIモードで動作している THEN GameTimer SHALL updateGame APIを呼び出してバックエンド状態を更新する
3. WHEN API呼び出しが成功する THEN GameTimer SHALL 新しいETagを保存し、サーバー状態を即座に同期する
4. WHEN タイマーモード変更が完了する THEN GameTimer SHALL UIに新しいタイマーモードを即座に反映する
5. IF エラーが発生する THEN GameTimer SHALL 適切なエラーメッセージをユーザーに表示する

### Requirement 5: カウントダウンモード時の秒数設定
**Objective:** ゲーム管理者として、カウントダウンモードでの制限時間を設定できることを望む、それにより時間制限付きゲームを実施できる

#### Acceptance Criteria

1. WHERE カウントダウンモードが選択されている THE GameTimer SHALL カウントダウン秒数入力フィールドを表示する
2. WHEN ユーザーがカウントダウン秒数を入力する THEN GameTimer SHALL 入力値をバリデーションする（1秒以上3600秒以下）
3. IF 入力値が範囲外 THEN GameTimer SHALL エラーメッセージを表示する
4. IF 入力値が有効 AND APIモードで動作している THEN GameTimer SHALL updateGame APIを呼び出してバックエンドに秒数を保存する
5. WHEN カウントダウン秒数が設定される THEN GameTimer SHALL 全プレイヤーの残り時間を設定秒数にリセットする
6. WHERE ゲーム開始後 THE GameTimer SHALL カウントダウン秒数入力フィールドも無効化する

### Requirement 6: ETag管理とAPI同期
**Objective:** システム管理者として、API呼び出しの競合を検出できることを望む、それにより複数デバイス間のデータ整合性が保たれる

#### Acceptance Criteria

1. WHERE APIモード（isInFallbackMode = false）で動作している THE GameTimer SHALL 全てのタイマーモード変更操作でETagを使用する
2. IF 現在のETagが存在しない THEN GameTimer SHALL 警告を表示しAPI呼び出しをスキップする
3. WHEN ETagが存在する THEN GameTimer SHALL updateGame(etag, params)を呼び出す
4. WHEN APIレスポンスを受信する THEN GameTimer SHALL 新しいETagを抽出しupdateEtag()で更新する
5. IF 競合が発生する（HTTP 412 Precondition Failed）THEN GameTimer SHALL エラーメッセージ「他のデバイスで変更されました。リロードしてください」を表示する
6. WHEN API呼び出しが成功する THEN GameTimer SHALL serverGameState.updateFromServer(result)で即座に同期する

### Requirement 7: フォールバックモードでの動作
**Objective:** 開発者として、フォールバックモードとテストモードでもタイマーモード変更が動作することを望む、それによりオフライン環境やテスト環境でも機能を使用できる

#### Acceptance Criteria

1. WHERE フォールバックモード（isInFallbackMode = true）で動作している THE GameTimer SHALL API呼び出しをスキップする
2. WHEN タイマーモード変更操作が実行される THEN GameTimer SHALL fallbackState.setTimerMode()を使用してローカル状態のみ更新する
3. WHERE テストモード（import.meta.env.MODE === 'test'）THE GameTimer SHALL フォールバックモードと同じ動作をする
4. WHEN タイマーモード変更が完了する THEN GameTimer SHALL UIに変更を即座に反映する

### Requirement 8: エラーハンドリング
**Objective:** ユーザーとして、タイマーモード変更中にエラーが発生した場合に適切な通知を受け取ることを望む、それにより問題を理解し対処できる

#### Acceptance Criteria

1. IF タイマーモード変更中にエラーが発生する THEN GameTimer SHALL エラーの種類を特定する（ネットワークエラー、競合エラー、バリデーションエラー等）
2. WHEN ネットワークエラーが発生する THEN GameTimer SHALL 「ネットワークに接続できません。再試行してください」と表示する
3. WHEN 競合エラーが発生する THEN GameTimer SHALL 「他のデバイスで変更されました。ページをリロードしてください」と表示する
4. WHEN バリデーションエラーが発生する THEN GameTimer SHALL 「カウントダウン秒数は1〜3600秒の範囲で入力してください」と表示する
5. WHERE エラーメッセージが表示される THE GameTimer SHALL 3秒間表示後、自動的にメッセージを消去する
6. IF 楽観的更新を使用している THEN GameTimer SHALL エラー発生時にUI状態を前の状態にロールバックする
7. WHEN エラーが発生する THEN GameTimer SHALL エラーログをコンソールに出力する
