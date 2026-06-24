import { describe, it, expect } from 'vitest';
import { getCatanPlayerIndex, getCatanPhase, getCatanPhase1Length } from '../turnSequence';

describe('turnSequence (catan)', () => {
  it('4人: フェーズ1は index 0,1,2,3,2,1,0', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(t => getCatanPlayerIndex(t, 4))).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('4人: フェーズ2はプレイヤー1から（t=7→0, t=8→1）', () => {
    expect(getCatanPlayerIndex(7, 4)).toBe(0);
    expect(getCatanPlayerIndex(8, 4)).toBe(1);
  });

  it('getCatanPhase はN=4で t=6→1, t=7→2', () => {
    expect(getCatanPhase(6, 4)).toBe(1);
    expect(getCatanPhase(7, 4)).toBe(2);
  });

  it('getCatanPhase1Length は 2N-1', () => {
    expect(getCatanPhase1Length(4)).toBe(7);
  });

  it('2人: index 0,1,0', () => {
    expect([0, 1, 2].map(t => getCatanPlayerIndex(t, 2))).toEqual([0, 1, 0]);
  });
});
