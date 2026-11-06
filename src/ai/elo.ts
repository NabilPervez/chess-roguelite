import tuning from '../data/tuning.json';

export interface AiProfile { maxElo: number; depth: number; blunder: number; noise: number }

const E = tuning.ai.elo;

/** Enemy rating for a map node: climbs each row, elites get a bump, the boss is fixed. */
export function eloForNode(row: number, type: string): number {
  if (type === 'boss') return E.boss;
  const base = E.start + row * E.perRow + (type === 'elite' ? E.eliteBonus : 0);
  return Math.max(E.min, Math.min(E.max, base));
}

/** Search depth, blunder rate and noise for a rating. */
export const profileFor = (elo: number): AiProfile =>
  (tuning.ai.profiles as AiProfile[]).find((p) => elo <= p.maxElo) ?? (tuning.ai.profiles as AiProfile[]).at(-1)!;
