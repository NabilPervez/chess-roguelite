import type { GameState, Hook, HookSet } from '../rules/types';
import { bounty } from './bounty';
import { cavalryCharge } from './cavalryCharge';
import { arena } from './arena';
import { ice } from './ice';
import { lancer } from './lancer';
import { mud } from './mud';
import { phalanx } from './phalanx';
import { royalGuard } from './royalGuard';
import { sapper } from './sapper';
import { amazon } from './amazon';
import { fortress } from './fortress';
import { headhunter } from './headhunter';
import { outflank } from './outflank';
import { skirmish } from './skirmish';
import { zealot } from './zealot';
import { martyr } from './martyr';
import { promotionRush } from './promotionRush';
import { vengeance } from './vengeance';
import { swap } from './swap';
import { tithe } from './tithe';
import { scavenger } from './scavenger';
import { coronation } from './coronation';
import { forkStrike } from './forkStrike';
import { siegeRook } from './siegeRook';
import { caltrops } from './caltrops';
import { bulwark } from './bulwark';
import { snare } from './snare';

export const COURTS: Record<string, Hook> = { mud, ice, arena };
export const PASSIVES: Record<string, Hook> = { phalanx, cavalryCharge, royalGuard, bounty, lancer, sapper,
  outflank, zealot, fortress, headhunter, skirmish, amazon,
  martyr, promotionRush, vengeance, swap, tithe, scavenger, coronation, forkStrike, siegeRook, caltrops, bulwark, snare,
};

export const resolveHooks = (s: Pick<GameState, 'court' | 'playerPassives' | 'enemyPassives'>): HookSet => ({
  court: s.court ? COURTS[s.court] : null,
  player: s.playerPassives.map((id) => PASSIVES[id]),
  enemy: s.enemyPassives.map((id) => PASSIVES[id]),
});
