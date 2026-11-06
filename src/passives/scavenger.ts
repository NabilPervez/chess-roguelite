import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

const g = tuning.passives.bugCatcher.gold;

/** Inspired by Gambonanza's pawn-capture payout gambit. */
export const scavenger: Hook = {
  id: 'scavenger', name: 'Scavenger', desc: `Capturing an enemy pawn earns ◈${g}.`,
  afterMove: (next, { captured, mover, owner }) =>
    owner === 'player' && captured?.kind === 'P' && mover.side === owner ? { ...next, goldEarned: (next.goldEarned ?? 0) + g } : next,
};
