import { COURTS } from '../passives';
import type { MapNode } from '../run/map';
import type { RunState } from '../run/run';
import { reachable } from '../run/run';
import { COURT_ICON } from './Fight';

const SPECIAL: Record<string, [string, string]> = { boss: ['♛', 'Boss'], rest: ['☾', 'Rest'], shop: ['◈', 'Shop'], event: ['?', 'Event'] };
export const nodeLabel = (n: MapNode) => SPECIAL[n.type]?.[1] ?? (n.type === 'elite' ? `Elite · ${COURTS[n.court!].name}` : COURTS[n.court!].name);
const icon = (n: MapNode) => SPECIAL[n.type]?.[0] ?? (n.type === 'elite' ? '☠' : COURT_ICON[n.court!]);

const ROW_H = 68; // px per map row (layout only, not game tuning)

/** Map with connector lines. Rows render bottom (row 1) to top (boss). */
export function MapView({ run, onPick }: { run: RunState; onPick: (n: MapNode) => void }) {
  const open = new Set(reachable(run).map((n) => n.id));
  const curRow = run.at ? Number(run.at.split('-')[0]) : -1;
  const rows = run.map.rows;
  const H = rows.length * ROW_H;
  const pos = (n: MapNode) => ({ x: ((n.col + 0.5) / rows[n.row].length) * 100, y: H - (n.row + 0.5) * ROW_H });
  const byId = new Map(rows.flat().map((n) => [n.id, n]));

  return (
    <div className="map" style={{ height: H }} aria-label="Run map">
      <svg className="map-lines" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {rows.flat().flatMap((n) => n.next.map((id) => {
          const a = pos(n), b = pos(byId.get(id)!);
          const live = run.at === n.id && open.has(id);
          const past = n.row < curRow;
          return <line key={`${n.id}>${id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={live ? 'live' : past ? 'past' : ''} vectorEffect="non-scaling-stroke" />;
        }))}
      </svg>
      {rows.map((row) => <span key={row[0].row} className="row-num" style={{ top: H - (row[0].row + 0.5) * ROW_H }}>{row[0].row + 1}</span>)}
      {rows.flat().map((n) => {
        const can = open.has(n.id);
        const { x, y } = pos(n);
        return (
          <button key={n.id} disabled={!can} onClick={() => onPick(n)} style={{ left: `${x}%`, top: y }}
            className={`node ${n.type} ${can ? 'open' : ''} ${run.at === n.id ? 'here' : ''} ${n.row <= curRow && run.at !== n.id ? 'past' : ''}`}
            aria-label={`Row ${n.row + 1}: ${nodeLabel(n)}${can ? ', available' : ''}`}>
            <span className="node-icon">{icon(n)}</span><span className="node-label">{nodeLabel(n).replace('Elite · ', '')}</span>
          </button>
        );
      })}
    </div>
  );
}
