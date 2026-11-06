import tuning from '../data/tuning.json';

export interface AiProfile { maxElo: number; depth: number; blunder: number; noise: number }

const E = tuning.ai.elo;

/** Clamps a player-entered Elo floor into the allowed range; null/invalid means "no floor". */
export function clampFloor(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(E.floor.min, Math.min(E.floor.max, Math.round(n)));
}

/**
 * Enemy rating for a map node: climbs each row, elites get a bump, the boss is fixed.
 * With an Elo floor (unlocked after beating the game), row 1 starts at the floor and
 * the whole curve, boss included, shifts up by the same amount.
 */
export function eloForNode(row: number, type: string, floor: number | null = null): number {
  const f = clampFloor(floor);
  const shift = f === null ? 0 : Math.max(0, f - E.start);
  const cap = f === null ? E.max : E.floor.ceiling;
  if (type === 'boss') return Math.min(E.floor.ceiling, E.boss + shift);
  const base = E.start + shift + row * E.perRow + (type === 'elite' ? E.eliteBonus : 0);
  return Math.max(E.min, Math.min(cap, base));
}

/** Search depth, blunder rate and noise for a rating. */
export const profileFor = (elo: number): AiProfile =>
  (tuning.ai.profiles as AiProfile[]).find((p) => elo <= p.maxElo) ?? (tuning.ai.profiles as AiProfile[]).at(-1)!;
