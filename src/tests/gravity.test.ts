import { describe, it, expect } from 'vitest';
import {
  Vector3,
  createBody,
  computeAccelerations,
  pairwiseForce,
  leapfrog,
} from '../physics';
import { allFinite } from './helpers';

const G = 1;

describe('gravity: acceleration symmetry (Newton\'s third law)', () => {
  it('produces equal-and-opposite forces between two bodies', () => {
    const a = createBody({ mass: 3, position: new Vector3(-2, 0, 0) });
    const b = createBody({ mass: 7, position: new Vector3(1, 1, 0) });
    const acc = computeAccelerations([a, b], G, 0);

    // Force on each body = mass * acceleration. They must be equal & opposite.
    const forceA = acc[0].scale(a.mass);
    const forceB = acc[1].scale(b.mass);
    expect(forceA.x).toBeCloseTo(-forceB.x, 12);
    expect(forceA.y).toBeCloseTo(-forceB.y, 12);
    expect(forceA.z).toBeCloseTo(-forceB.z, 12);
  });

  it('matches the closed-form pairwise force law', () => {
    const a = createBody({ mass: 2, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 5, position: new Vector3(4, 0, 0) });
    const acc = computeAccelerations([a, b], G, 0);

    // pairwiseForce(a, b) is the force ON a DUE TO b; a's acceleration is F/m_a.
    const fAB = pairwiseForce(a, b, G);
    expect(acc[0].x).toBeCloseTo(fAB.x / a.mass, 12);
    expect(acc[0].y).toBeCloseTo(fAB.y / a.mass, 12);

    // Analytic magnitude: G m_b / r²  along +x (b is to the right of a).
    const expected = (G * b.mass) / 16;
    expect(acc[0].x).toBeCloseTo(expected, 12);
    expect(pairwiseForce(a, b, G).x).toBeCloseTo(-pairwiseForce(b, a, G).x, 12);
  });
});

describe('gravity: softening prevents singularities', () => {
  it('stays finite for a near-coincident pair when ε > 0', () => {
    const a = createBody({ mass: 1, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 1, position: new Vector3(1e-10, 0, 0) });
    const acc = computeAccelerations([a, b], G, 1e-3);
    expect(Number.isFinite(acc[0].x)).toBe(true);
    expect(Number.isFinite(acc[1].x)).toBe(true);
  });

  it('WOULD blow up at zero separation without softening (motivates ε)', () => {
    const a = createBody({ mass: 1, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 1, position: new Vector3(0, 0, 0) });
    const unsoftened = computeAccelerations([a, b], G, 0);
    expect(Number.isFinite(unsoftened[0].x)).toBe(false); // NaN/Infinity

    const softened = computeAccelerations([a, b], G, 1e-2);
    expect(Number.isFinite(softened[0].x)).toBe(true);
  });

  it('never yields NaN/Infinity while integrating through a close approach', () => {
    // Two equal masses on a near head-on collision course.
    const a = createBody({ mass: 1, position: new Vector3(-1, 0.02, 0), velocity: new Vector3(2, 0, 0) });
    const b = createBody({ mass: 1, position: new Vector3(1, -0.02, 0), velocity: new Vector3(-2, 0, 0) });
    const bodies = [a, b];
    for (let step = 0; step < 5000; step++) {
      leapfrog(bodies, 1e-3, G, 1e-2);
      expect(allFinite(bodies)).toBe(true);
    }
  });
});
