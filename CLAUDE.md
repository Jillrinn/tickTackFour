# Claude Code Spec-Driven Development

Kiro-style Spec Driven Development implementation using claude code slash commands, hooks and agents.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Commands: `.claude/commands/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- `multiplayer-game-timer`: マルチプレイヤーゲームタイマーのコア機能（Phase 1: インメモリー実装）
- `frontend-ux-improvements`: フロントエンドUX改善（プレイヤー名入力、UI簡素化、レイアウト最適化）
- `multiplayer-sync`: マルチプレイヤー同期機能（Cosmos DB永続化、SignalRリアルタイム同期）
- `top-time-player-indicator`: 最も時間を使っているプレイヤーの別枠表示機能
- `e2e-testing`: E2Eテスト環境構築（将来的なバックエンド・SignalR統合を考慮した拡張可能なテスト構成）
- `ui-controls-enhancement`: UIコントロール強化（ドロップダウン、トグルスイッチ、セクション分割、固定表示）
- `turn-time-tracking`: ターン時間トラッキング（現在のターンでの経過時間表示、ゲーム全体のプレイ時間表示）
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)
- **Commit messages must be written in Japanese** (コミットメッセージは日本語で記述すること)

## Workflow

### Phase 0: Steering (Optional)
`/kiro:steering` - Create/update steering documents
`/kiro:steering-custom` - Create custom steering for specialized contexts

Note: Optional for new features or small additions. You can proceed directly to spec-init.

### Phase 1: Specification Creation
1. `/kiro:spec-init [detailed description]` - Initialize spec with detailed project description
2. `/kiro:spec-requirements [feature]` - Generate requirements document
3. `/kiro:spec-design [feature]` - Interactive: "Have you reviewed requirements.md? [y/N]"
4. `/kiro:spec-tasks [feature]` - Interactive: Confirms both requirements and design review

### Phase 2: Progress Tracking
`/kiro:spec-status [feature]` - Check current progress and phases

## Development Rules
1. **Consider steering**: Run `/kiro:steering` before major development (optional for new features)
2. **Follow 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **Approval required**: Each phase requires human review (interactive prompt or manual)
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **Keep steering current**: Run `/kiro:steering` after significant changes
7. **Check spec compliance**: Use `/kiro:spec-status` to verify alignment

## Frontend Implementation Workflow (必須プロセス)

フロントエンド機能を実装する際は、以下のワークフローを**必ず**実施すること：

### 1. TDD Implementation (テスト駆動開発)
- 実装前にテストケースを作成（RED phase）
- 最小限の実装でテストをパス（GREEN phase）
- 必要に応じてリファクタリング（REFACTOR phase）
- `npm test`で全ユニットテストが成功することを確認

### 2. E2E Test Implementation (E2Eテスト実装)
実装完了後、**必ず**E2Eテストを追加して実機検証を自動化：

**E2Eテスト作成手順**:
1. `e2e/specs/`ディレクトリに新規テストファイルを作成（または既存ファイルに追加）
2. 実装した機能の主要なユーザーフローをテストケースとして記述
3. Page Object Modelパターンを使用して要素を識別
4. `data-testid`属性を使用して要素を確実に特定
5. 各操作後に状態変化を検証（expect文で確認）

**E2Eテスト実行**:
```bash
# 全E2Eテスト実行
npx playwright test

# 特定のテストファイルのみ実行
npx playwright test e2e/specs/[test-file].spec.ts

# UIモードで実行（デバッグ用）
npx playwright test --ui

# ブラウザ表示モードで実行
npx playwright test --headed
```

**検証完了の基準**:
- 全てのユニットテストが成功
- 全てのE2Eテストが成功
- 実装した機能が想定通りに動作
- エラーや予期しない動作が発生しない

詳細な検証プロセスは`.kiro/specs/[feature-name]/design.md`の「フロントエンド実装の検証プロセス（必須）」を参照。

### 3. Task Completion and Commit (タスク完了とコミット)
検証完了後、**必ず**以下を実施：

1. **tasks.mdを更新**: 該当タスクをチェック済み`[x]`に変更
2. **Gitコミット作成**: 以下の情報を含む詳細なコミットメッセージで記録

**コミットメッセージテンプレート**:
```
Task [番号]完了: [タスク名]

## 実装内容
- [実装した機能の詳細]
- [変更したファイルと主要な変更点]

## テスト結果
- 全[N]ユニットテストパス（[新規テスト名]含む）
- 全[M]E2Eテストパス（[新規E2Eテスト名]含む）
- 全テスト（既存含む）パス、リグレッションなし

## E2Eテスト検証完了
1. ✅ [検証項目1]
2. ✅ [検証項目2]
...

## ドキュメント更新（該当する場合）
- [更新したドキュメントと変更内容]

## 次のタスク
- Task [次のタスク番号]: [次のタスク名]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

3. **即座にコミット**: タスク完了ごとに細かくコミットを作成（複数タスクをまとめない）

### ワークフロー全体の流れ

```
タスク開始
  ↓
TDD: ユニットテスト作成 (RED)
  ↓
TDD: 実装 (GREEN)
  ↓
TDD: npm test → 全ユニットテストパス確認
  ↓
E2Eテスト作成: ユーザーフローをテストケース化
  ↓
E2Eテスト実行: npx playwright test → 全E2Eテストパス確認
  ↓
tasks.md更新: [x] チェック
  ↓
Gitコミット: 詳細なコミットメッセージで記録
  ↓
次のタスクへ
```

**重要**: 各タスク完了後に必ずコミットを作成すること。これにより：
- 実装の進捗が明確に記録される
- 問題発生時に容易にロールバック可能
- レビュー時に変更内容が理解しやすい
- 実装履歴が詳細に残る
- E2Eテストにより実機動作が自動検証される

## Steering Configuration

### Current Steering Files
Managed by `/kiro:steering` command. Updates here reflect command changes.

### Active Steering Files
- `product.md`: Always included - Product context and business objectives
- `tech.md`: Always included - Technology stack and architectural decisions
- `structure.md`: Always included - File organization and code patterns

### Custom Steering Files
<!-- Added by /kiro:steering-custom command -->
<!-- Format:
- `filename.md`: Mode - Pattern(s) - Description
  Mode: Always|Conditional|Manual
  Pattern: File patterns for Conditional mode
-->

### Inclusion Modes
- **Always**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., "*.test.js")
- **Manual**: Reference with `@filename.md` syntax

