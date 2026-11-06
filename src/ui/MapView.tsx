import { COURTS } from '../passives';
import type { MapNode } from '../run/map';
import type { RunState } from '../run/run';
import { reachable } from '../run/run';
import { COURT_ICON } from './Fight';

const label = (n: MapNode) => (n.type === 'boss' ? 'Boss' : n.type === 'rest' ? 'Rest' : COURTS[n.court!].name);
const icon = (n: MapNode) => (n.type === 'boss' ? '♛' : n.type === 'rest' ? '☾' : COURT_ICON[n.court!]);

export function MapView({ run, onPick }: { run: RunState; onPick: (n: MapNode) => void }) {
  const open = new Set(reachable(run).map((n) => n.id));
  const curRow = run.at ? Number(run.at.split('-')[0]) : -1;
  return (
    <div className="map" aria-label="Run map">
      {[...run.map.rows].reverse().map((row) => (
        <div key={row[0].row} className={`map-row ${row[0].row <= curRow ? 'past' : ''}`}>
          <span className="row-num">{row[0].row + 1}</span>
          <div className="row-nodes">
            {row.map((n) => {
              const can = open.has(n.id);
              return (
                <button key={n.id} disabled={!can} onClick={() => onPick(n)}
                  className={`node ${n.type} ${can ? 'open' : ''} ${run.at === n.id ? 'here' : ''}`}
                  aria-label={`Row ${n.row + 1}: ${label(n)}${can ? ', available' : ''}`}>
                  <span className="node-icon">{icon(n)}</span><span className="node-label">{label(n)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
