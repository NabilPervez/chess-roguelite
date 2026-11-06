import type { Hook, Move } from '../rules/types';

/** Court: sliding pieces can't stop early — they slide until blocked (or capture). */
export const ice: Hook = {
  id: 'ice', name: 'Ice', desc: 'Bishops, rooks and queens slide until they hit something.',
  onMoveGen: ({ piece }, moves) => {
    if (!['B', 'R', 'Q'].includes(piece.kind)) return moves;
    const furthest = new Map<string, Move>();
    for (const m of moves) {
      const dr = Math.sign(m.to.r - m.from.r), dc = Math.sign(m.to.c - m.from.c);
      const d = Math.max(Math.abs(m.to.r - m.from.r), Math.abs(m.to.c - m.from.c));
      const key = `${dr},${dc}`;
      const cur = furthest.get(key);
      const curD = cur ? Math.max(Math.abs(cur.to.r - cur.from.r), Math.abs(cur.to.c - cur.from.c)) : -1;
      if (d > curD) furthest.set(key, m);
    }
    return [...furthest.values()];
  },
};
