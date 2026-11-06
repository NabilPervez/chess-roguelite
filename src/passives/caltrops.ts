import tuning from '../data/tuning.json';
import { N } from '../rules/board';
import { key } from '../rules/tiles';
import type { Hook } from '../rules/types';

const count = tuning.passives.makibishi.traps;

/** Inspired by Gambonanza's trap-laying gambit: traps start in front of your lines. */
export const caltrops: Hook = {
  id: 'caltrops', name: 'Caltrops', desc: `Fights start with ${count} Traps two ranks ahead of your pawns.`,
  onSetup: (state, owner) => {
    const r = owner === 'player' ? 3 : N - 4;
    const tiles = { ...(state.tiles ?? {}) };
    let placed = 0;
    for (const c of [2, 3, 1, 4, 0, 5]) {
      if (placed >= count) break;
      if (!state.board[r][c] && !tiles[key({ r, c })]) { tiles[key({ r, c })] = 'trap'; placed++; }
    }
    return { ...state, tiles };
  },
};
