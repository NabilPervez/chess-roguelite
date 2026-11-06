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

export function Fight({ initial, title, seed, onEnd, onProgress }: { initial: GameState; title: string; seed: number; onEnd: (won: boolean, goldEarned: number) => void; onProgress?: (g: GameState) => void }) {
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
  return (
    <main className="shell">
      <span className="eyebrow">{title}{game.aiElo ? ` · Enemy ~${game.aiElo} Elo` : ''}</span>
      <section className="hud" aria-live="polite">
        <div className="stat"><span className="eyebrow">Objective</span>
          {game.checkmate ? <><b>Mate</b><small>trap the king</small></> : kingHunt ? <><b>King</b><small>capture it</small></> : <><b>{Math.min(game.progress, game.capturesToWin)}/{game.capturesToWin}</b><small>captures</small></>}</div>
        <div className="stat"><span className="eyebrow">Turns left</span><b className={turnsLeft <= 5 ? 'warn' : ''}>{turnsLeft}</b><small>of {game.turnLimit}</small></div>
        <div className="stat"><span className="eyebrow">To move</span><b>{game.turn === 'player' ? 'You' : 'Enemy'}</b><small className={checked ? 'warn' : ''} title={`Enemy rating ${game.aiElo ?? ''}`}>{checked ? 'in check!' : game.turn === 'enemy' ? 'thinking…' : 'tap a piece'}</small></div>
      </section>
      <div className="rules">
        {court && <span className="chip court-chip">{COURT_ICON[court.id]} {court.name}: {court.desc}</span>}
        {game.playerPassives.map((id) => <span key={id} className="chip">✦ {PASSIVES[id].name}: {PASSIVES[id].desc}</span>)}
        {[...new Set(Object.values(game.tiles ?? {}))].map((t) => <span key={t} className="chip tile-chip">{TILE_INFO[t as TileKind].icon} {TILE_INFO[t as TileKind].name}: {TILE_INFO[t as TileKind].desc}</span>)}
        {game.enemyPassives.map((id) => <span key={id} className="chip enemy-chip">☠ Enemy {PASSIVES[id].name}: {PASSIVES[id].desc.replace(/\bYour\b/g, 'Their').replace(/\byour\b/g, 'their')}</span>)}
      </div>
      <Board game={game} sel={sel} moves={moves} onTap={tap} />
      <p className="legend"><i className="dot move" /> move <i className="dot cap" /> capture <i className="dot tag" /> passive or court</p>
      <ol className="log">{game.log.slice(-4).reverse().map((l, i) => <li key={i}>{l}</li>)}</ol>
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

export const COURT_ICON: Record<string, string> = { mud: '⛰', ice: '❄', arena: '◎' };
