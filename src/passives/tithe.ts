import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

const g = tuning.passives.tithe.gold;

export const tithe: Hook = {
  id: 'tithe', name: 'Tithe', desc: `Every capture you make earns ◈${g}.`,
  afterMove: (next, { captured, mover, owner }) =>
    owner === 'player' && captured && mover.side === owner ? { ...next, goldEarned: (next.goldEarned ?? 0) + g } : next,
};
