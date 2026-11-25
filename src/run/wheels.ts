import tuning from '../data/tuning.json';
import type { Kind } from '../rules/types';
import type { Rand } from './rng';
import { pieceCap, type RunState } from './run';

const W = tuning.wheels;
const KINDS = Object.keys(W.weights) as Kind[];

/** Reel weights for a map row: pawns thin out and officers get likelier as you climb. */
export function wheelWeights(row: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of KINDS) out[k] = Math.max(1, (W.weights as Record<string, number>)[k] + (W.rowShift as Record<string, number>)[k] * row);
  return out;
}

/** One spin: `reels` weighted picks. The result is fixed before the animation, so a seed replays exactly. */
export function spin(rand: Rand, row = 0): Kind[] {
  const w = wheelWeights(row);
  const total = KINDS.reduce((n, k) => n + w[k], 0);
  return Array.from({ length: W.reels }, () => {
    let x = rand() * total;
    for (const k of KINDS) { x -= w[k]; if (x < 0) return k; }
    return KINDS[KINDS.length - 1];
  });
}

export const isTriple = (reels: Kind[]) => reels.length > 1 && reels.every((k) => k === reels[0]);

/** Opening army: your King plus every reel of every opening spin. No free pawns. */
export const openingArmy = (spins: Kind[][]): Kind[] => ['K', ...spins.flat()];
export const openingSpins = (seedRand: (i: number) => Rand): Kind[][] => Array.from({ length: W.openingSpins }, (_, i) => spin(seedRand(i), 0));

/** Reward wheel: keep the reel you pick; three of a kind keeps all three (as many as fit). */
export function takeWheel(run: RunState, reels: Kind[], pick: number): RunState {
  const room = pieceCap(run) - run.army.length;
  if (room <= 0) return run;
  const gain = isTriple(reels) ? reels.slice(0, room) : [reels[pick]].filter(Boolean);
  return { ...run, army: [...run.army, ...gain], formation: undefined };
}
