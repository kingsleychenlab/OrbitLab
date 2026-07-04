import type { Body } from '../Body';

/**
 * An integrator advances the whole system by one timestep `dt`, mutating each
 * body's `position` and `velocity` in place. Bodies with `locked === true` must
 * be left untouched (they remain gravity sources but do not move).
 *
 * Keeping this a plain function — not a class or a React hook — is what makes
 * the numerical methods trivially unit-testable and swappable at runtime.
 */
export type IntegratorFn = (
  bodies: Body[],
  dt: number,
  G: number,
  softening: number,
) => void;

export type IntegratorName = 'euler' | 'semiImplicitEuler' | 'leapfrog' | 'rk4';
