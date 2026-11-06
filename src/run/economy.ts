import tuning from '../data/tuning.json';
import type { GameState, Side } from '../rules/types';

export interface Payout { saved: number; captured: number; turnsLeft: number; savedGold: number; captureGold: number; speedGold: number; tileGold: number; total: number }

const count = (g: GameState, side: Side) => g.board.flat().filter((p) => p?.side === side).length;

/** Gold for a won fight: pieces you kept, pieces you took, and turns left on the clock. Losses pay nothing. */
export function fightPayout(start: GameState, end: GameState): Payout {
  const E = tuning.economy;
  const tileGold = end.goldEarned ?? 0;
  const saved = count(end, 'player');
  const captured = Math.max(0, count(start, 'enemy') - count(end, 'enemy'));
  const turnsLeft = Math.max(0, end.turnLimit - end.turnNumber);
  if (end.status !== 'won') return { saved, captured, turnsLeft, savedGold: 0, captureGold: 0, speedGold: 0, tileGold, total: tileGold };
  const savedGold = saved * E.perSaved;
  const captureGold = captured * E.perCapture;
  const speedGold = Math.min(E.turnBonusCap, turnsLeft * E.perTurnLeft);
  return { saved, captured, turnsLeft, savedGold, captureGold, speedGold, tileGold, total: Math.round((savedGold + captureGold + speedGold) * (end.payoutMult ?? 1)) + tileGold };
}
