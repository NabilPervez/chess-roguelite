import tuning from '../data/tuning.json';
import { PASSIVES } from '../passives';
import type { FightOpts } from '../rules/board';
import type { Kind } from '../rules/types';
import { findNode, generateMap, type MapNode, type RunMap } from './map';
import { mulberry32, pick, sample, type Rand } from './rng';

export interface RunState {
  seed: number;
  map: RunMap;
  /** Current node id; null before the first pick. */
  at: string | null;
  army: Kind[];
  passives: string[];
  gold: number;
  status: 'map' | 'won' | 'lost';
  fightsWon: number;
}

export type Reward = { type: 'passive'; id: string } | { type: 'piece'; kind: Kind } | { type: 'gold'; amount: number };

export function newRun(seed: number, startPassive: string): RunState {
  return {
    seed, map: generateMap(mulberry32(seed)), at: null, army: [...tuning.run.startArmy] as Kind[],
    passives: [startPassive], gold: 0, status: 'map', fightsWon: 0,
  };
}

export const startingPassiveChoices = (rand: Rand) => sample(rand, Object.keys(PASSIVES), tuning.run.startPassiveChoices);

/** Nodes the player may pick next. */
export function reachable(run: RunState): MapNode[] {
  if (!run.at) return run.map.rows[0];
  return findNode(run.map, run.at).next.map((id) => findNode(run.map, id));
}

export function fightOpts(node: MapNode): { court: string | null; enemyPassives: string[]; opts: FightOpts } {
  if (node.type === 'boss') {
    return { court: node.court, enemyPassives: tuning.run.boss.passives, opts: { enemyArmy: tuning.run.boss.army as Kind[], capturesToWin: Infinity, turnLimit: tuning.run.boss.turnLimit } };
  }
  const tiers = tuning.run.enemyTiers;
  const tier = Math.min(tiers.length - 1, Math.floor((node.row / tuning.run.rows) * tiers.length));
  const enemyArmy = tiers[tier] as Kind[];
  return { court: node.court, enemyPassives: [], opts: { enemyArmy, capturesToWin: Math.min(tuning.objective.capturesToWin, enemyArmy.length - 1) } };
}

/** Three distinct reward offers. */
export function rollRewards(run: RunState, rand: Rand): Reward[] {
  const unowned = Object.keys(PASSIVES).filter((id) => !run.passives.includes(id));
  const out: Reward[] = [];
  if (unowned.length) out.push({ type: 'passive', id: pick(rand, unowned) });
  if (run.army.length < tuning.run.pieceCap) out.push({ type: 'piece', kind: pick(rand, tuning.run.rewardPieces) as Kind });
  out.push({ type: 'gold', amount: tuning.run.rewardGold });
  while (out.length < 3 && unowned.length > 1) {
    const id = pick(rand, unowned);
    if (!out.some((r) => r.type === 'passive' && r.id === id)) out.push({ type: 'passive', id });
  }
  return out;
}

/** Apply a reward. For a passive at the cap, `replace` names the passive to drop. */
export function applyReward(run: RunState, r: Reward, replace?: string): RunState {
  if (r.type === 'gold') return { ...run, gold: run.gold + r.amount };
  if (r.type === 'piece') return run.army.length >= tuning.run.pieceCap ? run : { ...run, army: [...run.army, r.kind] };
  if (run.passives.length < tuning.passives.maxActive) return { ...run, passives: [...run.passives, r.id] };
  if (!replace || !run.passives.includes(replace)) throw new Error('Passive cap reached: choose one to replace');
  return { ...run, passives: run.passives.map((p) => (p === replace ? r.id : p)) };
}

export function promotePawn(run: RunState, to: Kind): RunState {
  const i = run.army.indexOf('P');
  if (i < 0) return run;
  const army = [...run.army]; army[i] = to;
  return { ...run, army };
}

export const dropPassive = (run: RunState, id: string): RunState => ({ ...run, passives: run.passives.filter((p) => p !== id) });
