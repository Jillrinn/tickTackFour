# Requirements Document

## Introduction
本機能は、デプロイ環境（Azure Static Web Apps）とローカル環境の両方で発生している重大なエラーを修正します。デプロイ環境ではJavaScriptモジュールの読み込み失敗によりホワイトアウト（画面が真っ白）が発生し、ローカル環境ではAPI接続失敗により機能が正常に動作していません。これらの問題を解決し、両環境でアプリケーションが正常に動作することを保証します。

## 調査結果

### デプロイ環境の問題
- **URL**: https://orange-stone-066c2d600.3.azurestaticapps.net/
- **症状**: ホワイトアウト（画面が完全に白い状態）
- **根本原因**:
  - JavaScriptモジュールのMIMEタイプエラー: `application/octet-stream`（正しくは`application/javascript`または`text/javascript`）
  - `/src/main.tsx`が200で返されるが、モジュールとして実行できない
  - `/vite.svg`が404エラー
- **エラーメッセージ**:
  - `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream"`
  - `Failed to load resource: the server responded with a status of 404 ()`

### ローカル環境の問題
- **URL**: http://localhost:5173/
- **症状**: フロントエンドは表示されるが、API接続が失敗
- **根本原因**:
  - Azure Functions（バックエンドAPI）が起動していない
  - `/api/game`エンドポイントへのリクエストが500 Internal Server Errorで失敗
  - 3回連続失敗後、フォールバックモードに自動切り替え
- **エラーメッセージ**:
  - `Failed to fetch game state: 500 Internal Server Error`
  - `[GameTimer] ポーリング3回連続失敗、フォールバックモードに切り替えます`

## Requirements

### Requirement 1: ローカル環境のAPI接続エラー修正（優先度：高）
**Objective:** As a 開発者, I want ローカル環境でAPIが正常に動作する, so that フル機能のテストと開発が可能になる

**理由:** デプロイ環境の修正が正しいか検証するには、まずローカル環境で動作確認できる必要があります。

#### Acceptance Criteria

1. WHEN 開発者がローカル環境を起動する THEN Azure Functions API SHALL 正常に起動し、`http://localhost:7071`でリッスンする
2. WHEN フロントエンドが`/api/game`にGETリクエストを送信する THEN API SHALL 200ステータスコードでゲーム状態を返す
3. WHEN API接続が成功する THEN フロントエンド SHALL フォールバックモードに切り替わらない
4. WHEN 開発サーバーが起動する THEN ブラウザコンソール SHALL "Failed to fetch game state"エラーを表示しない
5. IF Azure Functions APIが起動していない THEN システム SHALL 明確なエラーメッセージを開発者に表示する

### Requirement 2: デプロイ環境のホワイトアウトエラー修正（優先度：高）
**Objective:** As a ユーザー, I want デプロイ環境でアプリケーションが正常に表示される, so that 本番環境でゲームタイマーを利用できる

**理由:** ローカル環境での修正と検証が完了した後、デプロイ環境の問題を解決します。

#### Acceptance Criteria

1. WHEN ユーザーがデプロイ環境URL（https://orange-stone-066c2d600.3.azurestaticapps.net/）にアクセスする THEN アプリケーション SHALL 正常にロードされ、ホワイトアウトが発生しない
2. WHEN JavaScriptモジュールが要求される THEN サーバー SHALL 正しいMIMEタイプ（`application/javascript`または`text/javascript`）でレスポンスする
3. WHEN `/src/main.tsx`が要求される THEN ビルド済みのJavaScriptバンドル SHALL 正しく配信される
4. WHEN 静的アセット（`/vite.svg`等）が要求される THEN サーバー SHALL 200ステータスコードで正しいファイルを返す
5. WHEN ページがロードされる THEN ブラウザコンソール SHALL JavaScriptモジュールロードエラーを表示しない

### Requirement 3: Azure Static Web Apps設定の修正
**Objective:** As a デプロイエンジニア, I want Azure Static Web Apps設定が正しく構成されている, so that ビルド成果物が正しく配信される

#### Acceptance Criteria

1. WHEN Viteがプロダクションビルドを実行する THEN ビルド成果物 SHALL `frontend/dist/`ディレクトリに正しく出力される
2. WHEN Azure Static Web Appsがデプロイされる THEN `staticwebapp.config.json` SHALL 正しいルーティングとMIMEタイプ設定を含む
3. WHEN ビルド成果物がデプロイされる THEN Azure SHALL `dist/`ディレクトリの内容をルートパスで配信する
4. WHEN JavaScriptファイルが配信される THEN Azure SHALL `.js`ファイルに`application/javascript`ヘッダーを設定する
5. WHERE デプロイパイプライン（GitHub Actions）が実行される THE パイプライン SHALL ビルドエラーなしで完了する

### Requirement 4: 環境別動作確認とドキュメント化
**Objective:** As a プロジェクトメンバー, I want 各環境でのセットアップ手順が明確である, so that 誰でも環境構築とトラブルシューティングができる

#### Acceptance Criteria

1. WHEN 開発者がローカル環境をセットアップする THEN ドキュメント SHALL Azure Functionsの起動手順を含む
2. WHEN 環境間で問題が発生する THEN ドキュメント SHALL トラブルシューティングガイドを提供する
3. WHEN デプロイが実行される THEN システム SHALL デプロイ前検証チェックリストに従う
4. WHERE ローカル開発環境 THE README.md SHALL 必要な前提条件（Node.js、Azure Functions Core Tools）を明記する
5. WHERE デプロイ環境 THE ドキュメント SHALL Azure Static Web Apps固有の設定要件を説明する

### Requirement 5: エラーハンドリングとフォールバック機能の検証
**Objective:** As a ユーザー, I want API接続失敗時も基本機能が動作する, so that 一時的なネットワーク問題でも利用を継続できる

#### Acceptance Criteria

1. WHEN API接続が3回連続で失敗する THEN アプリケーション SHALL フォールバックモード（インメモリー版）に自動切り替える
2. WHEN フォールバックモードが有効になる THEN ユーザー SHALL ゲームタイマーの基本機能（タイマー計測、プレイヤー管理）を利用できる
3. WHEN フォールバックモードが有効になる THEN システム SHALL ユーザーに明確な通知を表示する
4. IF APIが後で復旧する THEN システム SHALL 自動的に通常モードへの復帰を試みる
5. WHILE フォールバックモード中 THE アプリケーション SHALL エラーメッセージをコンソールに過剰に出力しない

## 成功基準

### デプロイ環境
- ✅ https://orange-stone-066c2d600.3.azurestaticapps.net/ でアプリケーションが正常に表示される
- ✅ ホワイトアウトが発生しない
- ✅ ブラウザコンソールにモジュールロードエラーが表示されない
- ✅ 全ての静的アセットが200ステータスコードで配信される

### ローカル環境
- ✅ `npm run dev`（フロントエンド）と`npm start`（API）で両方が正常起動する
- ✅ http://localhost:5173/ でアプリケーションが正常に表示される
- ✅ API接続が成功し、"Failed to fetch game state"エラーが発生しない
- ✅ フォールバックモードに不要な切り替えが発生しない

### 共通
- ✅ 全ての機能（プレイヤー管理、タイマー計測、ターン切り替え）が両環境で動作する
- ✅ セットアップとトラブルシューティングのドキュメントが更新される
