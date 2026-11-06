import tuning from '../data/tuning.json';

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const KEY = tuning.onboarding.key;

export const hasOnboarded = (s: Store | null = store()): boolean => { try { return s?.getItem(KEY) === '1'; } catch { return false; } };
export const markOnboarded = (s: Store | null = store()): void => { try { s?.setItem(KEY, '1'); } catch { /* storage blocked: tutorial shows again next time */ } };
