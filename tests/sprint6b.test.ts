import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { newGame } from '../src/rules/board';
import { fightPayout } from '../src/run/economy';

const E = tuning.economy;
describe('fight payout', () => {
  const start = newGame(null, [], []);
  it('pays for saved pieces, captures and speed on a win', () => {
    const board = start.board.map((r) => [...r]);
    const enemy = board.flatMap((r, ri) => r.map((p, ci) => (p?.side === 'enemy' && p.kind !== 'K' ? [ri, ci] : null))).filter(Boolean) as number[][];
    enemy.slice(0, 2).forEach(([r, c]) => { board[r][c] = null; });
    const end = { ...start, board, status: 'won' as const, turnNumber: 4, goldEarned: 10 };
    const p = fightPayout(start, end);
    const saved = board.flat().filter((x) => x?.side === 'player').length;
    expect(p.captured).toBe(2);
    expect(p.savedGold).toBe(saved * E.perSaved);
    expect(p.speedGold).toBe(Math.min(E.turnBonusCap, (start.turnLimit - 4) * E.perTurnLeft));
    expect(p.total).toBe(p.savedGold + 2 * E.perCapture + p.speedGold + 10);
  });
  it('fewer turns pays more', () => {
    const slow = fightPayout(start, { ...start, status: 'won', turnNumber: start.turnLimit - 1 });
    const fast = fightPayout(start, { ...start, status: 'won', turnNumber: 2 });
    expect(fast.total).toBeGreaterThan(slow.total);
  });
  it('a loss pays only tile gold', () => {
    expect(fightPayout(start, { ...start, status: 'lost', goldEarned: 5 }).total).toBe(5);
  });
});
