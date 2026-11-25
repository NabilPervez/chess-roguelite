export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A stable RNG for one place in a run, so the same seed always rolls the same shop, wheel or event. */
export function nodeRand(seed: number, nodeId: string, salt = ''): Rand {
  let h = seed >>> 0;
  for (const ch of `${nodeId}|${salt}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return mulberry32(h);
}
/** A fresh 32-bit run seed. */
export const newSeed = (): number => {
  try { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0]; } catch { return Math.floor(Math.random() * 2 ** 32); }
};
export type Rand = () => number;
export const pick = <T,>(r: Rand, xs: T[]): T => xs[Math.floor(r() * xs.length)];
export function sample<T>(r: Rand, xs: T[], n: number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
