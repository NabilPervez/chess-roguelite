import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

/** When one of your pawns is captured, the capturing piece sits out its next turn. */
export const martyr: Hook = {
  id: 'martyr', name: 'Martyr', desc: 'When your pawn is captured, the capturer sits out its next turn.',
  afterMove: (next, { captured, mover, owner }) =>
    captured?.kind === 'P' && captured.side === owner && next.board.flat().some((p) => p?.id === mover.id)
      ? { ...next, frozen: { ...(next.frozen ?? {}), [mover.id]: tuning.passives.martyr.freezeTurns } }
      : next,
};
