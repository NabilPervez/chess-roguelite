import tuning from '../data/tuning.json';
import { jumps, KNIGHT } from '../rules/moves';
import type { Hook } from '../rules/types';

const min = tuning.passives.silverFork.minTargets;

/** Inspired by Gambonanza's knight-fork gambit, made deterministic: once per fight a fork steals a tempo. */
export const forkStrike: Hook = {
  id: 'forkStrike', name: 'Fork Strike', desc: `Once per fight, a knight move that attacks ${min}+ enemies skips their turn.`,
  afterMove: (next, { move, mover, owner }) => {
    if (mover.side !== owner || mover.kind !== 'N' || next.status !== 'playing' || next.used?.includes(`fork:${owner}`)) return next;
    const hits = jumps(next.board, mover, move.to, KNIGHT).filter((m) => m.capture).length;
    if (hits < min) return next;
    return { ...next, turn: owner, used: [...(next.used ?? []), `fork:${owner}`], log: [...next.log, 'Fork Strike! Their turn is skipped.'] };
  },
};
