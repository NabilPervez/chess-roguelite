import tuning from '../data/tuning.json';
import { at, inBounds } from '../rules/board';
import type { Hook, Move } from '../rules/types';

/** The king may move up to 2 squares in a straight, unblocked line. */
export const royalGuard: Hook = {
  id: 'royalGuard', name: 'Royal Stride', desc: 'Your king may move up to 2 squares in a straight line.',
  onMoveGen: ({ state, piece, from }, moves) => {
    if (piece.kind !== 'K') return moves;
    const extra: Move[] = [];
    const range = tuning.passives.royalGuard.kingRange;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let i = 2; i <= range; i++) {
        const mid = { r: from.r + dr * (i - 1), c: from.c + dc * (i - 1) };
        const to = { r: from.r + dr * i, c: from.c + dc * i };
        if (!inBounds(to) || at(state.board, mid)) break;
        const t = at(state.board, to);
        if (t?.side === piece.side) break;
        extra.push({ from, to, capture: !!t, tag: 'stride' });
        if (t) break;
      }
    }
    return [...moves, ...extra];
  },
};
