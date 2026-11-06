import tuning from '../data/tuning.json';
import { PASSIVES } from '../passives';
import { eloForNode } from '../ai/elo';
import type { FightOpts } from '../rules/board';
import type { Kind, ObjectiveKind } from '../rules/types';
import { findNode, generateMap, type MapNode, type RunMap } from './map';
import { RELIC_IDS, RELICS, type RelicId } from './relics';
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
  /** Draft grows the army from rewards; Set starts with a fixed army and never gains pieces. */
  mode: RunMode;
  /** One-shot relics waiting for the next fight. */
  relics?: string[];
  /** Army size cap; bought up in shops. */
  pieceCap?: number;
  /** Shop item kept for the next shop. */
  locked?: ShopItem | null;
}

export type RunMode = 'draft' | 'set';
export const SETS = tuning.run.sets as Record<string, { name: string; desc: string; army: string[]; passive: string }>;

export type Reward = { type: 'passive'; id: string } | { type: 'piece'; kind: Kind } | { type: 'gold'; amount: number };

export function newRun(seed: number, startPassive: string): RunState {
  return {
    seed, map: generateMap(mulberry32(seed)), at: null, army: [...tuning.run.startArmy] as Kind[],
    passives: [startPassive], gold: 0, status: 'map', fightsWon: 0, mode: 'draft',
  };
}

/** Set mode: a prebuilt army plus its signature passive. */
export function newSetRun(seed: number, setId: string): RunState {
  const set = SETS[setId];
  if (!set) throw new Error(`Unknown set ${setId}`);
  return { ...newRun(seed, set.passive), army: [...set.army] as Kind[], mode: 'set' };
}

export const pieceCap = (run: RunState) => run.pieceCap ?? tuning.run.pieceCap;
export const canGainPieces = (run: RunState) => run.mode !== 'set' && run.army.length < pieceCap(run);

export const startingPassiveChoices = (rand: Rand) => sample(rand, Object.keys(PASSIVES), tuning.run.startPassiveChoices);

/** Nodes the player may pick next. */
export function reachable(run: RunState): MapNode[] {
  if (!run.at) return run.map.rows[0];
  return findNode(run.map, run.at).next.map((id) => findNode(run.map, id));
}

export function fightOpts(node: MapNode, army?: Kind[]): { court: string | null; enemyPassives: string[]; opts: FightOpts } {
  if (node.type === 'boss') {
    const b = tuning.run.boss;
    return { court: node.court, enemyPassives: b.passives, opts: { enemyArmy: b.army as Kind[], capturesToWin: Infinity, turnLimit: b.turnLimit, checkmate: b.checkmate, aiElo: eloForNode(node.row, 'boss') } };
  }
  const tiers = tuning.run.enemyTiers;
  const base = Math.floor((node.row / tuning.run.rows) * tiers.length);
  if (node.type === 'elite') {
    const e = tuning.run.elite;
    const enemyArmy = tiers[Math.min(tiers.length - 1, base + e.tierBoost)] as Kind[];
    const passive = e.passivePool[(node.row * 7 + node.col) % e.passivePool.length];
    return { court: node.court, enemyPassives: [passive], opts: { enemyArmy, capturesToWin: Infinity, turnLimit: e.turnLimit, checkmate: e.checkmate, aiElo: eloForNode(node.row, 'elite') } };
  }
  const enemyArmy = tiers[Math.min(tiers.length - 1, base)] as Kind[];
  const obj = nodeObjective(node, enemyArmy, army);
  return { court: node.court, enemyPassives: [], opts: { enemyArmy, ...obj, aiElo: eloForNode(node.row, 'fight') } };
}

/** Normal fights rotate objectives by map position; harder ones unlock higher up and targets scale with the row. */
export function nodeObjective(node: Pick<MapNode, 'row' | 'col'>, enemyArmy: Kind[], army: Kind[] = ['P']): { objective: ObjectiveKind; capturesToWin: number; turnLimit: number } {
  const O = tuning.objective;
  const unlock = O.unlockRow as Record<string, number>;
  const pool = (O.pool as ObjectiveKind[]).filter((k) => node.row >= unlock[k] && (k !== 'breakthrough' || army.includes('P')));
  const kind = pool[(node.row * 5 + node.col * 3) % pool.length];
  const vals = O.materialValues as Record<string, number>;
  const turnLimit = O.turnLimit;
  const step = (c: { base: number; perRows: number }) => c.base + Math.floor(node.row / c.perRows);
  switch (kind) {
    case 'material': return { objective: kind, turnLimit, capturesToWin: Math.min(step(O.material), enemyArmy.reduce((n, k) => n + (vals[k] ?? 0), 0)) };
    case 'officers': {
      const officers = enemyArmy.filter((k) => k !== 'K' && k !== 'P').length;
      if (officers) return { objective: kind, turnLimit, capturesToWin: Math.min(step(O.officers), officers) };
      return { objective: 'captures', turnLimit, capturesToWin: Math.min(step(O.captures), enemyArmy.length - 1) };
    }
    case 'breakthrough': return { objective: kind, turnLimit, capturesToWin: O.breakthrough.target };
    case 'regicide': return { objective: kind, turnLimit: turnLimit + O.regicide.turnBonus, capturesToWin: Infinity };
    default: return { objective: 'captures', turnLimit, capturesToWin: Math.min(step(O.captures), enemyArmy.length - 1) };
  }
}


/** Three distinct reward offers. Elites offer passives first and bonus gold. */
export function rollRewards(run: RunState, rand: Rand, elite = false): Reward[] {
  const unowned = Object.keys(PASSIVES).filter((id) => !run.passives.includes(id));
  const out: Reward[] = [];
  if (elite) {
    for (const id of sample(rand, unowned, 2)) out.push({ type: 'passive', id });
    out.push({ type: 'gold', amount: tuning.run.rewardGold + tuning.run.elite.goldBonus });
    return out;
  }
  if (unowned.length) out.push({ type: 'passive', id: pick(rand, unowned) });
  if (canGainPieces(run)) out.push({ type: 'piece', kind: pick(rand, tuning.run.rewardPieces) as Kind });
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
  if (r.type === 'piece') return !canGainPieces(run) ? run : { ...run, army: [...run.army, r.kind] };
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

// ---------- Shop ----------
export type ShopItem =
  | { type: 'passive'; id: string; price: number }
  | { type: 'piece'; kind: Kind; price: number }
  | { type: 'remove'; price: number }
  | { type: 'relic'; id: RelicId; price: number };

export function rollShop(run: RunState, rand: Rand): ShopItem[] {
  const s = tuning.run.shop;
  const prices = s.piecePrices as Record<string, number>;
  const lock = run.locked ?? null;
  const unowned = Object.keys(PASSIVES).filter((id) => !run.passives.includes(id) && !(lock?.type === 'passive' && lock.id === id));
  const items: ShopItem[] = [
    ...(run.mode === 'set' ? [] : sample(rand, Object.keys(prices), s.pieceOffers)).map((k) => ({ type: 'piece' as const, kind: k as Kind, price: prices[k] })),
    ...sample(rand, unowned, s.passiveOffers).map((id) => ({ type: 'passive' as const, id, price: s.passivePrice })),
    ...sample(rand, RELIC_IDS, s.relicOffers).map((id) => ({ type: 'relic' as const, id, price: RELICS[id].price })),
    { type: 'remove', price: s.removePrice },
  ];
  return lock ? [lock, ...items] : items;
}

/** Reroll cost rises each time within one shop visit. */
export const rerollCost = (rerolls: number) => tuning.run.shop.rerollCost + rerolls * tuning.run.shop.rerollStep;

/** Pay to reroll everything except the locked item. */
export function reroll(run: RunState, rand: Rand, rerolls: number): { run: RunState; items: ShopItem[] } {
  const cost = rerollCost(rerolls);
  if (run.gold < cost) throw new Error('Not enough gold');
  const paid = { ...run, gold: run.gold - cost };
  return { run: paid, items: rollShop(paid, rand) };
}

/** Lock (or unlock with null) one item to carry into the next shop. */
export const lockItem = (run: RunState, item: ShopItem | null): RunState => ({ ...run, locked: item });

/** Price to raise the army cap by one; rises with each upgrade. */
export const capUpgradePrice = (run: RunState) => tuning.run.shop.capUpgradeBase + (pieceCap(run) - tuning.run.pieceCap) * tuning.run.shop.capUpgradeStep;
export const canUpgradeCap = (run: RunState) => run.mode !== 'set' && pieceCap(run) < tuning.run.shop.capMax;

export function upgradeCap(run: RunState): RunState {
  const price = capUpgradePrice(run);
  if (!canUpgradeCap(run)) throw new Error('Army cap maxed');
  if (run.gold < price) throw new Error('Not enough gold');
  return { ...run, gold: run.gold - price, pieceCap: pieceCap(run) + 1 };
}

/** Relics are used up at the start of the next fight. */
export const takeRelics = (run: RunState): { run: RunState; relics: string[] } => ({ run: { ...run, relics: [] }, relics: run.relics ?? [] });

/** Buy an item. Throws if unaffordable. `target` is the passive to replace (passive at cap) or remove. */
export function buy(run: RunState, item: ShopItem, target?: string): RunState {
  if (run.gold < item.price) throw new Error('Not enough gold');
  const paid = { ...run, gold: run.gold - item.price };
  if (item.type === 'remove') {
    if (!target || !run.passives.includes(target)) throw new Error('Choose a passive to remove');
    return dropPassive(paid, target);
  }
  const unlocked = run.locked && JSON.stringify(run.locked) === JSON.stringify(item) ? { ...paid, locked: null } : paid;
  if (item.type === 'relic') {
    if ((run.relics ?? []).length >= tuning.relics.max) throw new Error('Relic slots full');
    return { ...unlocked, relics: [...(run.relics ?? []), item.id] };
  }
  if (item.type === 'piece') {
    if (!canGainPieces(run)) throw new Error('Army is full');
    return { ...unlocked, army: [...unlocked.army, item.kind] };
  }
  return applyReward(unlocked, { type: 'passive', id: item.id }, target);
}

// ---------- Events ----------
export interface EventChoice { label: string; desc: string; ok: boolean }
export interface RunEvent { id: string; title: string; text: string; choices: EventChoice[] }

const EV = tuning.run.events;
export const EVENT_IDS = ['smith', 'deserter', 'shrine', 'gambler'] as const;

export function describeEvent(id: string, run: RunState): RunEvent {
  const pawn = run.army.includes('P');
  const room = canGainPieces(run);
  switch (id) {
    case 'smith': return { id, title: 'The Wandering Smith', text: 'A smith offers to reforge one of your pawns.', choices: [
      { label: `Pay ◈ ${EV.smithCost}`, desc: 'A pawn becomes a queen.', ok: pawn && run.gold >= EV.smithCost },
      { label: 'Walk on', desc: 'Nothing happens.', ok: true }] };
    case 'deserter': return { id, title: 'A Deserter', text: 'An enemy soldier wants to switch sides — or sell you his pay.', choices: [
      { label: 'Recruit him', desc: 'Gain a pawn.', ok: room },
      { label: 'Take the gold', desc: `Gain ◈ ${EV.deserterGold}.`, ok: true }] };
    case 'shrine': return { id, title: 'Forgotten Shrine', text: 'An old shrine hums with power.', choices: [
      { label: 'Pray', desc: 'Gain a random passive (if you have room).', ok: run.passives.length < tuning.passives.maxActive },
      { label: 'Loot it', desc: `Lose a pawn, gain ◈ ${EV.shrineGold}.`, ok: pawn && run.army.length > 1 }] };
    default: return { id, title: 'The Gambler', text: 'A coin spins on a crate. Heads, you double up.', choices: [
      { label: `Bet ◈ ${EV.gamblerStake}`, desc: `50%: win ◈ ${EV.gamblerStake}, else lose it.`, ok: run.gold >= EV.gamblerStake },
      { label: 'Decline', desc: 'Nothing happens.', ok: true }] };
  }
}

export const rollEvent = (rand: Rand) => pick(rand, [...EVENT_IDS]);

/** Resolve an event choice. Returns the new run and a one-line result. */
export function resolveEvent(run: RunState, id: string, choice: number, rand: Rand): { run: RunState; result: string } {
  if (!describeEvent(id, run).choices[choice]?.ok) throw new Error('Choice not available');
  if (id === 'smith') return choice === 0
    ? { run: { ...promotePawn(run, 'Q'), gold: run.gold - EV.smithCost }, result: 'Your pawn is now a queen.' }
    : { run, result: 'You walk on.' };
  if (id === 'deserter') return choice === 0
    ? { run: { ...run, army: [...run.army, 'P'] }, result: 'A pawn joins you.' }
    : { run: { ...run, gold: run.gold + EV.deserterGold }, result: `+◈ ${EV.deserterGold}` };
  if (id === 'shrine') {
    if (choice === 1) { const a = [...run.army]; a.splice(a.indexOf('P'), 1); return { run: { ...run, army: a, gold: run.gold + EV.shrineGold }, result: `A pawn is lost. +◈ ${EV.shrineGold}` }; }
    const unowned = Object.keys(PASSIVES).filter((p) => !run.passives.includes(p));
    const got = pick(rand, unowned);
    return { run: { ...run, passives: [...run.passives, got] }, result: `You gain ${PASSIVES[got].name}.` };
  }
  if (choice === 1) return { run, result: 'You keep your gold.' };
  const win = rand() < EV.gamblerWinChance;
  return { run: { ...run, gold: run.gold + (win ? EV.gamblerStake : -EV.gamblerStake) }, result: win ? `Heads! +◈ ${EV.gamblerStake}` : `Tails. −◈ ${EV.gamblerStake}` };
}
