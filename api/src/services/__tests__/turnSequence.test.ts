import { getCatanPlayerIndex, getCatanPhase, getCatanPhase1Length } from '../turnSequence';

describe('turnSequence (catan)', () => {
  it('4人: フェーズ1は 1,2,3,4,3,2,1 の順（index 0..3,2,1,0）', () => {
    const seq = [0, 1, 2, 3, 4, 5, 6].map(t => getCatanPlayerIndex(t, 4));
    expect(seq).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('4人: フェーズ2はプレイヤー1から仕切り直し（t=7→0, t=8→1）', () => {
    expect(getCatanPlayerIndex(7, 4)).toBe(0);
    expect(getCatanPlayerIndex(8, 4)).toBe(1);
    expect(getCatanPlayerIndex(11, 4)).toBe(0);
  });

  it('phase1の長さは 2N-1', () => {
    expect(getCatanPhase1Length(4)).toBe(7);
    expect(getCatanPhase1Length(2)).toBe(3);
    expect(getCatanPhase1Length(6)).toBe(11);
  });

  it('getCatanPhase はL1境界で1→2に切り替わる（N=4: t=6→1, t=7→2）', () => {
    expect(getCatanPhase(0, 4)).toBe(1);
    expect(getCatanPhase(6, 4)).toBe(1);
    expect(getCatanPhase(7, 4)).toBe(2);
  });

  it('2人: フェーズ1は 1,2,1（index 0,1,0）', () => {
    expect([0, 1, 2].map(t => getCatanPlayerIndex(t, 2))).toEqual([0, 1, 0]);
    expect(getCatanPlayerIndex(3, 2)).toBe(0); // phase2 start
  });

  it('6人: フェーズ1は index 0..5,4,3,2,1,0', () => {
    const seq = Array.from({ length: 11 }, (_, t) => getCatanPlayerIndex(t, 6));
    expect(seq).toEqual([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]);
  });
});
