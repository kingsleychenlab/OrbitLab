import { computeAccelerations } from '../gravity';
import type { IntegratorFn } from './types';

/**
 * Velocity Verlet / Leapfrog — second order, symplectic, time-reversible.
 * This is OrbitLab's default integrator.
 *
 *     r_{t+Δt} = r_t + v_t Δt + ½ a_t Δt²
 *     v_{t+Δt} = v_t + ½ (a_t + a_{t+Δt}) Δt
 *
 * It needs the acceleration at both ends of the step, so it performs TWO force
 * evaluations per step (a_t before moving, a_{t+Δt} after). Because the update
 * is symplectic and time-reversible, the total energy does not drift secularly:
 * it wobbles around the true value with an error that stays bounded even over
 * millions of steps. That is exactly the property you want for long-term
 * orbital integration, and why it — not RK4 — is the default here.
 */
export const leapfrog: IntegratorFn = (bodies, dt, G, softening) => {
  const n = bodies.length;

  // a(t) at the current positions.
  const a0 = computeAccelerations(bodies, G, softening);

  // Drift positions a full step using v_t and the half-Δt² acceleration term.
  const halfDtSq = 0.5 * dt * dt;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.locked) continue;
    b.position.addScaledInPlace(b.velocity, dt);
    b.position.addScaledInPlace(a0[i], halfDtSq);
  }

  // a(t+Δt) at the new positions.
  const a1 = computeAccelerations(bodies, G, softening);

  // Kick velocities with the average of the old and new accelerations.
  const halfDt = 0.5 * dt;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.locked) continue;
    b.velocity.addScaledInPlace(a0[i], halfDt);
    b.velocity.addScaledInPlace(a1[i], halfDt);
  }
};
