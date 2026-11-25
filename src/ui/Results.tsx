import type { Payout } from '../run/economy';
import tuning from '../data/tuning.json';
import { CoinBurst } from './CoinBurst';
import { Panel } from './Panel';

/** Itemized win payout. Rows reveal one by one (CSS stagger, instant under reduced motion). */
export function Results({ pay, gold, onClaim }: { pay: Payout; gold: number; onClaim: () => void }) {
  const I = tuning.economy.interest;
  const rows: [number | string, string, number][] = [
    ['✓', 'Win reward', pay.winGold],
    [pay.captured, `Captured pieces (◈${tuning.economy.perCapture} each)`, pay.captureGold],
    [pay.saved, `Pieces saved (◈${tuning.economy.perSaved} each)`, pay.savedGold],
    [pay.turnsLeft, 'Turns to spare', pay.speedGold],
  ];
  if (pay.tileGold) rows.push(['◈', 'Gold tiles', pay.tileGold]);
  if (pay.mult > 1) rows.push([`×${pay.mult}`, 'Midas Coin', 0]);
  rows.push([pay.interestGold, `Interest (◈1 per ◈${I.per} banked, max ◈${I.max})`, pay.interestGold]);
  return (
    <main className="stage">
      <span className="gold-pill corner">◈ {gold}</span>
      <CoinBurst />
      <Panel title="Results">
        <ol className="ledger">
          {rows.map(([n, label, g], i) => (
            <li key={label} style={{ animationDelay: `${i * 140}ms` }}>
              <b className="ledger-n">{n}</b><span>{label}</span><em>{g ? `◈${g}` : ''}</em>
            </li>
          ))}
        </ol>
        <button className="big-btn" onClick={onClaim}>Get my ◈{pay.total}!!</button>
      </Panel>
    </main>
  );
}
