# Requirements Document

## Introduction

現在のマルチプレイヤー・ゲームタイマーには、以下の2つの表示同期に関する問題が存在します：

### 問題1: 経過時間とターン時間の秒表示のズレ
画面上には複数のタイマー表示（プレイヤーカードの経過時間、ターン時間、全体プレイ時間等）が存在しますが、これらが独立して更新されているため、秒の切り替わりタイミングにズレが生じています。例えば、経過時間が「1:23」と表示されている瞬間に、ターン時間が「0:34」と表示されているべきところが「0:33」と表示されるなど、視覚的に不自然な状態が発生しています。

### 問題2: 一時停止・再開時のターン時間リセット
現在、ゲームを一時停止してから再開すると、現在のターンの経過時間がリセットされてしまいます。これにより、プレイヤーが実際に使用した時間が正確に計測できず、ゲームの公平性が損なわれています。

本機能では、これら2つの問題を解決することで、ユーザーにとって視覚的に統一され、正確な時間トラッキングを提供します。

## Requirements

### Requirement 1: タイマー表示の秒単位の完全同期

**Objective:** プレイヤーとして、画面上の全てのタイマー表示（経過時間、ターン時間、全体プレイ時間等）が同じ秒数で更新されることを望む、それにより時間の把握が正確で視覚的に統一される

#### Acceptance Criteria

1. WHEN タイマーが1秒経過したとき THEN GameTimer SHALL 全てのタイマー表示（プレイヤーカードの経過時間、ターン時間表示、全体プレイ時間表示、最長時間プレイヤー表示）を同じタイミングで更新する

2. WHERE プレイヤーカードの経過時間表示 THE GameTimer SHALL 秒の桁が変化するタイミングで他の全タイマー表示と完全に同期する

3. WHERE ターン時間表示 THE GameTimer SHALL 秒の桁が変化するタイミングで経過時間表示と完全に同期する

4. WHERE 全体プレイ時間表示 THE GameTimer SHALL 秒の桁が変化するタイミングで他の全タイマー表示と完全に同期する

5. WHERE 最長時間プレイヤー表示 THE GameTimer SHALL 秒の桁が変化するタイミングで他の全タイマー表示と完全に同期する

6. WHEN 任意のタイマー表示の秒数を確認したとき THEN GameTimer SHALL 他の全てのタイマー表示と同じ秒の桁を表示する

7. IF 複数のタイマー更新処理が並行実行されているとき THEN GameTimer SHALL 単一のタイマー更新イベントで全表示を一斉に更新する

### Requirement 2: ターン時間の継続性保証

**Objective:** プレイヤーとして、ゲームを一時停止して再開した後も、現在のターンで使用した時間が正確に継続して計測されることを望む、それによりゲームの公平性が保たれる

#### Acceptance Criteria

1. WHEN ゲームが一時停止される THEN GameTimer SHALL 現在のターンの経過時間を保持する

2. WHEN ゲームが再開される THEN GameTimer SHALL 一時停止前のターン時間から継続して計測を再開する

3. IF ゲームが一時停止された後に再開されたとき THEN GameTimer SHALL 一時停止中に経過した時間を除外してターン時間を計測する

4. WHERE ターン時間表示 THE GameTimer SHALL 一時停止・再開を経ても、ターン開始からの実経過時間（一時停止時間を除く）を正確に表示する

5. WHEN プレイヤーが複数回一時停止・再開を繰り返したとき THEN GameTimer SHALL 全ての一時停止時間を除外した正味のターン時間を計測する

6. IF アクティブプレイヤーが変更される THEN GameTimer SHALL 新しいアクティブプレイヤーのターン時間を0秒からリセットする（一時停止・再開によるリセットではない）

### Requirement 3: 一時停止中の時間除外メカニズム

**Objective:** 開発者として、一時停止中の時間を正確に除外するロジックを実装し、ターン時間の正確性を保証したい

#### Acceptance Criteria

1. WHEN ゲームが一時停止される THEN GameTimer SHALL 一時停止開始時刻を記録する

2. WHEN ゲームが再開される THEN GameTimer SHALL 一時停止終了時刻を記録する

3. WHEN ターン時間が計算される THEN GameTimer SHALL 現在時刻からターン開始時刻を引き、そこから全ての一時停止期間の合計を差し引いた値を返す

4. WHERE GameState型定義 THE GameTimer SHALL ターン開始時刻（turnStartedAt）と一時停止期間の累積時間（totalPausedDuration）を保持するフィールドを使用する

5. IF ゲームが複数回一時停止・再開される THEN GameTimer SHALL 各一時停止期間を累積して合計一時停止時間を計算する

6. WHEN アクティブプレイヤーが変更される THEN GameTimer SHALL 新しいプレイヤーの一時停止期間累積をゼロにリセットする

### Requirement 4: タイマー更新処理の一元化

**Objective:** 開発者として、単一のタイマー更新イベントで全てのタイマー表示を更新することで、同期問題を根本的に解決したい

#### Acceptance Criteria

1. WHEN GameTimerコンポーネントが初期化される THEN GameTimer SHALL 単一のsetIntervalインスタンスを作成する

2. WHERE タイマー更新処理 THE GameTimer SHALL 1秒間隔で単一のコールバック関数を実行する

3. WHEN タイマー更新コールバックが実行される THEN GameTimer SHALL 全てのタイマー関連の状態（経過時間、ターン時間、全体プレイ時間）を一度に更新する

4. IF 複数のタイマー表示が異なるuseEffectやsetIntervalで管理されているとき THEN GameTimer SHALL それらを統合して単一のタイマー更新処理にリファクタリングする

5. WHEN タイマーが停止される THEN GameTimer SHALL setIntervalインスタンスをクリアする

6. WHERE タイマー更新ロジック THE GameTimer SHALL useGameTimerフックまたは類似のカスタムフックに集約する

### Requirement 5: 既存機能との互換性保証

**Objective:** プレイヤーとして、修正後も既存のタイマー機能（カウントアップ/ダウン、リセット、プレイヤー切り替え等）が正常に動作することを望む

#### Acceptance Criteria

1. WHEN ゲームがリセットされる THEN GameTimer SHALL 全てのタイマー表示を初期値（00:00）にリセットする

2. WHEN カウントアップモードが選択される THEN GameTimer SHALL 全てのタイマー表示を増加方向で同期更新する

3. WHEN カウントダウンモードが選択される THEN GameTimer SHALL 全てのタイマー表示を減少方向で同期更新する

4. WHEN プレイヤー数が変更される THEN GameTimer SHALL 新しいプレイヤー構成で全体プレイ時間を正確に再計算する

5. WHEN アクティブプレイヤーが切り替わる THEN GameTimer SHALL 新しいアクティブプレイヤーのターン時間を0秒から開始し、一時停止期間累積をリセットする

6. WHERE 最長時間プレイヤー表示 THE GameTimer SHALL 修正後も正しく最長時間のプレイヤーを特定し表示する

### Requirement 6: テスト可能性と検証

**Objective:** 開発者として、修正内容が正しく動作することを自動テストで検証し、リグレッションを防止したい

#### Acceptance Criteria

1. WHERE ユニットテスト THE GameTimer SHALL ターン時間計算ロジック（一時停止時間除外を含む）をテストするテストケースを提供する

2. WHERE ユニットテスト THE GameTimer SHALL 複数回の一時停止・再開を経たターン時間計算の正確性をテストするテストケースを提供する

3. WHERE E2Eテスト THE GameTimer SHALL 全てのタイマー表示が同じ秒数で更新されることを検証するテストシナリオを提供する

4. WHERE E2Eテスト THE GameTimer SHALL 一時停止・再開後もターン時間が継続することを検証するテストシナリオを提供する

5. WHERE E2Eテスト THE GameTimer SHALL 複数回の一時停止・再開を繰り返してもターン時間が正確であることを検証するテストシナリオを提供する

6. WHERE E2Eテスト THE GameTimer SHALL 既存機能（リセット、プレイヤー切り替え、モード変更等）が正常に動作することを検証する回帰テストを提供する
