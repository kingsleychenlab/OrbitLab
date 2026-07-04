import { euler } from './euler';
import { semiImplicitEuler } from './semiImplicitEuler';
import { leapfrog } from './leapfrog';
import { rk4 } from './rk4';
import type { IntegratorFn, IntegratorName } from './types';

export type { IntegratorFn, IntegratorName } from './types';
export { euler, semiImplicitEuler, leapfrog, rk4 };

export interface IntegratorInfo {
  name: IntegratorName;
  label: string;
  /** Formal order of accuracy (local truncation error ~ Δt^(order+1)). */
  order: number;
  /** Symplectic methods have bounded long-term energy error. */
  symplectic: boolean;
  /** Force evaluations per step (a cost proxy). */
  forceEvals: number;
  /** One-line summary shown in the UI. */
  summary: string;
  fn: IntegratorFn;
}

/**
 * Registry consumed by the integrator selector and the accuracy comparison.
 * Ordered from least to most sophisticated.
 */
export const INTEGRATORS: Record<IntegratorName, IntegratorInfo> = {
  euler: {
    name: 'euler',
    label: 'Explicit Euler',
    order: 1,
    symplectic: false,
    forceEvals: 1,
    summary: 'Baseline only — pumps energy in, orbits spiral out.',
    fn: euler,
  },
  semiImplicitEuler: {
    name: 'semiImplicitEuler',
    label: 'Semi-implicit Euler',
    order: 1,
    symplectic: true,
    forceEvals: 1,
    summary: 'Euler–Cromer. Symplectic; bounded error, cheap.',
    fn: semiImplicitEuler,
  },
  leapfrog: {
    name: 'leapfrog',
    label: 'Velocity Verlet (Leapfrog)',
    order: 2,
    symplectic: true,
    forceEvals: 2,
    summary: 'Default. Symplectic + reversible → stable long-term orbits.',
    fn: leapfrog,
  },
  rk4: {
    name: 'rk4',
    label: 'Runge–Kutta 4',
    order: 4,
    symplectic: false,
    forceEvals: 4,
    summary: 'Best short-term accuracy; secular energy drift over long runs.',
    fn: rk4,
  },
};

export const INTEGRATOR_LIST: IntegratorInfo[] = [
  INTEGRATORS.euler,
  INTEGRATORS.semiImplicitEuler,
  INTEGRATORS.leapfrog,
  INTEGRATORS.rk4,
];

export function getIntegrator(name: IntegratorName): IntegratorFn {
  return INTEGRATORS[name].fn;
}
