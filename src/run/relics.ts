import tuning from '../data/tuning.json';
import type { GameState } from '../rules/types';

export type RelicId = 'hourglass' | 'frost' | 'midas';
export const RELIC_IDS: RelicId[] = ['hourglass', 'frost', 'midas'];
const R = tuning.relics;
export const RELICS: Record<RelicId, { name: string; icon: string; desc: string; price: number }> = { hourglass: R.hourglass, frost: R.frost, midas: R.midas };
const VALUE: Record<string, number> = { Q: 9, R: 5, B: 3, N: 3, P: 1, K: 0 };

/** One-shot relics fire at the start of the next fight and are used up. */
export function applyRelics(game: GameState, relics: string[]): GameState {
  let g = game;
  for (const id of relics) {
    if (id === 'hourglass') g = { ...g, turnLimit: g.turnLimit + R.hourglass.turns };
    if (id === 'midas') g = { ...g, payoutMult: (g.payoutMult ?? 1) * R.midas.mult };
    if (id === 'frost') {
      const best = g.board.flat().filter((p) => p?.side === 'enemy' && p.kind !== 'K').sort((a, b) => VALUE[b!.kind] - VALUE[a!.kind])[0];
      if (best) g = { ...g, frozen: { ...(g.frozen ?? {}), [best.id]: R.frost.turns } };
    }
  }
  return relics.length ? { ...g, log: [...g.log, `Relics used: ${relics.map((r) => RELICS[r as RelicId]?.name).join(', ')}.`] } : g;
}
