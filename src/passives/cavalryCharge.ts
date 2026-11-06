import { at } from '../rules/board';
import { jumps, KNIGHT } from '../rules/moves';
import type { Hook, Move } from '../rules/types';

/** A knight's first move may chain two jumps (the middle square must be empty). */
export const cavalryCharge: Hook = {
  id: 'cavalryCharge', name: 'Cavalry Charge', desc: 'A knight’s first move can be two jumps in one turn.',
  onMoveGen: ({ state, piece, from }, moves) => {
    if (piece.kind !== 'N' || piece.moved) return moves;
    const extra: Move[] = [];
    for (const m of moves) {
      if (m.capture) continue;
      for (const m2 of jumps(state.board, piece, m.to, KNIGHT)) {
        if (m2.to.r === from.r && m2.to.c === from.c) continue;
        if (at(state.board, m2.to)?.id === piece.id) continue;
        extra.push({ from, to: m2.to, capture: m2.capture, tag: 'charge' });
      }
    }
    return [...moves, ...extra];
  },
};
