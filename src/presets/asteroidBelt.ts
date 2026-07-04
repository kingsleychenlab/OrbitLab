import { createBody, Vector3, G_ASTRO, MASS, type SystemDefinition } from '../physics';
import { orbitingBody, mulberry32, range } from './helpers';

/**
 * Asteroid belt.
 *
 * Units are astronomical (AU, M_sun, yr; G = 4π²). A central Sun and Jupiter,
 * plus a ring of ~90 low-mass asteroids scattered between 2.2 and 3.3 AU — the
 * real belt's inner/outer edges. Each asteroid gets:
 *   • a random orbital phase (filled ring),
 *   • a small random inclination (a 3D torus rather than a flat disk),
 *   • a small random speed "kick" so orbits are mildly eccentric.
 * All randomness comes from a FIXED-SEED PRNG, so the belt is identical every
 * run. The asteroids are near-massless test particles; Jupiter does the stirring.
 */
export function asteroidBelt(): SystemDefinition {
  const G = G_ASTRO;
  const rng = mulberry32(0xa57e401d);

  const sun = createBody({
    name: 'Sun',
    mass: MASS.SUN,
    radius: 0.28,
    color: '#ffd85e',
    position: new Vector3(0, 0, 0),
    showTrail: false,
  });

  const jupiter = orbitingBody({
    name: 'Jupiter',
    mass: MASS.JUPITER,
    radius: 0.16,
    color: '#e0a866',
    G,
    centralMass: MASS.SUN,
    distance: 5.203,
    phase: 0,
    showTrail: true,
  });

  const bodies = [sun, jupiter];

  const COUNT = 90;
  const palette = ['#b9b2a6', '#9a9488', '#cdbfa6', '#8f97a3', '#c9b892'];
  for (let i = 0; i < COUNT; i++) {
    const dist = range(rng, 2.2, 3.3);
    bodies.push(
      orbitingBody({
        name: `Asteroid ${i + 1}`,
        mass: 1e-10, // negligible test particle
        radius: range(rng, 0.015, 0.03),
        color: palette[i % palette.length],
        G,
        centralMass: MASS.SUN,
        distance: dist,
        phase: range(rng, 0, Math.PI * 2),
        inclination: range(rng, -0.12, 0.12),
        speedKick: range(rng, -0.03, 0.03),
        showTrail: false,
      }),
    );
  }

  return {
    name: 'Asteroid Belt',
    description:
      'Sun + Jupiter + ~90 seeded test-particle asteroids between 2.2–3.3 AU. A 3D ring stirred by Jupiter’s gravity (AU units, G = 4π²).',
    bodies,
    G,
    softening: 2e-3,
    dt: 3e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 1,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 4,
  };
}
