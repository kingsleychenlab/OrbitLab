import { Vector3 } from '../Vector3';
import { accelerationsFromState } from '../gravity';
import type { IntegratorFn } from './types';

/**
 * Classic 4th-order Runge–Kutta applied to the first-order system
 *
 *     dr/dt = v
 *     dv/dt = a(r)          (a depends on positions only; masses are constant)
 *
 * For state y = (r, v) with derivative f(y) = (v, a(r)) the RK4 step is the
 * usual weighted average of four slope samples k1..k4:
 *
 *     k1 = f(y)
 *     k2 = f(y + ½Δt·k1)
 *     k3 = f(y + ½Δt·k2)
 *     k4 = f(y +  Δt·k3)
 *     y_{t+Δt} = y + (Δt/6)(k1 + 2k2 + 2k3 + k4)
 *
 * RK4 has the smallest LOCAL error of the methods here, so it wins short-term
 * accuracy comparisons. But it is NOT symplectic: on a Hamiltonian orbital
 * system its energy error accumulates secularly, so over very long runs bound
 * orbits slowly gain or lose energy and spiral. See README, "Integrators".
 *
 * Locked bodies are pinned: their position slope is forced to zero and their
 * final state is not written, so they stay fixed while still contributing to
 * every acceleration evaluation.
 */
export const rk4: IntegratorFn = (bodies, dt, G, softening) => {
  const n = bodies.length;
  const masses: number[] = new Array(n);
  const locked: boolean[] = new Array(n);
  const p0: Vector3[] = new Array(n);
  const v0: Vector3[] = new Array(n);
  for (let i = 0; i < n; i++) {
    masses[i] = bodies[i].mass;
    locked[i] = bodies[i].locked;
    p0[i] = bodies[i].position.clone();
    v0[i] = bodies[i].velocity.clone();
  }

  // Position slope k_r is the velocity (zero for locked bodies so they never
  // move during the intermediate evaluations).
  const posSlope = (vel: Vector3[]): Vector3[] =>
    vel.map((v, i) => (locked[i] ? Vector3.zero() : v.clone()));

  // Shift a base state by `c·dt·slope` to build an intermediate sample point.
  const shift = (base: Vector3[], slope: Vector3[], c: number): Vector3[] =>
    base.map((b, i) => b.add(slope[i].scale(c * dt)));

  // --- k1: slopes at the start of the step ---
  const k1r = posSlope(v0);
  const k1v = accelerationsFromState(p0, masses, G, softening);

  // --- k2: slopes at the half-step using k1 ---
  const p2 = shift(p0, k1r, 0.5);
  const v2 = shift(v0, k1v, 0.5);
  const k2r = posSlope(v2);
  const k2v = accelerationsFromState(p2, masses, G, softening);

  // --- k3: slopes at the half-step using k2 ---
  const p3 = shift(p0, k2r, 0.5);
  const v3 = shift(v0, k2v, 0.5);
  const k3r = posSlope(v3);
  const k3v = accelerationsFromState(p3, masses, G, softening);

  // --- k4: slopes at the full step using k3 ---
  const p4 = shift(p0, k3r, 1.0);
  const v4 = shift(v0, k3v, 1.0);
  const k4r = posSlope(v4);
  const k4v = accelerationsFromState(p4, masses, G, softening);

  // Combine: y += (Δt/6)(k1 + 2k2 + 2k3 + k4).
  const sixth = dt / 6;
  for (let i = 0; i < n; i++) {
    if (locked[i]) continue;
    const b = bodies[i];
    b.position.set(
      p0[i].x + sixth * (k1r[i].x + 2 * k2r[i].x + 2 * k3r[i].x + k4r[i].x),
      p0[i].y + sixth * (k1r[i].y + 2 * k2r[i].y + 2 * k3r[i].y + k4r[i].y),
      p0[i].z + sixth * (k1r[i].z + 2 * k2r[i].z + 2 * k3r[i].z + k4r[i].z),
    );
    b.velocity.set(
      v0[i].x + sixth * (k1v[i].x + 2 * k2v[i].x + 2 * k3v[i].x + k4v[i].x),
      v0[i].y + sixth * (k1v[i].y + 2 * k2v[i].y + 2 * k3v[i].y + k4v[i].y),
      v0[i].z + sixth * (k1v[i].z + 2 * k2v[i].z + 2 * k3v[i].z + k4v[i].z),
    );
  }
};
