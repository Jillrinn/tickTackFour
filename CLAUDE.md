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
- `multiplayer-sync`: マルチプレイヤー同期機能（Cosmos DB永続化、バックエンド主導タイマー、ポーリング同期）
- `signalr-realtime-sync`: SignalRリアルタイム同期（<1秒同期、自動再接続、ポーリングからの移行）
- `top-time-player-indicator`: 最も時間を使っているプレイヤーの別枠表示機能
- `e2e-testing`: E2Eテスト環境構築（将来的なバックエンド・SignalR統合を考慮した拡張可能なテスト構成）
- `ui-controls-enhancement`: UIコントロール強化（ドロップダウン、トグルスイッチ、セクション分割、固定表示）
- `turn-time-tracking`: ターン時間トラッキング（現在のターンでの経過時間表示、ゲーム全体のプレイ時間表示）
- `game-history-statistics`: ゲーム履歴統計画面（1ゲーム1レコード、プレイ時間順位表示、カウントアップ/ダウン判定、全体最多/最少時間プレイヤー表示）
- `player-name-persistence`: プレイヤー名永続化機能（Azure Functions API + Cosmos DB Table API、プルダウン履歴選択、最大20件保存）
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)
- **Commit messages must be written in Japanese** (コミットメッセージは日本語で記述すること)
- **Git Commit Best Practice**:
  - **DO NOT use `git add -A` or `git add .`** - これらは無関係な変更も含めてしまう
  - **DO use selective staging** - 現在の作業に関連するファイルのみを明示的に指定してコミット
  - 例: `git add frontend/src/components/PlayerList.tsx frontend/src/hooks/useGameState.ts`
  - タスク完了ごとに、そのタスクに関連する変更のみをコミットする
- **Code Exploration with Serena MCP**: Always use Serena MCP tools for code navigation and exploration
  - Use `mcp__serena__get_symbols_overview` to understand file structure
  - Use `mcp__serena__find_symbol` to locate functions, classes, and methods
  - Use `mcp__serena__search_for_pattern` for pattern-based searches
  - Use `mcp__serena__find_referencing_symbols` to trace dependencies
  - Prefer Serena's semantic tools over basic grep/find commands for code analysis

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

### 各タスク実装時のワークフロー

#### 1. TDD Implementation (テスト駆動開発)
- 実装前にユニットテストケースを作成（RED phase）
- 最小限の実装でテストをパス（GREEN phase）
- 必要に応じてリファクタリング（REFACTOR phase）
- `npm test`で全ユニットテストが成功することを確認

#### 2. Task Completion and Commit (タスク完了とコミット)
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
- 全テスト（既存含む）パス、リグレッションなし

## 次のタスク
- Task [次のタスク番号]: [次のタスク名]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

3. **即座にコミット**: タスク完了ごとに細かくコミットを作成（複数タスクをまとめない）

### tasks.mdの最終テストフェーズでのE2Eテスト実装

#### 1. E2E Test Implementation (E2Eテスト実装)

全機能タスクの実装完了後、**tasks.mdの最終テストフェーズでまとめて**E2Eテストを実装：

**E2Eテスト作成手順**:
1. `e2e/specs/`ディレクトリに新規テストファイルを作成（または既存ファイルに追加）
2. 実装した全機能の主要なユーザーフローをテストケースとして記述
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
- 実装した全機能が想定通りに動作
- エラーや予期しない動作が発生しない

詳細な検証プロセスは`.kiro/specs/[feature-name]/design.md`の「フロントエンド実装の検証プロセス（必須）」を参照。

#### 2. E2E Test Completion and Commit (E2Eテスト完了とコミット)

1. **tasks.mdを更新**: E2Eテストタスクをチェック済み`[x]`に変更
2. **Gitコミット作成**: 以下の情報を含む詳細なコミットメッセージで記録

**コミットメッセージテンプレート**:
```
E2Eテスト完了: [機能名]

## 実装内容
- [実装したE2Eテストファイル一覧]
- [テストした主要なユーザーフロー]

## テスト結果
- 全[M]E2Eテストパス（[新規E2Eテスト名]含む）
- 全テスト（ユニット+E2E）パス、リグレッションなし

## E2Eテスト検証完了
1. ✅ [検証項目1]
2. ✅ [検証項目2]
...

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### 3. Specification Completion (仕様完了処理)

E2Eテスト完了後、**必ず**以下を実施：

1. **spec.jsonを更新**: phaseを"implementation-done"に変更
2. **tasks.mdを更新**: spec.json更新タスクをチェック済み`[x]`に変更
3. **Gitコミット作成**: 以下の情報を含む最終コミットメッセージで記録

**tasks.md最終フェーズのタスク例**:
```markdown
## Phase [最終]: 実装完了処理

### [番号]. 実装完了処理を実施する

- [ ] [番号].1 全テスト結果の確認
  - 全てのユニットテストが成功していることを確認
  - 全てのE2Eテストが成功していることを確認
  - エラーや予期しない動作が発生しないことを確認

- [ ] [番号].2 spec.json更新とコミット作成
  - spec.jsonのphaseを"implementation-done"に更新
  - tasks.mdの全タスクをチェック済み[x]に更新
  - 詳細なコミットメッセージを作成（実装内容、テスト結果含む）
  - Gitコミット作成（実装完了の最終コミット）
```

**最終コミットメッセージテンプレート**:
```
実装完了: [機能名]

## 実装完了サマリー

### 全Phase完了状況
- **Phase 1**: [Phase 1名] ✅
- **Phase 2**: [Phase 2名] ✅
...

### 全テスト結果
- **ユニットテスト**: [N]/[N]パス ✅
- **E2Eテスト**: [M]/[M]パス ✅
- **合計**: [N+M]/[N+M]テストパス ✅

### 実装された機能
1. [機能1の概要]
2. [機能2の概要]
...

## ファイル変更サマリー

### 更新:
- `spec.json`: phase → "implementation-done"
- `tasks.md`: 全タスク完了[x]にマーク

## 実装期間
- 開始: [開始日時]
- 完了: [完了日時]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### ワークフロー全体の流れ

```
【各タスク実装フェーズ】
タスク開始
  ↓
TDD: ユニットテスト作成 (RED)
  ↓
TDD: 実装 (GREEN)
  ↓
TDD: npm test → 全ユニットテストパス確認
  ↓
tasks.md更新: [x] チェック
  ↓
Gitコミット: 詳細なコミットメッセージで記録
  ↓
次のタスクへ

【最終テストフェーズ: 全タスク完了後】
E2Eテスト作成: 全機能のユーザーフローをテストケース化
  ↓
E2Eテスト実行: npx playwright test → 全E2Eテストパス確認
  ↓
tasks.md更新: E2Eテストタスクを[x] チェック
  ↓
Gitコミット: E2Eテスト実装完了のコミット
  ↓
spec.json更新: phaseを"implementation-done"に変更
  ↓
Gitコミット: 実装完了の最終コミット
  ↓
完了
```

**重要**:
- **各タスク実装時**: ユニットテスト → 実装 → コミット
- **最終テストフェーズ**: 全機能のE2Eテストをまとめて実装 → コミット
- **最終タスク**: spec.jsonのphase更新 → 実装完了コミット
- E2Eテストにより全機能の実機動作が自動検証される

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

