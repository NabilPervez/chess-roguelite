import tuning from '../data/tuning.json';
import type { GameState } from '../rules/types';
import type { RunState } from './run';

/** Everything needed to resume: the run, the screen, and an in-progress fight. */
export interface SaveData {
  version: number;
  run: RunState;
  screen: unknown;
  fight?: { nodeId: string; game: GameState };
}

const KEY = tuning.save.key;

// JSON drops Infinity; encode it explicitly so king-hunt objectives survive a reload.
export const encodeSave = (d: Omit<SaveData, 'version'>): string =>
  JSON.stringify({ ...d, version: tuning.save.version }, (_k, v) => (v === Infinity ? 'Infinity' : v));

export function decodeSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw, (_k, v) => (v === 'Infinity' ? Infinity : v)) as SaveData;
    if (d.version !== tuning.save.version || !d.run?.map?.rows || !Array.isArray(d.run.army)) return null;
    if (d.run.status !== 'map') return null; // finished runs aren't resumable
    return { ...d, run: { ...d.run, mode: d.run.mode ?? 'draft' } };
  } catch {
    return null;
  }
}

export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
const store = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export const loadSave = (s = store()) => { try { return decodeSave(s?.getItem(KEY) ?? null); } catch { return null; } };
export const writeSave = (d: Omit<SaveData, 'version'>, s = store()) => { try { s?.setItem(KEY, encodeSave(d)); } catch { /* storage full or blocked */ } };
export const clearSave = (s = store()) => { try { s?.removeItem(KEY); } catch { /* ignore */ } };
