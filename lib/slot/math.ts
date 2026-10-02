import {SlotConfig} from "./types";
type Dist = Record<string, number>;
const dist = (strip: string[]): Dist => {
  const d: Dist = {};
  for (const s of strip) d[s] = (d[s] ?? 0) + 1 / strip.length;
  return d;
};
export interface MathReport {
  theoreticalRtp: number;
  baseRtp: number;
  featureRtp: number;
  scatterTriggerProbability: number;
}
function lineEV(c: SlotConfig): number {
  const ds = c.reels.map(r => dist(r.strip));
  const wild = c.symbols.find(s => s.type === "wild")?.id;
  const ids = c.symbols.map(s => s.id);
  let ev = 0;
  function walk(i: number, seq: string[], p: number) {
    if (i === ds.length) {
      let target = seq[0];
      if (wild && target === wild) target = seq.find(s => s !== wild) ?? wild;
      let n = 0;
      for (const s of seq) {
        if (s === target || s === wild) n++;
        else break;
      }
      if (n >= 3) ev += p * (c.paytable[target]?.[String(n)] ?? 0);
      return;
    }
    for (const id of ids) {
      const q = ds[i][id] ?? 0;
      if (q) walk(i + 1, [...seq, id], p * q);
    }
  }
  walk(0, [], 1);
  return ev;
}
function scatter(c: SlotConfig) {
  const p = c.reels.map(r => dist(r.strip)[c.freeSpins.triggerSymbol] ?? 0);
  let out = 0;
  function w(i: number, n: number, q: number) {
    if (i === p.length) {
      if (n >= c.freeSpins.triggerCount) out += q;
      return;
    }
    w(i + 1, n + 1, q * p[i]);
    w(i + 1, n, q * (1 - p[i]));
  }
  w(0, 0, 1);
  return out;
}
export function calculateMath(c: SlotConfig): MathReport {
  const base = (lineEV(c) * c.paylines.length) / c.betPerSpin;
  const trigger = c.freeSpins.enabled ? scatter(c) : 0;
  const feature = c.freeSpins.enabled
    ? trigger * c.freeSpins.spinsAwarded * base * c.freeSpins.multiplier
    : 0;
  return {
    theoreticalRtp: base + feature,
    baseRtp: base,
    featureRtp: feature,
    scatterTriggerProbability: trigger,
  };
}
