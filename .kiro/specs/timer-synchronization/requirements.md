# Requirements Document

## Introduction

現在のマルチプレイヤー・ゲームタイマーには、画面上に複数のタイマー表示（プレイヤーカードの個別タイマー、ターン時間、全体プレイ時間、最長時間プレイヤー表示）が存在しますが、これらが独立して更新されているため、表示タイミングにズレが生じています。この非同期な更新は、ユーザーにとって視覚的に違和感があり、時間の把握を困難にしています。

本機能では、単一のタイマーインスタンスを使用して全てのタイマー表示を管理することで、画面上の全てのタイマーが同期して更新されるようにします。これにより、ユーザーはどのタイマー表示を見ても同じ時刻を確認でき、ゲーム進行が視覚的に統一された状態で提供されます。

## Requirements

### Requirement 1: タイマーインスタンスの一元管理
**Objective:** ゲーム管理者として、全てのタイマー表示が同じタイマーインスタンスから更新されることを望む、それによりタイマーの同期が保証される

#### Acceptance Criteria

1. WHEN ゲームが開始されたとき THEN GameTimer SHALL 単一のタイマーインスタンスを作成する
2. WHERE プレイヤーカードのタイマー表示、ターン時間表示、全体プレイ時間表示、最長時間プレイヤー表示 THE GameTimer SHALL 同じタイマーインスタンスを参照する
3. IF 複数のタイマー表示が存在するとき THEN GameTimer SHALL 各表示に対して同じタイマー値を提供する
4. WHEN タイマーインスタンスが破棄されるとき THEN GameTimer SHALL 全てのタイマー表示を停止する

### Requirement 2: タイマー更新の同期
**Objective:** プレイヤーとして、すべてのタイマー表示が同じタイミングで更新されることを望む、それにより時間の把握が正確になる

#### Acceptance Criteria

1. WHEN タイマーが1秒経過したとき THEN GameTimer SHALL 全てのタイマー表示を同時に更新する
2. WHILE ゲームが進行中（カウントアップモード）のとき THE GameTimer SHALL 全てのタイマー表示を同期してインクリメントする
3. WHILE ゲームが進行中（カウントダウンモード）のとき THE GameTimer SHALL 全てのタイマー表示を同期してデクリメントする
4. IF タイマー更新の遅延が発生したとき THEN GameTimer SHALL 次回の更新で全表示を正しい時刻に補正する

### Requirement 3: タイマー状態管理の統一
**Objective:** ゲーム管理者として、一時停止・再開・リセット操作が全タイマー表示に即座に反映されることを望む、それによりゲーム制御が一貫している

#### Acceptance Criteria

1. WHEN ゲームが一時停止されたとき THEN GameTimer SHALL タイマーインスタンスの更新を停止する
2. IF ゲームが一時停止状態のとき THEN GameTimer SHALL 全てのタイマー表示を現在の時刻で保持する
3. WHEN ゲームが再開されたとき THEN GameTimer SHALL タイマーインスタンスの更新を再開する
4. WHEN ゲームがリセットされたとき THEN GameTimer SHALL 全てのタイマー表示を初期値に即座に更新する

### Requirement 4: UI表示の一貫性保証
**Objective:** ユーザーとして、画面上のどのタイマー表示を見ても同じ時刻が表示されることを望む、それにより混乱なくゲームを進行できる

#### Acceptance Criteria

1. WHERE プレイヤーカードのタイマー表示 THE GameTimer SHALL アクティブプレイヤーの経過時間を同期して表示する
2. WHERE ターン時間表示 THE GameTimer SHALL 現在のターンでの経過時間を同期して表示する
3. WHERE 全体プレイ時間表示 THE GameTimer SHALL 全プレイヤーの累計時間を同期して表示する
4. WHERE 最長時間プレイヤー表示 THE GameTimer SHALL 最も時間を使っているプレイヤーの時間を同期して表示する
5. WHEN 任意のタイマー表示が更新されたとき THEN GameTimer SHALL 他の全てのタイマー表示も同じタイミングで更新する
