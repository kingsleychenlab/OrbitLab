import { computeAccelerations } from '../gravity';
import type { IntegratorFn } from './types';

/**
 * Semi-implicit (symplectic) Euler, a.k.a. Euler–Cromer — first order.
 *
 *     v_{t+Δt} = v_t + a_t Δt
 *     r_{t+Δt} = r_t + v_{t+Δt} Δt   (position uses the NEW velocity)
 *
 * The single change from explicit Euler — advancing velocity first, then using
 * that updated velocity to advance position — makes the map symplectic. It does
 * not conserve energy exactly, but the error oscillates and stays bounded
 * instead of growing without limit, so orbits remain closed-ish for a long
 * time. A great cheap default; Leapfrog is the more accurate sibling.
 */
export const semiImplicitEuler: IntegratorFn = (bodies, dt, G, softening) => {
  const acc = computeAccelerations(bodies, G, softening);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.locked) continue;
    b.velocity.addScaledInPlace(acc[i], dt); // velocity first ...
    b.position.addScaledInPlace(b.velocity, dt); // ... then position with new v
  }
};
