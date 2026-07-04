import { describe, it, expect } from 'vitest';
import {
  Vector3,
  createBody,
  euler,
  semiImplicitEuler,
  leapfrog,
  rk4,
  linearMomentum,
  totalEnergy,
  type IntegratorFn,
  type Body,
} from '../physics';
import { twoBodyCircular, circularPeriod, separation } from './helpers';

const G = 1;
const M = 1;
const m = 1e-3;
const r = 1;
const T = circularPeriod(G, M, m, r);

function energyDrift(bodies: Body[], e0: number, soft: number): number {
  return Math.abs(totalEnergy(bodies, G, soft) - e0) / Math.abs(e0);
}

describe('integrators: linear momentum conservation', () => {
  const cases: Array<[string, IntegratorFn]> = [
    ['euler', euler],
    ['semiImplicitEuler', semiImplicitEuler],
    ['leapfrog', leapfrog],
    ['rk4', rk4],
  ];

  it.each(cases)('%s keeps total momentum ~0 over 5000 steps', (_name, integrate) => {
    const bodies = twoBodyCircular(G, M, m, r); // launched in the COM frame ⇒ P = 0
    const p0 = linearMomentum(bodies);
    const dt = T / 400;
    for (let i = 0; i < 5000; i++) integrate(bodies, dt, G, 0);
    const p = linearMomentum(bodies);
    // Internal, equal-and-opposite forces conserve momentum to round-off for
    // every integrator here (Σ mᵢaᵢ = 0 at each evaluation).
    expect(p.distanceTo(p0)).toBeLessThan(1e-9);
  });
});

describe('integrators: two-body circular orbit stays bounded (Leapfrog)', () => {
  it('keeps the separation within a few percent over 20 periods', () => {
    const bodies = twoBodyCircular(G, M, m, r);
    const dt = T / 500;
    const steps = Math.round((20 * T) / dt);

    let minSep = Infinity;
    let maxSep = -Infinity;
    for (let i = 0; i < steps; i++) {
      leapfrog(bodies, dt, G, 0);
      const s = separation(bodies[0], bodies[1]);
      minSep = Math.min(minSep, s);
      maxSep = Math.max(maxSep, s);
    }
    expect(minSep).toBeGreaterThan(0.97 * r);
    expect(maxSep).toBeLessThan(1.03 * r);
  });
});

describe('integrators: Leapfrog beats Euler on long-term energy drift', () => {
  it('has dramatically smaller energy drift than explicit Euler', () => {
    const dt = T / 300;
    const steps = Math.round((30 * T) / dt); // ~30 orbits

    const eulerBodies = twoBodyCircular(G, M, m, r);
    const leapBodies = twoBodyCircular(G, M, m, r);
    const e0 = totalEnergy(eulerBodies, G, 0);

    for (let i = 0; i < steps; i++) {
      euler(eulerBodies, dt, G, 0);
      leapfrog(leapBodies, dt, G, 0);
    }

    const eulerDrift = energyDrift(eulerBodies, e0, 0);
    const leapDrift = energyDrift(leapBodies, e0, 0);

    // Explicit Euler visibly pumps energy in; Leapfrog stays bounded & tiny.
    expect(leapDrift).toBeLessThan(eulerDrift);
    expect(eulerDrift).toBeGreaterThan(10 * leapDrift);
    expect(leapDrift).toBeLessThan(0.02);
  });
});

describe('integrators: RK4 short-term two-body accuracy', () => {
  it('returns near the start after one orbit with tiny energy error', () => {
    const bodies = twoBodyCircular(G, M, m, r);
    const rel0 = bodies[1].position.sub(bodies[0].position);
    const e0 = totalEnergy(bodies, G, 0);

    const dt = T / 2000;
    const steps = Math.round(T / dt);
    for (let i = 0; i < steps; i++) rk4(bodies, dt, G, 0);

    // After one full period the relative position should return to itself.
    const rel = bodies[1].position.sub(bodies[0].position);
    expect(rel.distanceTo(rel0)).toBeLessThan(0.01 * r);

    // Short-term energy error is minuscule (RK4's strength).
    expect(energyDrift(bodies, e0, 0)).toBeLessThan(1e-4);
  });

  it('holds the orbital radius steady across the orbit', () => {
    const bodies = twoBodyCircular(G, M, m, r);
    const dt = T / 2000;
    const steps = Math.round(T / dt);
    let minSep = Infinity;
    let maxSep = -Infinity;
    for (let i = 0; i < steps; i++) {
      rk4(bodies, dt, G, 0);
      const s = separation(bodies[0], bodies[1]);
      minSep = Math.min(minSep, s);
      maxSep = Math.max(maxSep, s);
    }
    expect(maxSep - minSep).toBeLessThan(0.01 * r);
  });
});

describe('integrators: locked bodies never move', () => {
  it('holds a locked body fixed while others orbit it', () => {
    const star = createBody({ mass: 1, position: new Vector3(0, 0, 0), locked: true });
    const planet = createBody({
      mass: 1e-3,
      position: new Vector3(1, 0, 0),
      velocity: new Vector3(0, 1, 0),
    });
    const bodies = [star, planet];
    for (let i = 0; i < 1000; i++) rk4(bodies, 1e-3, G, 0);
    expect(star.position.length()).toBe(0);
    expect(star.velocity.length()).toBe(0);
    expect(planet.position.length()).toBeGreaterThan(0);
  });
});
