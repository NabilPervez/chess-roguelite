import type { Hook } from '../rules/types';

/** Rooks ignore any move-distance cap (counters Mud). */
export const sapper: Hook = {
  id: 'sapper', name: 'Sapper', desc: 'Your rooks ignore move-distance limits (like Mud).',
  moveCap: (p, cap) => (p.kind === 'R' ? Infinity : cap),
};
