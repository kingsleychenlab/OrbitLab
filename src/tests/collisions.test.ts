import { describe, it, expect } from 'vitest';
import {
  Vector3,
  createBody,
  resolveCollisions,
  mergeBodies,
  linearMomentum,
} from '../physics';

describe('collisions: merge conserves mass & momentum', () => {
  it('a single merge conserves total momentum and sums mass', () => {
    const a = createBody({ mass: 2, radius: 0.3, position: new Vector3(0, 0, 0), velocity: new Vector3(1, 0, 0) });
    const b = createBody({ mass: 3, radius: 0.3, position: new Vector3(0.1, 0, 0), velocity: new Vector3(0, 2, 0) });

    const pBefore = linearMomentum([a, b]);
    const { bodies, events } = resolveCollisions([a, b], { enabled: true });

    expect(bodies).toHaveLength(1);
    expect(events).toHaveLength(1);

    const merged = bodies[0];
    expect(merged.mass).toBeCloseTo(5, 12); // 2 + 3

    const pAfter = linearMomentum(bodies);
    expect(pAfter.x).toBeCloseTo(pBefore.x, 12);
    expect(pAfter.y).toBeCloseTo(pBefore.y, 12);
    expect(pAfter.z).toBeCloseTo(pBefore.z, 12);

    // Velocity is the momentum-weighted average.
    expect(merged.velocity.x).toBeCloseTo((2 * 1 + 3 * 0) / 5, 12);
    expect(merged.velocity.y).toBeCloseTo((2 * 0 + 3 * 2) / 5, 12);
  });

  it('uses a volume-conserving radius R = (R₁³ + R₂³)^(1/3)', () => {
    const a = createBody({ mass: 1, radius: 3 });
    const b = createBody({ mass: 1, radius: 4 });
    const merged = mergeBodies(a, b);
    expect(merged.radius).toBeCloseTo(Math.cbrt(27 + 64), 12); // = 5^(1/3·3)… = ∛91
    expect(merged.radius).toBeCloseTo(Math.cbrt(91), 12);
  });

  it('places the survivor at the center of mass', () => {
    const a = createBody({ mass: 1, radius: 0.5, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 3, radius: 0.5, position: new Vector3(4, 0, 0) });
    const merged = mergeBodies(a, b);
    expect(merged.position.x).toBeCloseTo((1 * 0 + 3 * 4) / 4, 12); // = 3
  });

  it('survivor inherits the identity of the heavier body', () => {
    const light = createBody({ name: 'Pebble', mass: 1, radius: 0.5, color: '#111111' });
    const heavy = createBody({ name: 'Planet', mass: 100, radius: 0.5, color: '#abcdef' });
    const merged = mergeBodies(light, heavy);
    expect(merged.name).toBe('Planet');
    expect(merged.color).toBe('#abcdef');
    expect(merged.id).toBe(heavy.id);
  });
});

describe('collisions: no merge when it should not happen', () => {
  it('does nothing when disabled', () => {
    const a = createBody({ mass: 1, radius: 1, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 1, radius: 1, position: new Vector3(0.1, 0, 0) });
    const { bodies, events } = resolveCollisions([a, b], { enabled: false });
    expect(bodies).toHaveLength(2);
    expect(events).toHaveLength(0);
  });

  it('does not merge well-separated bodies', () => {
    const a = createBody({ mass: 1, radius: 0.1, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 1, radius: 0.1, position: new Vector3(10, 0, 0) });
    const { bodies } = resolveCollisions([a, b], { enabled: true });
    expect(bodies).toHaveLength(2);
  });

  it('collapses a triple pile-up into one body across iterations', () => {
    const a = createBody({ mass: 1, radius: 1, position: new Vector3(0, 0, 0), velocity: new Vector3(1, 0, 0) });
    const b = createBody({ mass: 1, radius: 1, position: new Vector3(0.5, 0, 0), velocity: new Vector3(0, 1, 0) });
    const c = createBody({ mass: 1, radius: 1, position: new Vector3(1, 0, 0), velocity: new Vector3(0, 0, 1) });
    const pBefore = linearMomentum([a, b, c]);
    const { bodies } = resolveCollisions([a, b, c], { enabled: true });
    expect(bodies).toHaveLength(1);
    expect(bodies[0].mass).toBeCloseTo(3, 12);
    const pAfter = linearMomentum(bodies);
    expect(pAfter.distanceTo(pBefore)).toBeCloseTo(0, 12);
  });
});
