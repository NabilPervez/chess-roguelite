import { key } from '../rules/tiles';
import type { Hook } from '../rules/types';

/** Inspired by Gambonanza's rook/protective-tile gambit. */
export const bulwark: Hook = {
  id: 'bulwark', name: 'Bulwark', desc: 'Fights start with a Protective square in front of each of your rooks.',
  onSetup: (state, owner) => {
    const tiles = { ...(state.tiles ?? {}) };
    const f = owner === 'player' ? 1 : -1;
    state.board.forEach((row, r) => row.forEach((p, c) => {
      const t = { r: r + f, c };
      if (p?.side === owner && p.kind === 'R' && t.r >= 0 && t.r < state.board.length && !tiles[key(t)]) tiles[key(t)] = 'protective';
    }));
    return { ...state, tiles };
  },
};
