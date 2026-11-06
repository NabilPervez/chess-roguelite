import { at } from '../rules/board';
import type { Hook } from '../rules/types';

/** Once per fight your king may trade places with any friendly piece. */
export const swap: Hook = {
  id: 'swap', name: 'Swap', desc: 'Once per fight, your king may trade places with any of your pieces.',
  onMoveGen: ({ state, piece, from }, moves) => {
    if (piece.kind !== 'K' || state.used?.includes(`swap:${piece.side}`)) return moves;
    const out = [...moves];
    state.board.forEach((row, r) => row.forEach((p, c) => {
      if (p && p.side === piece.side && p.id !== piece.id && !(at(state.board, { r, c })?.kind === 'K')) out.push({ from, to: { r, c }, capture: false, tag: 'swap' });
    }));
    return out;
  },
};
