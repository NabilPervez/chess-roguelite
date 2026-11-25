import tuning from '../data/tuning.json';
import type { GameState, Kind } from '../rules/types';
import { pieceCap, statsOf, type RunState } from './run';

const G = tuning.graveyard;

/** Survivors of a fight, in army order, with promotions kept. Slots with no piece left on the board are lost. */
export function settleArmy(army: Kind[], end: GameState): { army: Kind[]; lost: Kind[] } {
  const bySlot = new Map<number, Kind>();
  for (const p of end.board.flat()) if (p?.side === 'player' && p.slot !== undefined) bySlot.set(p.slot, p.kind);
  const kept: Kind[] = [], lost: Kind[] = [];
  army.forEach((k, i) => { const now = bySlot.get(i); if (now) kept.push(now); else lost.push(k); });
  return { army: kept, lost };
}

/** Apply a fight's losses: shrink the army, push the dead into the graveyard (newest first, capped). Kings never enter it. */
export function bury(run: RunState, end: GameState): RunState {
  const { army, lost } = settleArmy(run.army, end);
  const dead = lost.filter((k) => k !== 'K').reverse();
  const s = statsOf(run);
  return { ...run, army, formation: undefined, graveyard: [...dead, ...(run.graveyard ?? [])].slice(0, G.size), stats: { ...s, lost: s.lost + lost.length } };
}

export const recoverPrice = (k: Kind) => (G.prices as Record<string, number>)[k] ?? Infinity;
/** Recovering restores a piece you owned, so it's allowed in Set runs too; it only needs gold and room. */
export const canRecover = (run: RunState, i: number) => {
  const k = run.graveyard?.[i];
  return !!k && run.gold >= recoverPrice(k) && run.army.length < pieceCap(run);
};

export function recover(run: RunState, i: number): RunState {
  if (!canRecover(run, i)) throw new Error('Cannot recover that piece');
  const k = run.graveyard![i];
  return { ...run, gold: run.gold - recoverPrice(k), army: [...run.army, k], formation: undefined, graveyard: run.graveyard!.filter((_, j) => j !== i) };
}
