import { jumps, KNIGHT } from '../rules/moves';
import type { Hook } from '../rules/types';

/** The queen may also move like a knight. */
export const amazon: Hook = {
  id: 'amazon', name: 'Amazon', desc: 'Your queen can also move like a knight.',
  onMoveGen: ({ state, piece, from }, moves) =>
    piece.kind !== 'Q' ? moves : [...moves, ...jumps(state.board, piece, from, KNIGHT).map((m) => ({ ...m, tag: 'amazon' }))],
};
