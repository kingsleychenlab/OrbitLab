import { computeAccelerations } from '../gravity';
import type { IntegratorFn } from './types';

/**
 * Explicit (forward) Euler — first order, NOT symplectic.
 *
 *     v_{t+Δt} = v_t + a_t Δt
 *     r_{t+Δt} = r_t + v_t Δt      (position uses the OLD velocity)
 *
 * Both updates are evaluated at time t, so the acceleration is sampled once at
 * the start of the step. It is the simplest possible scheme and is included
 * purely as a baseline: on a bound orbit it steadily injects energy, so orbits
 * visibly spiral outward within a few periods. See README, "Integrators".
 */
export const euler: IntegratorFn = (bodies, dt, G, softening) => {
  const acc = computeAccelerations(bodies, G, softening);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.locked) continue;
    // Advance position with the OLD velocity first, then update velocity.
    b.position.addScaledInPlace(b.velocity, dt);
    b.velocity.addScaledInPlace(acc[i], dt);
  }
};
