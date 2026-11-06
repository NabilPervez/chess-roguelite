import { useEffect, useMemo, useRef, useState } from 'react';
import { chooseMoveElo } from '../ai/engine';
import tuning from '../data/tuning.json';
import { COURTS, PASSIVES, resolveHooks } from '../passives';
import { applyMove } from '../rules/game';
import { inCheck, legalMoves } from '../rules/moves';
import type { GameState, Move, Sq } from '../rules/types';
import { mulberry32 } from '../run/rng';
import { Board } from './Board';
import { CoinBurst } from './CoinBurst';
import { fightPayout } from '../run/economy';
import { TILE_INFO } from '../rules/tiles';
import type { TileKind } from '../rules/types';

export function Fight({ initial, title, seed, onEnd, onProgress, gold, floor }: { initial: GameState; title: string; seed: number; gold?: number; floor?: { row: number; rows: number }; onEnd: (won: boolean, goldEarned: number) => void; onProgress?: (g: GameState) => void }) {
  const [game, setGame] = useState(initial);
  const [sel, setSel] = useState<Sq | null>(null);
  const [started] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const rand = useRef(mulberry32(seed));
  const hooks = useMemo(() => resolveHooks(game), [game.court, game.playerPassives.join(), game.enemyPassives.join()]);
  const moves: Move[] = sel ? legalMoves(game, sel, hooks) : [];

  useEffect(() => {
    if (game.turn !== 'enemy' || game.status !== 'playing') return;
    const t = setTimeout(() => {
      const m = chooseMoveElo(game, hooks, game.aiElo ?? tuning.ai.elo.start, rand.current);
      if (m) setGame(applyMove(game, m, hooks));
    }, 380);
    return () => clearTimeout(t);
  }, [game, hooks]);

  useEffect(() => { if (game.status !== 'playing') setElapsed(Date.now() - started); }, [game.status]);
  useEffect(() => { if (game.status === 'playing') onProgress?.(game); }, [game]);
  const checked = game.checkmate && game.status === 'playing' && inCheck(game, game.turn, hooks);

  function tap(sq: Sq) {
    if (game.turn !== 'player' || game.status !== 'playing') return;
    const m = moves.find((x) => x.to.r === sq.r && x.to.c === sq.c);
    if (m) { setGame(applyMove(game, m, hooks)); setSel(null); return; }
    const p = game.board[sq.r][sq.c];
    setSel(p?.side === 'player' && !(sel && sel.r === sq.r && sel.c === sq.c) ? sq : null);
  }

  const pay = useMemo(() => (game.status === 'playing' ? null : fightPayout(initial, game)), [game.status]);
  const court = game.court ? COURTS[game.court] : null;
  const kingHunt = !isFinite(game.capturesToWin);
  const turnsLeft = game.turnLimit - game.turnNumber;
  const [openRule, setOpenRule] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const rules = ruleList(game, court);
  const enemyDesc = game.enemyPassives.length ? game.enemyPassives.map((id) => PASSIVES[id].name).join(' · ') : 'No passives';
  const intent = game.turn === 'enemy' ? 'thinking…' : checked ? 'check!' : game.checkmate ? 'guarding king' : 'hunting';
  const tipped = rules.find((r) => r.key === openRule);
  return (
    <main className="fight-screen">
      <header className="fight-top">
        <span className="eyebrow">{title}</span>
        {floor && <span className="pips" aria-label={`Row ${floor.row + 1} of ${floor.rows}`}>{[...Array(floor.rows).keys()].map((i) => <i key={i} className={i < floor.row ? 'done' : i === floor.row ? 'here' : ''} />)}</span>}
        {gold !== undefined && <span className="gold-pill">◈ {gold}</span>}
      </header>
      <section className="enemy-card" aria-label="Enemy">
        <span className="enemy-face" aria-hidden="true">♚</span>
        <div><b>Enemy{game.aiElo ? ` · ~${game.aiElo} Elo` : ''}</b><small>{enemyDesc}</small></div>
        <div className="intent"><span className="eyebrow">Intent</span><span>{intent}</span></div>
      </section>
      <section className="hud" aria-live="polite">
        <div className="stat"><span className="eyebrow">Goal</span><b>{game.checkmate ? 'Mate' : kingHunt ? 'King' : `${Math.min(game.progress, game.capturesToWin)}/${game.capturesToWin}`}</b></div>
        <div className="stat"><span className="eyebrow">Turns</span><b className={turnsLeft <= 5 ? 'warn' : ''}>{turnsLeft}<small>/{game.turnLimit}</small></b></div>
        <div className={`stat${game.turn === 'player' ? ' you' : ''}`}><span className="eyebrow">Move</span><b>{game.turn === 'player' ? (checked ? 'Check!' : 'You') : 'Enemy'}</b></div>
      </section>
      <div className="board-wrap"><Board game={game} sel={sel} moves={moves} onTap={tap} /></div>
      <div className="relic-row" role="toolbar" aria-label="Rules in play">
        {rules.map((r) => <button key={r.key} className={`relic ${r.kind}${openRule === r.key ? ' on' : ''}`} aria-label={`${r.group}: ${r.name}`} aria-pressed={openRule === r.key} onClick={() => setOpenRule(openRule === r.key ? null : r.key)}>{r.icon}</button>)}
        <button className="rules-btn" onClick={() => setDrawer(true)}>Rules · {rules.length}</button>
      </div>
      {tipped && <p className="tip" role="status"><b>{tipped.name}</b> {tipped.desc}</p>}
      <aside className={`rules-panel${drawer ? ' open' : ''}`} aria-label="Rules for this fight">
        <div className="sheet-head"><h2>This fight</h2><button className="x" aria-label="Close rules" onClick={() => setDrawer(false)}>✕</button></div>
        {['Court', 'Your passives', 'Board tiles', 'Enemy'].map((grp) => {
          const list = rules.filter((r) => r.group === grp);
          return list.length ? <div key={grp}><span className="eyebrow grp">{grp}</span>
            {list.map((r) => <div key={r.key} className="rule"><span className={`relic ${r.kind}`} aria-hidden="true">{r.icon}</span><div><b>{r.name}</b><small>{r.desc}</small></div></div>)}</div> : null;
        })}
        <ol className="log">{game.log.slice(-4).reverse().map((l, i) => <li key={i}>{l}</li>)}</ol>
      </aside>
      {drawer && <div className="sheet-scrim" onClick={() => setDrawer(false)} />}
      {game.status !== 'playing' && (
        <div className="overlay" role="dialog" aria-modal="true">
          {game.status === 'won' && <CoinBurst />}
          <div className="card result">
            <span className="eyebrow">{game.status === 'won' ? 'Victory' : 'Defeat'}</span>
            <h2>{game.status === 'won' ? 'Fight won' : 'Run over'}</h2>
            <p>{game.endReason}</p>
            {pay && game.status === 'won' && (
              <dl className="payout">
                <div><dt>Pieces saved ×{pay.saved}</dt><dd>◈{pay.savedGold}</dd></div>
                <div><dt>Pieces taken ×{pay.captured}</dt><dd>◈{pay.captureGold}</dd></div>
                <div><dt>Speed · {pay.turnsLeft} turns spare</dt><dd>◈{pay.speedGold}</dd></div>
                {(game.payoutMult ?? 1) > 1 && <div><dt>Midas Coin</dt><dd>×{game.payoutMult}</dd></div>}
                {pay.tileGold > 0 && <div><dt>Gold tiles</dt><dd>◈{pay.tileGold}</dd></div>}
                <div className="total"><dt>Total</dt><dd>◈{pay.total}</dd></div>
              </dl>
            )}
            {pay && game.status !== 'won' && pay.tileGold > 0 && <p>Earned ◈{pay.tileGold} this fight.</p>}
            <p className="meta">Fight time {Math.floor(elapsed / 60000)}m {Math.round((elapsed % 60000) / 1000)}s · {game.turnNumber} turns</p>
            <div className="row"><button className="primary" onClick={() => onEnd(game.status === 'won', pay?.total ?? 0)}>{game.status === 'won' ? 'Claim reward' : 'Continue'}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

interface Rule { key: string; group: string; kind: string; icon: string; name: string; desc: string }
function ruleList(game: GameState, court: { id: string; name: string; desc: string } | null): Rule[] {
  const out: Rule[] = [];
  if (court) out.push({ key: 'court', group: 'Court', kind: 'court', icon: COURT_ICON[court.id] ?? '◎', name: court.name, desc: court.desc });
  for (const id of game.playerPassives) out.push({ key: `p-${id}`, group: 'Your passives', kind: 'mine', icon: '✦', name: PASSIVES[id].name, desc: PASSIVES[id].desc });
  const counts: Record<string, number> = {};
  for (const t of Object.values(game.tiles ?? {})) if (t !== 'hole') counts[t] = (counts[t] ?? 0) + 1;
  for (const [t, n] of Object.entries(counts)) out.push({ key: `t-${t}`, group: 'Board tiles', kind: 'tile', icon: TILE_INFO[t as TileKind].icon, name: `${TILE_INFO[t as TileKind].name}${n > 1 ? ` ×${n}` : ''}`, desc: TILE_INFO[t as TileKind].desc });
  for (const id of game.enemyPassives) out.push({ key: `e-${id}`, group: 'Enemy', kind: 'foe', icon: '☠', name: PASSIVES[id].name, desc: PASSIVES[id].desc.replace(/\bYour\b/g, 'Their').replace(/\byour\b/g, 'their') });
  return out;
}

export const COURT_ICON: Record<string, string> = { mud: '⛰', ice: '❄', arena: '◎' };
