# Implementation Plan

### TDD実装プロセス（必須）
各タスクの実装時は以下のTDDプロセスに従うこと：
1. **RED phase**: 実装前にテストケースを作成
2. **GREEN phase**: 最小限の実装でテストをパス
3. **REFACTOR phase**: 必要に応じてリファクタリング
4. `npm test`で全テストが成功することを確認

### TDD Implementation Process (Required)
Follow this TDD process for each task implementation:
1. **RED phase**: Create test cases before implementation
2. **GREEN phase**: Minimal implementation to pass tests
3. **REFACTOR phase**: Refactor as needed
4. Run `npm test` to verify all tests pass

## Phase 1: 準備と現状確認

- [ ] 1. 開発環境の準備とテスト実行環境の確認
- [ ] 1.1 両サーバーの起動確認
  - フロントエンド開発サーバーを起動（npm run dev）
  - APIサーバーを起動（npm start --prefix api）
  - 両サーバーが正常に動作していることを確認
  - _Requirements: 全テストの実行に必要な前提条件_

- [ ] 1.2 現在の失敗テスト状況を記録
  - E2Eテストを実行（npx playwright test）
  - 失敗テスト数とタイムアウト発生箇所を確認
  - スクリーンショットまたはログを保存（修正前の状態記録）
  - _Requirements: 修正効果の測定基準_

## Phase 2: Page Objectセレクター修正

- [ ] 2. GameTimerPage.tsのセレクター修正
- [ ] 2.1 gameHeaderセレクターの修正
  - 現在の`.game-header`セレクター（line 41）を特定
  - `data-testid="sticky-header"`を使用する方法に変更
  - getByTestId()メソッドを使用してセレクターを更新
  - _Requirements: 2.1.1 - Page Objectセレクターを実装のHTML構造と一致_

- [ ] 2.2 重複セレクターの整理検討
  - gameHeaderとstickyHeaderが同じ要素を指していることを確認
  - 他のテストでgameHeaderプロパティへの依存を確認
  - 必要に応じてセレクターの統一または整理を実施
  - _Requirements: 2.2.1 - テストの保守性向上_

## Phase 3: smoke.spec.ts修正

- [ ] 3. smoke.spec.tsのstrict mode violation解消
- [ ] 3.1 .game-timerセレクターの厳密化
  - strict mode violationが発生している箇所を特定
  - `.first()`メソッドを追加して単一要素を選択
  - または、よりセマンティックな`getByRole('main')`に変更
  - _Requirements: 2.1.2 - smoke.spec.tsのstrict mode violation解消_

## Phase 4: 検証とテスト実行

- [ ] 4. 修正後のテスト検証
- [ ] 4.1 個別テストファイルの実行
  - smoke.spec.ts単体を実行（npx playwright test e2e/specs/smoke.spec.ts）
  - 3テスト全てが成功することを確認
  - active-player.spec.ts単体を実行
  - 7テスト全てが成功することを確認
  - _Requirements: 2.3.1 - 全96E2Eテストの成功_

- [ ] 4.2 全E2Eテストの実行
  - 全テストスイートを実行（npx playwright test）
  - 96/96テストが成功することを確認
  - タイムアウトエラーが0件であることを確認
  - strict mode violationが0件であることを確認
  - _Requirements: 2.3.1 - 全96E2Eテストの成功_

- [ ] 4.3 実行時間の改善確認
  - テスト実行時間を記録
  - 修正前と比較して約34分（69テスト×30秒）短縮されていることを確認
  - スクリーンショット比較（before/after）を実施
  - _Requirements: 2.3.2 - テスト実行時間の短縮_

## Phase 5: 完了処理

- [ ] 5. 実装完了処理とドキュメント更新
- [ ] 5.1 テスト結果の最終確認
  - 全てのE2Eテストが成功していることを再確認
  - 実装コードに変更がないことを確認（frontend/src/は変更なし）
  - タイムアウトエラー0件を確認
  - _Requirements: 2.3.1 - 全96E2Eテストの成功_

- [ ] 5.2 spec.json更新とコミット作成
  - spec.jsonのphaseを"implementation-done"に更新
  - tasks.mdの全タスクをチェック済み[x]に更新
  - 詳細なコミットメッセージを作成（修正内容、テスト結果含む）
  - Gitコミット作成（実装完了の最終コミット）
  - _Requirements: 全要件の完了と記録_

---

## Requirements Coverage

### 2.1 セレクター修正
- **2.1.1**: Page Objectセレクターを実装のHTML構造と一致 → Task 2.1
- **2.1.2**: smoke.spec.tsのstrict mode violation解消 → Task 3.1

### 2.2 保守性向上
- **2.2.1**: data-testid属性の使用によるテストの安定性向上 → Task 2.1, 2.2

### 2.3 検証基準
- **2.3.1**: 全96E2Eテストの成功 → Task 4.1, 4.2, 5.1
- **2.3.2**: テスト実行時間の短縮（約34分） → Task 4.3
- **2.3.3**: 実装コードに変更なし → Task 5.1

---

## Implementation Notes

### 重要な注意事項
1. **実装コードは一切変更しない**: frontend/src/内のファイルは修正対象外
2. **data-testid使用**: 安定したセレクター選択のため、実装に既存のdata-testid属性を活用
3. **段階的検証**: 個別テスト → 全体テスト → 実行時間確認の順で検証
4. **保守性重視**: CSSクラスではなくdata-testidを使用してテストの安定性を向上

### 成功基準
- ✅ 合計96テスト全て成功
- ✅ タイムアウトエラー0件
- ✅ Strict mode violation 0件
- ✅ 実行時間が約34分短縮
- ✅ 実装コードに一切変更なし
