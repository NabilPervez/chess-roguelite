import tuning from '../src/data/tuning.json';
import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove } from '../src/rules/game';
import { legalMoves } from '../src/rules/moves';
import { PASSIVES, resolveHooks } from '../src/passives';
import { generateMap } from '../src/run/map';
import { buy, describeEvent, EVENT_IDS, fightOpts, newRun, resolveEvent, rollRewards, rollShop } from '../src/run/run';
import { mulberry32 } from '../src/run/rng';
import type { GameState, Kind, Side } from '../src/rules/types';

function setup(passives: string[], pieces: [Side, Kind, number, number][], enemyPassives: string[] = []): GameState {
  const s = newGame(null, passives, enemyPassives);
  s.board = emptyBoard();
  for (const [side, k, r, c] of pieces) s.board[r][c] = makePiece(side, k);
  return s;
}
const dests = (s: GameState, r: number, c: number) => legalMoves(s, { r, c }, resolveHooks(s)).map((m) => `${m.to.r},${m.to.c}`).sort();

describe('sprint 3 passives', () => {
  it('there are 12 passives', () => expect(Object.keys(PASSIVES)).toHaveLength(12));

  it('Outflank: knight steps 1 straight, incl. capture', () => {
    const s = setup(['outflank'], [['player', 'N', 2, 2], ['enemy', 'P', 3, 2]]);
    expect(dests(s, 2, 2)).toEqual(expect.arrayContaining(['3,2', '1,2', '2,1', '2,3']));
    expect(dests(setup([], [['player', 'N', 2, 2]]), 2, 2)).not.toContain('1,2');
  });

  it('Zealot: bishop steps straight but never captures that way', () => {
    const s = setup(['zealot'], [['player', 'B', 2, 2], ['enemy', 'P', 3, 2]]);
    const d = dests(s, 2, 2);
    expect(d).toContain('1,2');
    expect(d).not.toContain('3,2');
  });

  it('Fortress: back-rank rook is immune; off the back rank it is not', () => {
    const home = setup([], [['enemy', 'Q', 3, 0], ['player', 'R', 0, 0]], []);
    home.turn = 'enemy';
    home.playerPassives = ['fortress'];
    expect(dests(home, 3, 0)).not.toContain('0,0');
    const out = setup(['fortress'], [['enemy', 'Q', 3, 0], ['player', 'R', 1, 0]]);
    out.turn = 'enemy';
    expect(dests(out, 3, 0)).toContain('1,0');
  });

  it('Headhunter: a knight capture counts 1 + bonus, a pawn capture counts 1', () => {
    const s = setup(['headhunter'], [['player', 'R', 0, 0], ['enemy', 'N', 3, 0], ['enemy', 'K', 5, 5], ['player', 'K', 0, 5]]);
    s.capturesToWin = 99;
    expect(applyMove(s, { from: { r: 0, c: 0 }, to: { r: 3, c: 0 }, capture: true }, resolveHooks(s)).progress).toBe(1 + tuning.passives.headhunter.bonus);
    const p = setup(['headhunter'], [['player', 'R', 0, 0], ['enemy', 'P', 3, 0], ['enemy', 'K', 5, 5], ['player', 'K', 0, 5]]);
    p.capturesToWin = 99;
    expect(applyMove(p, { from: { r: 0, c: 0 }, to: { r: 3, c: 0 }, capture: true }, resolveHooks(p)).progress).toBe(1);
  });

  it('Skirmish: pawn steps sideways only onto empty squares', () => {
    const s = setup(['skirmish'], [['player', 'P', 2, 2], ['enemy', 'P', 2, 3]]);
    const d = dests(s, 2, 2);
    expect(d).toContain('2,1');
    expect(d).not.toContain('2,3');
  });

  it('Amazon: queen also jumps like a knight', () => {
    const s = setup(['amazon'], [['player', 'Q', 0, 0], ['player', 'P', 1, 0], ['player', 'P', 0, 1], ['player', 'P', 1, 1]]);
    expect(dests(s, 0, 0)).toEqual(['1,2', '2,1']);
  });
});

describe('map node types', () => {
  it('row 1 and the last two rows are plain; elites only from eliteMinRow; specials appear', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateMap(mulberry32(seed));
      m.rows[0].forEach((n) => expect(n.type).toBe('fight'));
      m.rows.at(-2)!.forEach((n) => expect(n.type).toBe('fight'));
      m.rows.flat().forEach((n) => {
        seen.add(n.type);
        if (n.type === 'elite') expect(n.row).toBeGreaterThanOrEqual(tuning.run.eliteMinRow);
        if (n.type === 'fight' || n.type === 'elite') expect(n.court).toBeTruthy();
      });
    }
    for (const t of ['fight', 'elite', 'shop', 'event', 'rest', 'boss']) expect(seen.has(t)).toBe(true);
  });
});

describe('elite', () => {
  it('is a king hunt with one enemy passive and a tougher army', () => {
    const node = { id: '6-0', row: 6, col: 0, type: 'elite' as const, court: 'mud', next: [] };
    const fight = fightOpts({ ...node, type: 'fight' });
    const elite = fightOpts(node);
    expect(elite.opts.capturesToWin).toBe(Infinity);
    expect(elite.enemyPassives).toHaveLength(1);
    expect(elite.opts.enemyArmy!.length).toBeGreaterThan(fight.opts.enemyArmy!.length);
  });
  it('rewards two passives and bonus gold', () => {
    const r = rollRewards(newRun(1, 'phalanx'), mulberry32(4), true);
    expect(r.filter((x) => x.type === 'passive')).toHaveLength(2);
    expect(r.find((x) => x.type === 'gold')).toEqual({ type: 'gold', amount: tuning.run.rewardGold + tuning.run.elite.goldBonus });
  });
});

describe('shop', () => {
  it('offers passives, pieces and a removal, and buying spends gold', () => {
    const run = { ...newRun(2, 'phalanx'), gold: 200 };
    const items = rollShop(run, mulberry32(5));
    expect(items.filter((i) => i.type === 'passive')).toHaveLength(tuning.run.shop.passiveOffers);
    expect(items.filter((i) => i.type === 'piece')).toHaveLength(tuning.run.shop.pieceOffers);
    const piece = items.find((i) => i.type === 'piece')!;
    const after = buy(run, piece);
    expect(after.gold).toBe(200 - piece.price);
    expect(after.army).toHaveLength(run.army.length + 1);
    expect(buy(run, { type: 'remove', price: 40 }, 'phalanx').passives).toEqual([]);
  });
  it('refuses when broke or the army is full', () => {
    const run = newRun(2, 'phalanx');
    expect(() => buy(run, { type: 'piece', kind: 'N', price: 40 })).toThrow();
    expect(() => buy({ ...run, gold: 999, army: Array(10).fill('P') }, { type: 'piece', kind: 'N', price: 40 })).toThrow();
  });
});

describe('events', () => {
  it('every event has 2 choices and resolves without throwing when allowed', () => {
    const run = { ...newRun(3, 'phalanx'), gold: 100 };
    for (const id of EVENT_IDS) {
      const ev = describeEvent(id, run);
      expect(ev.choices).toHaveLength(2);
      ev.choices.forEach((c, i) => c.ok && expect(resolveEvent(run, id, i, mulberry32(i)).result).toBeTruthy());
    }
  });
  it('smith turns a pawn into a queen for gold; unavailable when broke', () => {
    const run = { ...newRun(3, 'phalanx'), gold: 100 };
    const r = resolveEvent(run, 'smith', 0, mulberry32(1)).run;
    expect(r.army).toContain('Q');
    expect(r.gold).toBe(100 - tuning.run.events.smithCost);
    expect(() => resolveEvent(newRun(3, 'phalanx'), 'smith', 0, mulberry32(1))).toThrow();
  });
});
