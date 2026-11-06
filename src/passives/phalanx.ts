import { at } from '../rules/board';
import type { Hook } from '../rules/types';

/** Pawns beside (left/right) a friendly pawn can't be captured. */
export const phalanx: Hook = {
  id: 'phalanx', name: 'Phalanx', desc: 'Pawns standing beside a friendly pawn can’t be captured.',
  canBeCaptured: (state, target, sq) => {
    if (target.kind !== 'P') return true;
    return ![-1, 1].some((dc) => {
      const n = at(state.board, { r: sq.r, c: sq.c + dc });
      return n?.kind === 'P' && n.side === target.side;
    });
  },
};
