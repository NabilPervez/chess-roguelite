import tuning from '../data/tuning.json';

export type ArtStyle = 'obsidian' | 'atlas' | 'toy';
export type ThemePref = 'light' | 'dark' | 'system';
export interface Settings { style: ArtStyle; theme: ThemePref }

export const STYLES: { id: ArtStyle; name: string; desc: string }[] = [
  { id: 'obsidian', name: 'Obsidian Court', desc: 'Dark stone, gold trim.' },
  { id: 'atlas', name: 'Gilded Atlas', desc: 'Old maps and ink.' },
  { id: 'toy', name: 'Paper Toy', desc: 'Chunky, bright tokens.' },
];
export const DEFAULT_SETTINGS: Settings = { style: 'obsidian', theme: 'system' };
const KEY = tuning.settings.key;

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** Reads settings; anything missing or invalid falls back to Obsidian Court + System. Kept apart from the run save. */
export function loadSettings(s: Store | null = store()): Settings {
  try {
    const raw = JSON.parse(s?.getItem(KEY) ?? 'null');
    return {
      style: STYLES.some((x) => x.id === raw?.style) ? raw.style : DEFAULT_SETTINGS.style,
      theme: ['light', 'dark', 'system'].includes(raw?.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(v: Settings, s: Store | null = store()): void {
  try { s?.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked: settings just won't persist */ }
}

export const resolveTheme = (t: ThemePref, prefersDark: boolean): 'light' | 'dark' => (t === 'system' ? (prefersDark ? 'dark' : 'light') : t);

const FONTS: Record<ArtStyle, () => Promise<unknown>> = {
  obsidian: () => import('@fontsource/outfit'),
  atlas: () => import('@fontsource/eb-garamond'),
  toy: () => import('@fontsource/fredoka'),
};

/** Applies style + theme to <html> and loads only the active style's font. */
export function applySettings(v: Settings): void {
  const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const el = document.documentElement;
  el.dataset.style = v.style;
  el.dataset.theme = resolveTheme(v.theme, dark);
  FONTS[v.style]().catch(() => { /* offline: fall back to system font */ });
}
