import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove, objectiveLabel } from '../src/rules/game';
import { resolveHooks } from '../src/passives';
import { nodeObjective } from '../src/run/run';
import tuning from '../src/data/tuning.json';
import type { GameState, Kind, ObjectiveKind, Side } from '../src/rules/types';

function setup(objective: ObjectiveKind, target: number, pieces: [Side, Kind, number, number][], passives: string[] = []): GameState {
  const s = newGame(null, passives, [], { capturesToWin: target, objective });
  s.board = emptyBoard();
  for (const [side, k, r, c] of pieces) s.board[r][c] = makePiece(side, k);
  return s;
}
const mv = (s: GameState, fr: number, fc: number, tr: number, tc: number) => applyMove(s, { from: { r: fr, c: fc }, to: { r: tr, c: tc }, capture: false }, resolveHooks(s));
const kings: [Side, Kind, number, number][] = [['player', 'K', 0, 0], ['enemy', 'K', 5, 5]];

describe('objectives', () => {
  it('Material counts piece value', () => {
    const s = mv(setup('material', 5, [...kings, ['player', 'R', 0, 3], ['enemy', 'N', 4, 3]]), 0, 3, 4, 3);
    expect(s.progress).toBe(3);
  });
  it('Officers ignore pawns', () => {
    const s = mv(setup('officers', 1, [...kings, ['player', 'R', 0, 3], ['enemy', 'P', 4, 3]]), 0, 3, 4, 3);
    expect(s.progress).toBe(0);
    expect(s.status).toBe('playing');
  });
  it('Officers win on a non-pawn capture', () => {
    const s = mv(setup('officers', 1, [...kings, ['player', 'R', 0, 3], ['enemy', 'B', 4, 3]]), 0, 3, 4, 3);
    expect(s.status).toBe('won');
  });
  it('Breakthrough wins on promotion', () => {
    const s = mv(setup('breakthrough', 1, [...kings, ['player', 'P', 4, 2]]), 4, 2, 5, 2);
    expect(s.status).toBe('won');
  });
  it('Capture-worth passives only boost plain capture fights', () => {
    const s = mv(setup('material', 20, [...kings, ['player', 'P', 3, 2], ['enemy', 'P', 4, 3]], ['bounty']), 3, 2, 4, 3);
    expect(s.progress).toBe(1);
  });
  it('labels read cleanly', () => {
    expect(objectiveLabel({ objective: 'breakthrough', capturesToWin: 1 })).toBe('promote a pawn');
    expect(objectiveLabel({ objective: 'captures', capturesToWin: Infinity })).toBe('capture the king');
  });
});

describe('objective rotation', () => {
  const army: Kind[] = ['K', 'P', 'P', 'P', 'P', 'P', 'N', 'B'];
  it('first rows only use basic objectives', () => {
    for (let c = 0; c < 4; c++) expect(['captures', 'material']).toContain(nodeObjective({ row: 0, col: c }, army).objective);
  });
  it('higher rows mix several objectives and scale captures', () => {
    const kinds = new Set<string>();
    for (let r = 5; r < 14; r++) for (let c = 0; c < 4; c++) kinds.add(nodeObjective({ row: r, col: c }, army, ['K', 'P']).objective);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    const caps = nodeObjective({ row: 10, col: 0 }, ['K', ...Array(12).fill('P')] as Kind[]);
    if (caps.objective === 'captures') expect(caps.capturesToWin).toBeGreaterThan(tuning.objective.captures.base);
  });
  it('no breakthrough without pawns', () => {
    for (let r = 3; r < 14; r++) for (let c = 0; c < 4; c++) expect(nodeObjective({ row: r, col: c }, army, ['K', 'N']).objective).not.toBe('breakthrough');
  });
});
