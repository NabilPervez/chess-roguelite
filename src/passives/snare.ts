import { key } from '../rules/tiles';
import type { Hook } from '../rules/types';

/** Inspired by Gambonanza's lost-pawn trap gambit. */
export const snare: Hook = {
  id: 'snare', name: 'Snare', desc: 'When your pawn is captured, a Trap appears where the capturer came from.',
  afterMove: (next, { captured, move, owner }) =>
    captured?.kind === 'P' && captured.side === owner ? { ...next, tiles: { ...(next.tiles ?? {}), [key(move.from)]: 'trap' } } : next,
};
