import { jumps } from '../rules/moves';
import type { Hook } from '../rules/types';

/** Inspired by Gambonanza's rook gambit: rooks gain a short diagonal capture. */
export const siegeRook: Hook = {
  id: 'siegeRook', name: 'Siege Rook', desc: 'Your rooks can also capture 1 square diagonally.',
  onMoveGen: ({ state, piece, from }, moves) =>
    piece.kind !== 'R' ? moves : [...moves, ...jumps(state.board, piece, from, [[1, 1], [1, -1], [-1, 1], [-1, -1]]).filter((m) => m.capture).map((m) => ({ ...m, tag: 'siege' }))],
};
