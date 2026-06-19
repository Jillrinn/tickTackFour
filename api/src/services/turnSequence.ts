/**
 * カタンモードのターン順序を算出する純粋関数群。
 * フェーズ1: 蛇腹順（昇順→折り返し1回→降順）。フェーズ2: 通常順（プレイヤー0から仕切り直し）。
 */

/** フェーズ1の総ターン数（2N-1） */
export function getCatanPhase1Length(playerCount: number): number {
  return 2 * playerCount - 1;
}

/** ターン番号tにおけるアクティブプレイヤーのindex */
export function getCatanPlayerIndex(turnNumber: number, playerCount: number): number {
  const l1 = getCatanPhase1Length(playerCount);
  if (turnNumber < l1) {
    // フェーズ1: 蛇腹
    return turnNumber < playerCount ? turnNumber : 2 * playerCount - 2 - turnNumber;
  }
  // フェーズ2: 通常順、プレイヤー0から仕切り直し
  return (turnNumber - l1) % playerCount;
}

/** ターン番号tにおけるフェーズ（1 or 2） */
export function getCatanPhase(turnNumber: number, playerCount: number): 1 | 2 {
  return turnNumber < getCatanPhase1Length(playerCount) ? 1 : 2;
}
