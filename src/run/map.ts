import tuning from '../data/tuning.json';
import { pick, type Rand } from './rng';

export type NodeType = 'fight' | 'rest' | 'boss';
export interface MapNode { id: string; row: number; col: number; type: NodeType; court: string | null; next: string[] }
export interface RunMap { rows: MapNode[][] }

/** Seeded branching map: rows of 2–4 nodes, every node reachable, last row is the boss. */
export function generateMap(rand: Rand): RunMap {
  const R = tuning.run.rows;
  const rows: MapNode[][] = [];
  for (let r = 0; r < R; r++) {
    const last = r === R - 1;
    const n = last ? 1 : tuning.run.minNodes + Math.floor(rand() * (tuning.run.maxNodes - tuning.run.minNodes + 1));
    rows.push(Array.from({ length: n }, (_, c) => {
      const type: NodeType = last ? 'boss' : r > 0 && r < R - 2 && rand() < tuning.run.restChance ? 'rest' : 'fight';
      return { id: `${r}-${c}`, row: r, col: c, type, court: type === 'fight' ? pick(rand, tuning.run.courts) : type === 'boss' ? tuning.run.boss.court : null, next: [] };
    }));
  }
  for (let r = 0; r < R - 1; r++) {
    const cur = rows[r], nxt = rows[r + 1];
    const pos = (i: number, len: number) => (len === 1 ? 0.5 : i / (len - 1));
    for (const node of cur) {
      const ranked = [...nxt].sort((a, b) => Math.abs(pos(a.col, nxt.length) - pos(node.col, cur.length)) - Math.abs(pos(b.col, nxt.length) - pos(node.col, cur.length)));
      node.next = ranked.slice(0, rand() < 0.5 ? 1 : 2).map((x) => x.id);
    }
    for (const t of nxt) {
      if (cur.some((n) => n.next.includes(t.id))) continue;
      const nearest = [...cur].sort((a, b) => Math.abs(pos(a.col, cur.length) - pos(t.col, nxt.length)) - Math.abs(pos(b.col, cur.length) - pos(t.col, nxt.length)))[0];
      nearest.next.push(t.id);
    }
  }
  return { rows };
}

export const findNode = (m: RunMap, id: string) => m.rows.flat().find((n) => n.id === id)!;
