import { jumps } from '../rules/moves';
import type { Hook } from '../rules/types';

/** Bishops may also step 1 square orthogonally, but not to capture (lets them change colour). */
export const zealot: Hook = {
  id: 'zealot', name: 'Zealot', desc: 'Bishops can also step 1 square straight (no capture).',
  onMoveGen: ({ state, piece, from }, moves) =>
    piece.kind !== 'B' ? moves : [...moves, ...jumps(state.board, piece, from, [[1, 0], [-1, 0], [0, 1], [0, -1]]).filter((m) => !m.capture).map((m) => ({ ...m, tag: 'zealot' }))],
};
