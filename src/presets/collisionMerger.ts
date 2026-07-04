import { createBody, Vector3, G_NATURAL, type SystemDefinition } from '../physics';

/**
 * Collision / merger demo.
 *
 * UNITS: natural (G = 1). Collision handling is ENABLED. Six equal bodies are
 * placed on a ring and launched inward with a small tangential swirl, so they
 * converge near the center, overlap, and merge. Each merge conserves mass and
 * momentum and grows the survivor's radius as (R₁³ + R₂³)^(1/3), so you watch a
 * single larger body build up from the pieces. The bodies have deliberately
 * large radii so contact (and merging) actually happens on a visible timescale.
 */
export function collisionMerger(): SystemDefinition {
  const G = G_NATURAL;
  const COUNT = 6;
  const ringRadius = 6;
  const inwardSpeed = 1.15;
  const swirl = 0.28; // tangential component → a little rotation before merging

  const palette = ['#ff6b6b', '#4dd2ff', '#ffd166', '#a685ff', '#5ce6a1', '#ff9f6b'];
  const bodies = [];
  for (let i = 0; i < COUNT; i++) {
    const angle = (i / COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Radially inward velocity (−cos, −sin) plus a tangential swirl (−sin, cos).
    const vx = -cos * inwardSpeed - sin * swirl;
    const vy = -sin * inwardSpeed + cos * swirl;
    bodies.push(
      createBody({
        name: `Fragment ${i + 1}`,
        mass: 1,
        radius: 0.45,
        color: palette[i % palette.length],
        position: new Vector3(cos * ringRadius, sin * ringRadius, 0),
        velocity: new Vector3(vx, vy, 0),
        showTrail: true,
      }),
    );
  }

  return {
    name: 'Collision / Merger',
    description:
      'Six bodies fall together and merge (collisions ON). Each merge conserves mass & momentum and grows the survivor by volume — the body count drops as it builds up.',
    bodies,
    G,
    softening: 0.05,
    dt: 2e-3,
    integrator: 'leapfrog',
    collisionsEnabled: true,
    suggestedDistanceScale: 1.1,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 3,
  };
}
