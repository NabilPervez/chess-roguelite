import tuning from '../data/tuning.json';
import type { GameState, Side } from '../rules/types';

export interface Payout { saved: number; captured: number; turnsLeft: number; winGold: number; savedGold: number; captureGold: number; speedGold: number; tileGold: number; interestGold: number; mult: number; total: number }

const count = (g: GameState, side: Side) => g.board.flat().filter((p) => p?.side === side).length;

/** Interest on gold banked before the fight: +1 per `per`, capped at `max`. */
export const interest = (banked: number) => Math.min(tuning.economy.interest.max, Math.floor(Math.max(0, banked) / tuning.economy.interest.per));

/** Gold for a won fight: win reward, pieces kept, pieces taken, turns spare, then interest. Losses pay only tile gold. */
export function fightPayout(start: GameState, end: GameState, banked = 0, bonus = 0): Payout {
  const E = tuning.economy;
  const tileGold = end.goldEarned ?? 0;
  const saved = count(end, 'player');
  // Prefer the in-fight tally: it survives a mid-fight reload, where `start` is the resumed state.
  const captured = end.tally?.captured ?? Math.max(0, count(start, 'enemy') - count(end, 'enemy'));
  const turnsLeft = Math.max(0, end.turnLimit - end.turnNumber);
  const mult = end.payoutMult ?? 1;
  if (end.status !== 'won') return { saved, captured, turnsLeft, winGold: 0, savedGold: 0, captureGold: 0, speedGold: 0, tileGold, interestGold: 0, mult, total: tileGold };
  const winGold = E.winReward + bonus;
  const savedGold = saved * E.perSaved;
  const captureGold = captured * E.perCapture;
  const speedGold = Math.min(E.turnBonusCap, turnsLeft * E.perTurnLeft);
  const interestGold = interest(banked);
  return { saved, captured, turnsLeft, winGold, savedGold, captureGold, speedGold, tileGold, interestGold, mult, total: Math.round((winGold + savedGold + captureGold + speedGold) * mult) + tileGold + interestGold };
}
