import tuning from '../data/tuning.json';
import { at, forward, inBounds } from '../rules/board';
import type { Hook, Move, Sq } from '../rules/types';

const [lo, hi] = tuning.courts.arena.center;
export const inCenter = (s: Sq) => s.r >= lo && s.r <= hi && s.c >= lo && s.c <= hi;

/** Court: a king or pawn standing on the 4 center squares moves 1 extra square. */
export const arena: Hook = {
  id: 'arena', name: 'Arena', desc: 'Kings and pawns on the 4 center squares move 1 extra square.',
  onMoveGen: ({ state, piece, from }, moves) => {
    if (!inCenter(from) || (piece.kind !== 'K' && piece.kind !== 'P')) return moves;
    const extra: Move[] = [];
    const dirs = piece.kind === 'K' ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[forward(piece.side), 0]];
    for (const [dr, dc] of dirs) {
      const mid = { r: from.r + dr, c: from.c + dc };
      const to = { r: from.r + 2 * dr, c: from.c + 2 * dc };
      if (!inBounds(to) || at(state.board, mid)) continue;
      const t = at(state.board, to);
      if (t?.side === piece.side || (piece.kind === 'P' && t)) continue;
      extra.push({ from, to, capture: !!t, tag: 'arena' });
    }
    return [...moves, ...extra];
  },
};
