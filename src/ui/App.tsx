import { useEffect, useRef, useState, type ReactNode } from 'react';
import tuning from '../data/tuning.json';
import { COURTS, PASSIVES, resolveHooks } from '../passives';
import { newGame } from '../rules/board';
import { setupFight } from '../rules/game';
import { applyRelics, RELICS, type RelicId } from '../run/relics';
import { seedTiles } from '../rules/tiles';
import type { TileKind } from '../rules/types';
import type { Kind } from '../rules/types';
import type { MapNode } from '../run/map';
import { mulberry32 } from '../run/rng';
import { applyReward, buy, canGainPieces, canUpgradeCap, capUpgradePrice, lockItem, pieceCap, reroll, rerollCost, upgradeCap, describeEvent, dropPassive, fightOpts, newRun, newSetRun, promotePawn, resolveEvent, rollEvent, rollRewards, rollShop, SETS, startingPassiveChoices, type Reward, type RunMode, type RunState, type ShopItem } from '../run/run';
import { clearSave, loadSave, writeSave } from '../run/save';
import type { GameState } from '../rules/types';
import { COURT_ICON, Fight } from './Fight';
import { MapView } from './MapView';
import { applySettings, loadSettings, saveSettings, type Settings } from './settings';
import { SettingsPanel } from './SettingsPanel';
import { buildRunShareText, smsHref, whatsappHref } from './share';

type Screen = { kind: 'start' } | { kind: 'map' } | { kind: 'fight'; node: MapNode } | { kind: 'boss'; node: MapNode } | { kind: 'reward'; offers: Reward[] } | { kind: 'rest' } | { kind: 'shop'; items: ShopItem[]; bought: number[]; rerolls: number } | { kind: 'event'; id: string; result?: string } | { kind: 'end' };
const PIECE: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const PIECE_NAME: Record<string, string> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };

export function App() {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [screen, setScreen] = useState<Screen>({ kind: 'start' });
  const [run, setRun] = useState<RunState | null>(null);
  const [replacing, setReplacing] = useState<Reward | null>(null);
  const [shopPick, setShopPick] = useState<{ item: ShopItem; i: number } | null>(null);
  const rand = useRef(mulberry32(seed));
  const [choices, setChoices] = useState(() => startingPassiveChoices(mulberry32(seed)));
  const [mode, setMode] = useState<RunMode>('draft');
  const [saved, setSaved] = useState(() => loadSave());
  const fightRef = useRef<{ nodeId: string; game: GameState } | undefined>(undefined);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [prefersDark, setPrefersDark] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { applySettings(settings); saveSettings(settings); }, [settings, prefersDark]);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setPrefersDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const gear = (
    <>
      <div className="topbar"><button className="gear" aria-label="Settings" onClick={() => setShowSettings(true)}>⚙</button></div>
      {showSettings && <SettingsPanel value={settings} prefersDark={prefersDark} onChange={setSettings} onClose={() => setShowSettings(false)} />}
    </>
  );
  useEffect(() => { rand.current = mulberry32(seed); setChoices(startingPassiveChoices(mulberry32(seed))); }, [seed]);

  // Autosave after every step of a live run; a finished run clears the save.
  const persist = (r: RunState | null, sc: Screen) => {
    if (!r || sc.kind === 'start') return;
    if (r.status !== 'map' || sc.kind === 'end') { clearSave(); return; }
    writeSave({ run: r, screen: sc, fight: sc.kind === 'fight' ? fightRef.current : undefined });
  };
  useEffect(() => persist(run, screen), [run, screen]);
  // Every screen opens at the top (map scrolls itself to the open row).
  useEffect(() => { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; if (screen.kind !== 'map') window.scrollTo(0, 0); }, [screen.kind]);

  const begin = (r: RunState) => { fightRef.current = undefined; setRun(r); setScreen({ kind: 'map' }); };
  const resume = () => {
    if (!saved) return;
    rand.current = mulberry32(saved.run.seed + saved.run.fightsWon * 7919 + saved.run.gold);
    fightRef.current = saved.fight;
    setSeed(saved.run.seed); setRun(saved.run); setScreen(saved.screen as Screen); setSaved(null);
  };

  const top = (eyebrow: string, title: string, extra?: ReactNode) => (
    <header className="screen-top">
      <div className="screen-head"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>
      {extra}
      {run && <span className="gold-pill">◈ {run.gold}</span>}
      <button className="sq-btn" aria-label="Settings" onClick={() => setShowSettings(true)}>⚙</button>
      {showSettings && <SettingsPanel value={settings} prefersDark={prefersDark} onChange={setSettings} onClose={() => setShowSettings(false)} />}
    </header>
  );
  const army = run && (
    <div className="army" aria-label="Your army">
      <span className="army-pcs">{run.army.map((k, i) => <span key={i} title={PIECE_NAME[k]} className="pc player small">{PIECE[k]}</span>)}</span>
      <span className="army-meta">{run.army.length}/{pieceCap(run)}</span>
    </div>
  );
  const passiveChips = run && run.passives.length > 0 && (
    <ul className="kit" aria-label="Your passives">
      {run.passives.map((id) => <li key={id}><span className="kit-ic" aria-hidden="true">✦</span><span><b>{PASSIVES[id].name}</b><small>{PASSIVES[id].desc}</small></span></li>)}
    </ul>
  );

  if (screen.kind === 'start') return (
    <main className="shell">
      {gear}
      <header className="hero"><span className="eyebrow">Chess roguelite · Act 1</span><h1>Gambit Spire.</h1><p>Climb fifteen rows. Draft pieces and passives. <span>Checkmate the Regent.</span></p></header>
      {saved && (
        <section className="card">
          <span className="eyebrow">Run in progress</span>
          <p>Row {saved.run.at ? Number(saved.run.at.split('-')[0]) + 1 : 1} · {saved.run.fightsWon} fights won · ◈ {saved.run.gold}</p>
          <div className="row">
            <button className="primary" onClick={resume}>Continue run</button>
            <button className="ghost" onClick={() => { clearSave(); setSaved(null); }}>Abandon</button>
          </div>
        </section>
      )}
      <section className="card">
        <span className="eyebrow">Army mode</span>
        <div className="passive-grid">
          <button className={`passive${mode === 'draft' ? ' on' : ''}`} aria-pressed={mode === 'draft'} onClick={() => setMode('draft')}><strong>Draft</strong><span>Start with a king and 4 pawns. Win pieces as you climb.</span></button>
          <button className={`passive${mode === 'set' ? ' on' : ''}`} aria-pressed={mode === 'set'} onClick={() => setMode('set')}><strong>Set</strong><span>A fixed prebuilt army with a signature passive. No new pieces.</span></button>
        </div>
      </section>
      {mode === 'draft' ? (
        <section className="card">
          <span className="eyebrow">Pick a starting passive</span>
          <div className="passive-grid one">
            {choices.map((id) => (
              <button key={id} className="passive" onClick={() => begin(newRun(seed, id))}>
                <strong><i className="ic" aria-hidden="true">✦</i>{PASSIVES[id].name}</strong><span>{PASSIVES[id].desc}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="card">
          <span className="eyebrow">Pick a set</span>
          <div className="passive-grid one">
            {Object.entries(SETS).map(([id, set]) => (
              <button key={id} className="passive" onClick={() => begin(newSetRun(seed, id))}>
                <strong>{set.name} <span className="set-army">{set.army.map((k) => PIECE[k]).join('')}</span></strong>
                <span>{set.desc} Starts with ✦ {PASSIVES[set.passive].name}.</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );

  if (!run) return null;

  if (screen.kind === 'map') return (
    <main className="shell map-screen">
      {top(`Act 1 · row ${run.at ? Number(run.at.split('-')[0]) + 2 : 1} of ${tuning.run.rows}`, 'The Spire')}
      {army}
      {passiveChips}
      <details className="legend-box"><summary>Map key</summary>
        <ul className="legend">{Object.values(COURTS).map((c) => <li key={c.id}><i>{COURT_ICON[c.id]}</i><span><b>{c.name}</b><small>{c.desc}</small></span></li>)}
          <li><i className="d">☠</i><span><b>Elite</b><small>Checkmate a stronger army with a passive.</small></span></li>
          <li><i className="a">◈</i><span><b>Shop</b><small>Spend gold on pieces, passives and relics.</small></span></li>
          <li><i>?</i><span><b>Event</b><small>A choice with a risk.</small></span></li>
          <li><i>☾</i><span><b>Rest</b><small>Promote a pawn or drop a passive.</small></span></li>
          <li><i className="d">♛</i><span><b>Boss</b><small>The Iron Regent. Checkmate to win.</small></span></li></ul>
      </details>
      <MapView run={run} onPick={(n) => {
        setRun({ ...run, at: n.id });
        if (n.type === 'rest') setScreen({ kind: 'rest' });
        else if (n.type === 'shop') setScreen({ kind: 'shop', items: rollShop(run, rand.current), bought: [], rerolls: 0 });
        else if (n.type === 'event') setScreen({ kind: 'event', id: rollEvent(rand.current) });
        else if (n.type === 'boss') setScreen({ kind: 'boss', node: n });
        else { fightRef.current = undefined; setScreen({ kind: 'fight', node: n }); }
      }} />
    </main>
  );

  if (screen.kind === 'boss') {
    const b = tuning.run.boss;
    const court = screen.node.court ? COURTS[screen.node.court] : null;
    return (
      <main className="shell">
        {top('Final fight · checkmate to win', b.name)}
        <section className="card"><p>{b.blurb}</p></section>
        <section className="card">
          <span className="eyebrow">Boss passives</span>
          <div className="rules">
            {b.passives.map((id) => <span key={id} className="chip enemy-chip">☠ {PASSIVES[id].name}: {PASSIVES[id].desc}</span>)}
            {court && <span className="chip court-chip">{COURT_ICON[court.id]} {court.name}: {court.desc}</span>}
          </div>
        </section>
        {army}
        <button className="primary" onClick={() => { fightRef.current = undefined; setScreen({ kind: 'fight', node: screen.node }); }}>Face the Regent</button>
      </main>
    );
  }

  if (screen.kind === 'fight') {
    const { court, enemyPassives, opts } = fightOpts(screen.node, run.army);
    const resumed = fightRef.current?.nodeId === screen.node.id ? fightRef.current.game : null;
    const fresh = () => {
      const g = newGame(court, run.passives, enemyPassives, { ...opts, playerArmy: run.army });
      const n = screen.node.type === 'fight' ? tuning.tiles.perFight : tuning.tiles.elitePerFight;
      const seeded = seedTiles(g, mulberry32(seed + screen.node.row * 131 + screen.node.col * 17), n, tuning.tiles.pool as TileKind[]);
      return applyRelics(setupFight(seeded, resolveHooks(seeded)), run.relics ?? []);
    };
    const initial = resumed ?? fresh();
    const node = screen.node;
    return <Fight key={node.id} initial={initial} gold={run.gold} floor={{ row: node.row, rows: tuning.run.rows }} seed={seed + node.row * 31 + node.col + (resumed?.turnNumber ?? 0)}
      title={node.type === 'boss' ? `Boss · ${tuning.run.boss.name} — checkmate` : node.type === 'elite' ? `Row ${node.row + 1} · Elite — checkmate` : `Row ${node.row + 1} · Fight`}
      onProgress={(game) => { fightRef.current = { nodeId: node.id, game }; if (game.turn === 'player') persist(run, screen); }}
      onEnd={(won, earned) => {
        fightRef.current = undefined;
        if (!won) { setRun({ ...run, relics: [], status: 'lost' }); setScreen({ kind: 'end' }); return; }
        const r = { ...run, relics: [], fightsWon: run.fightsWon + 1, gold: run.gold + earned };
        if (screen.node.type === 'boss') { setRun({ ...r, status: 'won' }); setScreen({ kind: 'end' }); return; }
        setRun(r); setScreen({ kind: 'reward', offers: rollRewards(r, rand.current, screen.node.type === 'elite') });
      }} />;
  }

  if (screen.kind === 'reward') return (
    <main className="shell">
      {top('Victory', 'Choose a reward.')}
      {army}
      {!replacing ? (<>
        <div className="reward-grid">
          {screen.offers.map((o, i) => (
            <button key={i} className={`reward r-${o.type}`} onClick={() => {
              if (o.type === 'passive' && run.passives.length >= tuning.passives.maxActive) { setReplacing(o); return; }
              setRun(applyReward(run, o)); setScreen({ kind: 'map' });
            }}>
              <span className="art" aria-hidden="true">{o.type === 'passive' ? '✦' : o.type === 'piece' ? PIECE[o.kind] : '◈'}</span>
              <span className="reward-body">
                <span className="eyebrow">{o.type === 'passive' ? 'Passive' : o.type === 'piece' ? 'Piece' : 'Gold'}</span>
                <strong>{o.type === 'passive' ? PASSIVES[o.id].name : o.type === 'piece' ? PIECE_NAME[o.kind] : `+${o.amount} gold`}</strong>
                <small>{o.type === 'passive' ? PASSIVES[o.id].desc : o.type === 'piece' ? `Joins your army (${run.army.length}/${pieceCap(run)}).` : `You'll have ◈ ${run.gold + o.amount} for the next shop.`}</small>
              </span>
            </button>
          ))}
        </div>
        <button className="ghost skip" onClick={() => setScreen({ kind: 'map' })}>Skip reward</button>
      </>) : (
        <section className="card">
          <span className="eyebrow">You can hold {tuning.passives.maxActive} passives — replace one</span>
          <div className="passive-grid one">
            {run.passives.map((id) => (
              <button key={id} className="passive" onClick={() => { setRun(applyReward(run, replacing, id)); setReplacing(null); setScreen({ kind: 'map' }); }}>
                <strong>Drop {PASSIVES[id].name}</strong><span>{PASSIVES[id].desc}</span>
              </button>
            ))}
            <button className="ghost" onClick={() => setReplacing(null)}>Back</button>
          </div>
        </section>
      )}
    </main>
  );

  if (screen.kind === 'shop') {
    const { items, bought, rerolls } = screen;
    const purchase = (it: ShopItem, i: number, target?: string) => {
      setRun(buy(run, it, target)); setShopPick(null); setScreen({ ...screen, bought: [...bought, i] });
    };
    const relicsFull = (run.relics ?? []).length >= tuning.relics.max;
    const blocked = (it: ShopItem) => (it.type === 'piece' && !canGainPieces(run)) || (it.type === 'remove' && !run.passives.length) || (it.type === 'relic' && relicsFull);
    const needsTarget = (it: ShopItem) => it.type === 'remove' || (it.type === 'passive' && run.passives.length >= tuning.passives.maxActive);
    const isLocked = (it: ShopItem) => !!run.locked && JSON.stringify(run.locked) === JSON.stringify(it);
    const cost = rerollCost(rerolls);
    const card = (it: ShopItem, i: number) => {
      const sold = bought.includes(i);
      const off = sold || run.gold < it.price || blocked(it);
      const head = it.type === 'piece' ? { icon: PIECE[it.kind], name: PIECE_NAME[it.kind], desc: `Joins army (${run.army.length}/${pieceCap(run)})` }
        : it.type === 'passive' ? { icon: '✦', name: PASSIVES[it.id].name, desc: PASSIVES[it.id].desc }
        : it.type === 'relic' ? { icon: RELICS[it.id].icon, name: RELICS[it.id].name, desc: RELICS[it.id].desc }
        : { icon: '✂', name: 'Remove a passive', desc: 'Clear a slot.' };
      return (
        <div key={i} className={`shop-card ${it.type}${sold ? ' sold' : ''}`}>
          <button className="shop-buy" disabled={off} onClick={() => (needsTarget(it) ? setShopPick({ item: it, i }) : purchase(it, i))}
            aria-label={`Buy ${head.name} for ${it.price} gold`}>
            <span className="art" aria-hidden="true">{head.icon}</span><b>{head.name}</b><small>{head.desc}</small>
            <span className="price-tag">{sold ? 'Sold' : `◈ ${it.price}`}</span>
          </button>
          {!sold && it.type !== 'remove' && <button className={`lock${isLocked(it) ? ' on' : ''}`} aria-pressed={isLocked(it)} aria-label={isLocked(it) ? `Unlock ${head.name}` : `Lock ${head.name} for the next shop`}
            onClick={() => setRun(lockItem(run, isLocked(it) ? null : it))}>{isLocked(it) ? '◉' : '○'}</button>}
        </div>
      );
    };
    const group = (t: ShopItem['type'][], label: string) => {
      const list = items.map((it, i) => [it, i] as const).filter(([it]) => t.includes(it.type));
      return list.length ? <section className="shop-sec"><span className="eyebrow">{label}</span><div className={`shop-grid ${t[0]}`}>{list.map(([it, i]) => card(it, i))}</div></section> : null;
    };
    return (
      <main className="shop-screen">
        <header className="fight-top"><button className="sq-btn" aria-label="Leave shop" onClick={() => setScreen({ kind: 'map' })}>‹</button><h1 className="shop-title">Shop</h1><span className="gold-pill">◈ {run.gold}</span></header>
        <div className="army" aria-label="Your army">{run.army.map((k, i) => <span key={i} title={PIECE_NAME[k]} className="pc player small">{PIECE[k]}</span>)}
          <span className="gold">{run.army.length}/{pieceCap(run)}{(run.relics ?? []).length ? ` · ${(run.relics ?? []).map((r) => RELICS[r as RelicId].icon).join('')}` : ''}</span></div>
        {!shopPick ? (<>
          <div className="shop-bar"><span className="eyebrow">Locked items stay for the next shop</span>
            <button className="reroll" disabled={run.gold < cost} onClick={() => { const out = reroll(run, rand.current, rerolls); setRun(out.run); setScreen({ kind: 'shop', items: out.items, bought: [], rerolls: rerolls + 1 }); }}>↻ Reroll <span>◈{cost}</span></button></div>
          <div className="shop-body">
            {group(['piece'], 'Pieces')}
            {group(['passive'], 'Passives')}
            {group(['relic', 'remove'], `Relics · one-shot (${(run.relics ?? []).length}/${tuning.relics.max})`)}
            {canUpgradeCap(run) && <section className="cap-card"><div><span className="eyebrow">Army size</span><b>{pieceCap(run)} → {pieceCap(run) + 1}</b></div>
              <button disabled={run.gold < capUpgradePrice(run)} onClick={() => setRun(upgradeCap(run))}>Upgrade <span>◈{capUpgradePrice(run)}</span></button></section>}
          </div>
          <button className="primary next" onClick={() => setScreen({ kind: 'map' })}>Next!</button>
        </>) : (
          <section className="card">
            <span className="eyebrow">{shopPick.item.type === 'remove' ? 'Remove which passive?' : `You can hold ${tuning.passives.maxActive} passives — replace one`}</span>
            <div className="passive-grid one">
              {run.passives.map((id) => (
                <button key={id} className="passive" onClick={() => purchase(shopPick.item, shopPick.i, id)}>
                  <strong>Drop {PASSIVES[id].name}</strong><span>{PASSIVES[id].desc}</span>
                </button>
              ))}
              <button className="ghost" onClick={() => setShopPick(null)}>Back</button>
            </div>
          </section>
        )}
      </main>
    );
  }

  if (screen.kind === 'event') {
    const ev = describeEvent(screen.id, run);
    return (
      <main className="shell">
        {top('Event', ev.title)}
        {army}
        <section className="card"><p>{ev.text}</p></section>
        {screen.result ? (
          <>
            <p className="toast" role="status">{screen.result}</p>
            <button className="primary" onClick={() => setScreen({ kind: 'map' })}>Continue</button>
          </>
        ) : (
          <div className="passive-grid one">
            {ev.choices.map((c, i) => (
              <button key={i} className="passive" disabled={!c.ok} onClick={() => {
                const out = resolveEvent(run, ev.id, i, rand.current);
                setRun(out.run); setScreen({ ...screen, result: out.result });
              }}><strong>{c.label}</strong><span>{c.desc}</span></button>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (screen.kind === 'rest') {
    const hasPawn = run.army.includes('P');
    const done = (r: RunState) => { setRun(r); setScreen({ kind: 'map' }); };
    return (
      <main className="shell">
        {top('Rest site', 'Catch your breath.')}
        {army}
        <section className="card">
          <span className="eyebrow">Promote a pawn</span>
          <div className="passive-grid">
            {(['N', 'B', 'R'] as Kind[]).map((k) => (
              <button key={k} className="passive" disabled={!hasPawn} onClick={() => done(promotePawn(run, k))}><strong>{PIECE[k]} {PIECE_NAME[k]}</strong></button>
            ))}
          </div>
        </section>
        {run.passives.length > 0 && <section className="card">
          <span className="eyebrow">Or remove a passive</span>
          <div className="passive-grid one">
            {run.passives.map((id) => <button key={id} className="passive" onClick={() => done(dropPassive(run, id))}><strong>Drop {PASSIVES[id].name}</strong></button>)}
          </div>
        </section>}
        <button className="ghost" onClick={() => setScreen({ kind: 'map' })}>Leave</button>
      </main>
    );
  }

  return (
    <main className={`shell end ${run.status}`}>
      <header className="hero"><span className="eyebrow">{run.status === 'won' ? 'Act 1 cleared' : 'Run over'} · {run.mode === 'set' ? 'Set' : 'Draft'} run</span>
        <h1>{run.status === 'won' ? 'The Spire is yours.' : 'Your king has fallen.'}</h1>
        <p>{run.status === 'won' ? 'The Iron Regent is checkmated.' : `You reached row ${run.at ? Number(run.at.split('-')[0]) + 1 : 1} of ${tuning.run.rows}.`} <span>{run.status === 'won' ? 'Try a set run next.' : 'Every run teaches the map.'}</span></p></header>
      <dl className="stats">
        <div><dt>Fights won</dt><dd>{run.fightsWon}</dd></div>
        <div><dt>Row reached</dt><dd>{run.at ? Number(run.at.split('-')[0]) + 1 : 1}<small>/{tuning.run.rows}</small></dd></div>
        <div><dt>Army</dt><dd>{run.army.length}</dd></div>
        <div><dt>Gold</dt><dd className="g">◈ {run.gold}</dd></div>
      </dl>
      <section><span className="eyebrow">Final army</span>{army}</section>
      {passiveChips && <section><span className="eyebrow">Passives</span>{passiveChips}</section>}
      {(() => {
        const text = buildRunShareText({ won: run.status === 'won', row: run.at ? Number(run.at.split('-')[0]) + 1 : 1, rows: tuning.run.rows, fightsWon: run.fightsWon, gold: run.gold, passives: run.passives.map((id) => PASSIVES[id].name) });
        return (
          <section className="share" aria-label="Share your run"><span className="eyebrow">Share your run</span>
            <div className="share-row">
              <a className="share-btn" href={smsHref(text)}>Text</a>
              <a className="share-btn wa" href={whatsappHref(text)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </section>
        );
      })()}
      <button className="primary" onClick={() => { clearSave(); setRun(null); setSeed(Date.now() % 100000); setScreen({ kind: 'start' }); }}>New run</button>
    </main>
  );
}
