import type { Hook } from '../rules/types';

export const promotionRush: Hook = {
  id: 'promotionRush', name: 'Promotion Rush', desc: 'Your pawns promote one rank early.',
  promoteEarly: true,
};
