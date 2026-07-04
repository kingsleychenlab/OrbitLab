import { Vector3 } from './Vector3';
import type { Body } from './Body';

/**
 * Newtonian gravity with Plummer softening.
 *
 * The acceleration on body i is the sum over every other body j:
 *
 *        →      →        (r_j − r_i)
 *        a_i =  Σ  G m_j ─────────────────────
 *              j≠i       (|r_j − r_i|² + ε²)^(3/2)
 *
 * Softening ε removes the 1/r² singularity: as r → 0 the denominator tends to
 * ε³ (finite) instead of 0, so a very close approach yields a large but finite
 * acceleration rather than NaN/Infinity. With ε = 0 this is exact Newtonian
 * gravity.
 *
 * The double loop is written with Newton's third law: each unordered pair {i,j}
 * is visited once and contributes equal-and-opposite terms to a_i and a_j
 * (scaled by the OTHER body's mass). That halves the work and guarantees the
 * acceleration field is momentum-consistent by construction.
 *
 * This is the only place the force law lives. Integrators call it; they never
 * re-derive gravity themselves.
 */
export function accelerationsFromState(
  positions: readonly Vector3[],
  masses: readonly number[],
  G: number,
  softening: number,
): Vector3[] {
  const n = positions.length;
  const acc: Vector3[] = new Array(n);
  for (let i = 0; i < n; i++) acc[i] = Vector3.zero();

  const eps2 = softening * softening;

  for (let i = 0; i < n; i++) {
    const pi = positions[i];
    const ai = acc[i];
    for (let j = i + 1; j < n; j++) {
      const pj = positions[j];

      const dx = pj.x - pi.x;
      const dy = pj.y - pi.y;
      const dz = pj.z - pi.z;

      // (|r|² + ε²) and its ^(-3/2) — computed once and shared by both bodies.
      const distSq = dx * dx + dy * dy + dz * dz + eps2;
      const invDist = 1 / Math.sqrt(distSq);
      const invDist3 = invDist / distSq; // (distSq)^(-3/2)

      // a_i gets +G·m_j·d/|d|³ ; a_j gets −G·m_i·d/|d|³  (equal & opposite force)
      const si = G * masses[j] * invDist3;
      const sj = G * masses[i] * invDist3;

      ai.x += dx * si;
      ai.y += dy * si;
      ai.z += dz * si;

      const aj = acc[j];
      aj.x -= dx * sj;
      aj.y -= dy * sj;
      aj.z -= dz * sj;
    }
  }

  return acc;
}

/** Convenience wrapper reading positions/masses straight off Body objects. */
export function computeAccelerations(
  bodies: readonly Body[],
  G: number,
  softening: number,
): Vector3[] {
  const n = bodies.length;
  const positions: Vector3[] = new Array(n);
  const masses: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    positions[i] = bodies[i].position;
    masses[i] = bodies[i].mass;
  }
  return accelerationsFromState(positions, masses, G, softening);
}

/**
 * The gravitational force vector ON body `a` DUE TO body `b`:
 *
 *        →          m_a m_b
 *        F_ab = G ───────────── (r_b − r_a)
 *                 |r_b − r_a|³
 *
 * Provided mainly for documentation and unit tests (Newton's third law:
 * F_ab = −F_ba). The engine itself integrates accelerations, not forces.
 * `softening` defaults to 0 so this matches the exact inverse-square law.
 */
export function pairwiseForce(a: Body, b: Body, G: number, softening = 0): Vector3 {
  const d = b.position.sub(a.position);
  const distSq = d.lengthSq() + softening * softening;
  const invDist = 1 / Math.sqrt(distSq);
  const invDist3 = invDist / distSq;
  return d.scale(G * a.mass * b.mass * invDist3);
}
