import { at, inBounds } from '../rules/board';
import type { Hook, Move } from '../rules/types';

/** Pawns may step sideways onto an empty square. */
export const skirmish: Hook = {
  id: 'skirmish', name: 'Skirmish', desc: 'Pawns can step sideways to an empty square.',
  onMoveGen: ({ state, piece, from }, moves) => {
    if (piece.kind !== 'P') return moves;
    const extra: Move[] = [];
    for (const dc of [-1, 1]) {
      const to = { r: from.r, c: from.c + dc };
      if (inBounds(to) && !at(state.board, to)) extra.push({ from, to, capture: false, tag: 'skirmish' });
    }
    return [...moves, ...extra];
  },
};
