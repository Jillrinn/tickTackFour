# 実装計画

## Phase 1: ローカル環境のAPI接続エラー修正

- [x] 1. 開発環境の前提条件を確認・整備する
- [x] 1.1 依存関係のインストール状態を確認
  - api/ディレクトリで`npm install`を実行し、全依存関係が正常にインストールされていることを確認
  - frontend/ディレクトリで`npm install`を実行し、全依存関係が正常にインストールされていることを確認
  - `node_modules/`ディレクトリが両方に存在し、エラーがないことを検証
  - _Requirements: 1.1, 4.4_

- [x] 1.2 Azure Functions Core Toolsのインストール状態を確認
  - `func --version`コマンドを実行し、Azure Functions Core Tools v4がインストールされているか確認
  - インストールされていない場合は、プラットフォームに応じたインストール方法を実行（npm、Homebrew、Chocolatey）
  - インストール後、バージョンが4.x系であることを確認
  - _Requirements: 1.1, 4.4_

- [x] 2. Azure Functions起動スクリプトを修正する
- [x] 2.1 api/package.jsonのstartスクリプトを更新
  - `api/package.json`の`scripts.start`を`"func start --verbose"`に変更
  - `--verbose`フラグによる詳細ログ出力を有効化
  - npxを使用しない方式で直接`func start`を実行（Azure Functions Core Toolsがグローバルまたはローカルにインストールされている前提）
  - _Requirements: 1.1, 1.5_

- [x] 3. ローカル環境での動作確認とテストを実施する
- [x] 3.1 Azure Functions APIを起動し動作を確認
  - api/ディレクトリで`npm start`を実行
  - `http://localhost:7071`でAPIがリッスンしていることを確認（ターミナルログで確認）
  - `/api/health`エンドポイントにGETリクエストを送信し、`{"status":"ok"}`が返ることを確認
  - エラーが発生した場合はログを確認し、`local.settings.json`の設定を検証
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 3.2 ルートディレクトリから各種コマンドで起動確認
  - プロジェクトルートで`npm run dev:api`を実行し、APIが起動することを確認
  - プロジェクトルートで`npm run dev:frontend`を実行し、フロントエンドが起動することを確認
  - プロジェクトルートで`npm run dev`を実行し、APIとフロントエンドの両方が並行起動することを確認
  - 両方のコマンドがルートディレクトリから正常に実行できることを検証
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 3.3 フロントエンド開発サーバーを起動し統合テスト
  - frontend/ディレクトリで`npm run dev`を実行
  - `http://localhost:5173`でフロントエンドがロードされることを確認
  - ブラウザコンソールを開き、"Failed to fetch game state"エラーが発生しないことを確認
  - `/api/game`へのGETリクエストが200ステータスコードを返すことをNetwork タブで確認
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 3.4 基本機能の手動テストを実施
  - プレイヤー数の変更機能をテスト（4-6人）
  - タイマー開始・一時停止・再開機能をテスト
  - ターン切り替え機能（「次のプレイヤーへ」ボタン）をテスト
  - リセット機能をテスト
  - フォールバックモードに切り替わらないことを確認（3回連続失敗が発生しない）
  - _Requirements: 1.3, 5.1, 5.2_

- [x] 4. 既存ユニットテストを実行し回帰検証する
- [x] 4.1 バックエンドのユニットテストを実行
  - api/ディレクトリで`npm test`を実行
  - 全テストがパスすることを確認
  - テスト失敗がある場合は原因を調査し修正
  - _Requirements: 1.2_

- [x] 4.2 フロントエンドのユニットテストを実行
  - frontend/ディレクトリで`npm test`を実行
  - 全テストがパスすることを確認
  - テスト失敗がある場合は原因を調査し修正
  - _Requirements: 1.3, 1.4_

## Phase 2: デプロイ環境のホワイトアウトエラー修正

- [x] 5. Azure Static Web AppsのMIMEタイプ設定を追加する
- [x] 5.1 staticwebapp.config.jsonにMIMEタイプ設定を追加
  - プロジェクトルートの`staticwebapp.config.json`を開く
  - `mimeTypes`オブジェクトに`.js`と`.mjs`の設定を追加（`"application/javascript"`）
  - 既存の`.json`設定（`"application/json"`）を維持
  - JSON構文が正しいことを確認（カンマ、引用符、閉じ括弧）
  - _Requirements: 2.2, 2.5, 3.2, 3.4_

- [ ] 6. フロントエンドのビルドを検証する
- [ ] 6.1 プロダクションビルドを実行し成果物を確認
  - frontend/ディレクトリで`npm run build`を実行
  - ビルドエラーがないことを確認
  - `frontend/dist/`ディレクトリが生成されることを確認
  - `frontend/dist/index.html`と`frontend/dist/assets/`にJavaScriptファイル（*.js）が存在することを確認
  - _Requirements: 2.3, 3.1, 3.5_

- [ ] 6.2 ビルド成果物のMIMEタイプをローカルで検証
  - frontend/ディレクトリで`npm run preview`を実行（Viteプレビューサーバー）
  - `http://localhost:4173`にアクセスし、アプリケーションが正常にロードされることを確認
  - ブラウザのNetwork タブでJavaScriptファイルのContent-Typeヘッダーを確認
  - プレビュー環境で基本機能をテスト
  - _Requirements: 2.3, 3.1_

- [ ] 7. Git commitとpushでデプロイをトリガーする
- [ ] 7.1 変更をGitにコミット
  - `git status`で変更ファイルを確認（api/package.json、staticwebapp.config.json）
  - `git add api/package.json staticwebapp.config.json`で変更をステージング
  - `git commit -m "修正: ローカル環境API起動とデプロイ環境MIMEタイプ設定"`でコミット作成
  - コミットメッセージに修正内容の要約を含める
  - _Requirements: 3.5_

- [ ] 7.2 変更をリモートリポジトリにプッシュ
  - `git push`でmainブランチにプッシュ
  - GitHub Actionsワークフローが自動的にトリガーされることを確認
  - _Requirements: 3.5_

- [ ] 8. デプロイ環境での動作確認とテストを実施する
- [ ] 8.1 GitHub Actionsデプロイログを確認
  - GitHubリポジトリの「Actions」タブを開く
  - 最新のワークフロー実行を選択
  - ビルドステップとデプロイステップが全て成功していることを確認
  - エラーがある場合はログを確認し、原因を特定して修正
  - _Requirements: 3.5_

- [ ] 8.2 デプロイ環境でアプリケーションをテスト
  - ブラウザで`https://orange-stone-066c2d600.3.azurestaticapps.net/`にアクセス
  - ホワイトアウトが発生せず、アプリケーションが正常にロードされることを確認
  - ブラウザコンソールでJavaScriptモジュールロードエラーが発生しないことを確認
  - Network タブでJavaScriptファイルが200ステータスコードで返され、Content-Typeが`application/javascript`であることを確認
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 8.3 デプロイ環境で基本機能をテスト
  - プレイヤー数の変更機能をテスト
  - タイマー開始・一時停止・再開機能をテスト
  - ターン切り替え機能をテスト
  - リセット機能をテスト
  - 全機能が正常に動作することを確認
  - _Requirements: 2.1, 3.3_

- [ ] 8.4 静的アセットの配信を確認
  - `/vite.svg`やその他の静的アセット（CSS、画像）が200ステータスコードで返されることをNetwork タブで確認
  - 404エラーが発生していないことを確認
  - _Requirements: 2.4_

- [ ] 9. E2Eテストを実行し回帰検証する
- [ ] 9.1 ローカル環境でE2Eテストを実行
  - プロジェクトルートで`npx playwright test`を実行
  - 全テストがパスすることを確認（player-management、timer-operations、active-player、game-controls）
  - テスト失敗がある場合は原因を調査し修正
  - _Requirements: 1.3, 5.1, 5.2_

## Phase 3: ドキュメント化とトラブルシューティングガイド

- [ ] 10. README.mdにセットアップ手順を追加する
- [ ] 10.1 前提条件セクションを更新
  - 必要なソフトウェアのバージョンを明記（Node.js 20以上、Azure Functions Core Tools v4）
  - Azure Functions Core Toolsのインストール方法をプラットフォーム別に記載（npm、Homebrew、Chocolatey）
  - インストール確認コマンド（`func --version`）を追加
  - _Requirements: 4.1, 4.4_

- [ ] 10.2 ローカル環境セットアップ手順を追加
  - 依存関係インストール手順（`npm install --workspaces`）
  - Azure Functions起動手順（`cd api && npm start`）
  - フロントエンド起動手順（`cd frontend && npm run dev`）
  - 動作確認方法（`http://localhost:5173`にアクセス）
  - _Requirements: 4.1, 4.4_

- [ ] 10.3 デプロイ環境セクションを追加
  - Azure Static Web Apps設定ファイルの説明（`staticwebapp.config.json`）
  - MIMEタイプ設定の重要性を説明
  - GitHub Actionsによる自動デプロイの流れを記載
  - _Requirements: 4.2, 4.5_

- [ ] 11. TROUBLESHOOTING.mdを作成する
- [ ] 11.1 ローカル環境のトラブルシューティングガイド
  - Azure Functions起動失敗の対処法（Core Toolsインストール確認、PATHの確認）
  - API接続失敗（500エラー）の対処法（`local.settings.json`確認、ログ確認）
  - フォールバックモード切り替えの説明（正常な動作、APIが復旧すれば自動復帰）
  - ポート競合の対処法（7071、5173が既に使用されている場合）
  - _Requirements: 4.2, 1.5_

- [ ] 11.2 デプロイ環境のトラブルシューティングガイド
  - ホワイトアウト発生時の対処法（ブラウザコンソール確認、MIMEタイプ設定確認）
  - 静的アセット404エラーの対処法（ビルド成果物確認、`output_location`設定確認）
  - GitHub Actionsデプロイ失敗の対処法（ログ確認、シークレット設定確認）
  - _Requirements: 4.2, 4.5_

- [ ] 11.3 よくある問題と解決策セクション
  - TypeScriptコンパイルエラーの対処法
  - Viteビルドエラーの対処法（依存関係確認、キャッシュクリア）
  - CORS エラーの対処法（Viteプロキシ設定確認）
  - _Requirements: 4.2_

- [ ] 12. 最終検証と完了確認を実施する
- [ ] 12.1 両環境で全機能が正常に動作することを確認
  - ローカル環境（`http://localhost:5173`）で全機能をテスト
  - デプロイ環境（`https://orange-stone-066c2d600.3.azurestaticapps.net/`）で全機能をテスト
  - プレイヤー管理、タイマー計測、ターン切り替え、リセット機能を確認
  - _Requirements: 1.3, 2.1, 5.2_

- [ ] 12.2 ドキュメントの完全性を確認
  - README.mdに必要な情報が全て記載されていることを確認
  - TROUBLESHOOTING.mdが使いやすい構成になっていることを確認
  - 開発者が手順に従ってセットアップできることを確認（可能であれば他の開発者にレビューを依頼）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 12.3 spec.jsonを更新し実装完了をマーク
  - `.kiro/specs/api-error-whiteout-fix/spec.json`を開く
  - `phase`を`"implementation-done"`に更新
  - `ready_for_implementation`を`true`に更新
  - `updated_at`を現在のISO8601タイムスタンプに更新
  - Gitにコミット（`git commit -m "実装完了: api-error-whiteout-fix"`）
  - _Requirements: すべての要件_

## 要件カバレッジチェック

全ての要件が上記タスクでカバーされていることを確認：

- **Requirement 1**: ローカル環境のAPI接続エラー修正 → タスク1-4
- **Requirement 2**: デプロイ環境のホワイトアウトエラー修正 → タスク5-8
- **Requirement 3**: Azure Static Web Apps設定の修正 → タスク5-8
- **Requirement 4**: 環境別動作確認とドキュメント化 → タスク10-12
- **Requirement 5**: エラーハンドリングとフォールバック機能の検証 → タスク3, 9

## 実装ガイドライン

### タスク実行の注意点
- 各タスクは順番に実行してください（依存関係があります）
- Phase 1が完全に完了してからPhase 2に進んでください
- エラーが発生した場合は、TROUBLESHOOTING.mdを参照してください
- 各フェーズ完了後、Gitコミットを作成することを推奨します

### 完了基準
- ローカル環境で`npm start`（api/）と`npm run dev`（frontend/）が正常に起動する
- デプロイ環境でアプリケーションが正常にロードされ、ホワイトアウトが発生しない
- 全ての基本機能（プレイヤー管理、タイマー計測、ターン切り替え）が両環境で動作する
- README.mdとTROUBLESHOOTING.mdが完全に整備されている
