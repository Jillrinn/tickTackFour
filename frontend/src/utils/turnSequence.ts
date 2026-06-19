/**
 * カタンモードのターン順序を算出する純粋関数群（バックエンド api/src/services/turnSequence.ts と同一ロジック）。
 */
export function getCatanPhase1Length(playerCount: number): number {
  return 2 * playerCount - 1;
}

export function getCatanPlayerIndex(turnNumber: number, playerCount: number): number {
  const l1 = getCatanPhase1Length(playerCount);
  if (turnNumber < l1) {
    return turnNumber < playerCount ? turnNumber : 2 * playerCount - 2 - turnNumber;
  }
  return (turnNumber - l1) % playerCount;
}

export function getCatanPhase(turnNumber: number, playerCount: number): 1 | 2 {
  return turnNumber < getCatanPhase1Length(playerCount) ? 1 : 2;
}
