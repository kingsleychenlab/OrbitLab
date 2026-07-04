import { Vector3 } from './Vector3';
import type { Body } from './Body';

/**
 * Conserved quantities and diagnostics. For an isolated system with only
 * internal gravitational forces, total energy, linear momentum and angular
 * momentum are all constants of motion. How well a numerical integrator holds
 * them constant is THE measure of its quality, which is what the Accuracy Panel
 * and the graphs visualize.
 *
 * Every function here is pure: (bodies, params) → number/vector.
 */

export function totalMass(bodies: readonly Body[]): number {
  let m = 0;
  for (const b of bodies) m += b.mass;
  return m;
}

/** Kinetic energy  K = Σ ½ m_i |v_i|². */
export function kineticEnergy(bodies: readonly Body[]): number {
  let k = 0;
  for (const b of bodies) k += 0.5 * b.mass * b.velocity.lengthSq();
  return k;
}

/**
 * Potential energy  U = − Σ_{i<j} G m_i m_j / sqrt(|r_j − r_i|² + ε²).
 *
 * The same softening ε used by the force law appears here, so that U and the
 * integrated force derive from one consistent (softened) Hamiltonian — this is
 * what lets total energy be conserved to round-off by a symplectic method.
 */
export function potentialEnergy(bodies: readonly Body[], G: number, softening: number): number {
  const eps2 = softening * softening;
  let u = 0;
  for (let i = 0; i < bodies.length; i++) {
    const bi = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const bj = bodies[j];
      const r = Math.sqrt(bi.position.distanceToSq(bj.position) + eps2);
      u -= (G * bi.mass * bj.mass) / r;
    }
  }
  return u;
}

/** Total mechanical energy  E = K + U. */
export function totalEnergy(bodies: readonly Body[], G: number, softening: number): number {
  return kineticEnergy(bodies) + potentialEnergy(bodies, G, softening);
}

/** Linear momentum  P = Σ m_i v_i. */
export function linearMomentum(bodies: readonly Body[]): Vector3 {
  const p = Vector3.zero();
  for (const b of bodies) p.addScaledInPlace(b.velocity, b.mass);
  return p;
}

/** Center of mass  R_cm = (Σ m_i r_i) / (Σ m_i). */
export function centerOfMass(bodies: readonly Body[]): Vector3 {
  const r = Vector3.zero();
  let m = 0;
  for (const b of bodies) {
    r.addScaledInPlace(b.position, b.mass);
    m += b.mass;
  }
  return m > 0 ? r.scaleInPlace(1 / m) : r;
}

/** Velocity of the center of mass  V_cm = P / M. */
export function centerOfMassVelocity(bodies: readonly Body[]): Vector3 {
  const m = totalMass(bodies);
  return m > 0 ? linearMomentum(bodies).scaleInPlace(1 / m) : Vector3.zero();
}

/** Angular momentum about the origin  L = Σ m_i (r_i × v_i). */
export function angularMomentum(bodies: readonly Body[]): Vector3 {
  const l = Vector3.zero();
  for (const b of bodies) {
    l.addScaledInPlace(b.position.cross(b.velocity), b.mass);
  }
  return l;
}

export interface Metrics {
  kinetic: number;
  potential: number;
  total: number;
  momentum: Vector3;
  angularMomentum: Vector3;
  centerOfMass: Vector3;
  centerOfMassVelocity: Vector3;
  totalMass: number;
}

/** Compute every diagnostic in one pass-friendly bundle. */
export function computeMetrics(bodies: readonly Body[], G: number, softening: number): Metrics {
  return {
    kinetic: kineticEnergy(bodies),
    potential: potentialEnergy(bodies, G, softening),
    total: totalEnergy(bodies, G, softening),
    momentum: linearMomentum(bodies),
    angularMomentum: angularMomentum(bodies),
    centerOfMass: centerOfMass(bodies),
    centerOfMassVelocity: centerOfMassVelocity(bodies),
    totalMass: totalMass(bodies),
  };
}

/**
 * Dimensionless relative drift  |current − baseline| / max(|baseline|, tiny).
 * Used for energy: drift = |E_t − E_0| / |E_0|.
 */
export function relativeDrift(current: number, baseline: number, tiny = 1e-30): number {
  return Math.abs(current - baseline) / Math.max(Math.abs(baseline), tiny);
}

/**
 * Normalized magnitude of a vector's change  |current − baseline| / scale.
 * Used for momentum and angular-momentum drift, where the baseline magnitude
 * may be ~0 (a system launched in its COM frame has P ≈ 0), so a fixed
 * characteristic `scale` is passed instead of dividing by |baseline|.
 */
export function vectorDrift(current: Vector3, baseline: Vector3, scale: number, tiny = 1e-30): number {
  return current.distanceTo(baseline) / Math.max(scale, tiny);
}
