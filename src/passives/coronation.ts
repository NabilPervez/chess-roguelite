import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

const g = tuning.passives.raceFlag.gold;

/** Inspired by Gambonanza's promotion payout gambit. */
export const coronation: Hook = {
  id: 'coronation', name: 'Coronation Purse', desc: `Each pawn you promote earns ◈${g}.`,
  afterMove: (next, { promoted, mover, owner }) =>
    owner === 'player' && promoted && mover.side === owner ? { ...next, goldEarned: (next.goldEarned ?? 0) + g } : next,
};
