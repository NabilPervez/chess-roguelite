import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

/** Court: no piece moves more than N squares in one move. */
export const mud: Hook = {
  id: 'mud', name: 'Mud', desc: `No piece moves more than ${tuning.courts.mud.maxDistance} squares per move.`,
  moveCap: (_p, cap) => Math.min(cap, tuning.courts.mud.maxDistance),
};
