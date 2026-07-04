import type { Vector3 } from '../physics';

/** Smart scalar formatter: fixed for "normal" magnitudes, scientific for extremes. */
export function fmt(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e5 || abs < 1e-3) return x.toExponential(2);
  return trimZeros(x.toPrecision(sig + 1));
}

/** Always-scientific formatter, for drift values that span many orders. */
export function fmtSci(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  return x.toExponential(digits);
}

/** Fixed decimals with sign-safe trimming. */
export function fmtFixed(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(digits);
}

export function fmtVec(v: Vector3, sig = 2): string {
  return `${fmt(v.x, sig)}, ${fmt(v.y, sig)}, ${fmt(v.z, sig)}`;
}

/** Simulation time — the unit depends on the preset, so keep it generic. */
export function fmtTime(t: number): string {
  if (!Number.isFinite(t)) return '—';
  if (t === 0) return '0';
  if (Math.abs(t) >= 1e5 || Math.abs(t) < 1e-2) return t.toExponential(2);
  return t.toFixed(2);
}

function trimZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}
