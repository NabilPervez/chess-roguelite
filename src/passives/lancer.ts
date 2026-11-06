import { at, forward, inBounds } from '../rules/board';
import type { Hook } from '../rules/types';

/** Pawns may also capture straight ahead. */
export const lancer: Hook = {
  id: 'lancer', name: 'Lancer', desc: 'Pawns can also capture straight ahead.',
  onMoveGen: ({ state, piece, from }, moves) => {
    if (piece.kind !== 'P') return moves;
    const to = { r: from.r + forward(piece.side), c: from.c };
    const t = inBounds(to) ? at(state.board, to) : null;
    return t && t.side !== piece.side ? [...moves, { from, to, capture: true, tag: 'lance' }] : moves;
  },
};
