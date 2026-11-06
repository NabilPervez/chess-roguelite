import { jumps } from '../rules/moves';
import type { Hook } from '../rules/types';

/** Knights may also step 1 square orthogonally (move or capture). */
export const outflank: Hook = {
  id: 'outflank', name: 'Outflank', desc: 'Knights can also step 1 square straight (move or capture).',
  onMoveGen: ({ state, piece, from }, moves) =>
    piece.kind !== 'N' ? moves : [...moves, ...jumps(state.board, piece, from, [[1, 0], [-1, 0], [0, 1], [0, -1]]).map((m) => ({ ...m, tag: 'outflank' }))],
};
