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

export const COURTS: Record<string, Hook> = { mud, ice, arena };
export const PASSIVES: Record<string, Hook> = { phalanx, cavalryCharge, royalGuard, bounty, lancer, sapper };

export const resolveHooks = (s: Pick<GameState, 'court' | 'playerPassives' | 'enemyPassives'>): HookSet => ({
  court: s.court ? COURTS[s.court] : null,
  player: s.playerPassives.map((id) => PASSIVES[id]),
  enemy: s.enemyPassives.map((id) => PASSIVES[id]),
});
