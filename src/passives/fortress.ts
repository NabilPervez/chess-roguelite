import { N } from '../rules/board';
import type { Hook } from '../rules/types';

/** Rooks on their own back rank can't be captured. */
export const fortress: Hook = {
  id: 'fortress', name: 'Fortress', desc: 'Your rooks can’t be captured while on your back rank.',
  canBeCaptured: (_s, target, sq) => target.kind !== 'R' || sq.r !== (target.side === 'player' ? 0 : N - 1),
};
