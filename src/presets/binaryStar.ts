import { createBody, Vector3, G_ASTRO, type SystemDefinition } from '../physics';
import { orbitingBody, toCenterOfMassFrame } from './helpers';

/**
 * Binary star system with a circumbinary ("Tatooine") planet.
 *
 * Units are astronomical (AU, M_sun, yr; G = 4π²). Two stars of unequal mass
 * orbit their common barycenter on a circular mutual orbit of separation `a`.
 * The two-body circular solution places each star at a distance from the COM
 * inversely proportional to its mass, with speeds set so momentum cancels.
 *
 * A low-mass planet is added far outside the binary (P-type orbit); it must be
 * well beyond the binary for stability, so it sits at ~4× the separation and
 * orbits the two stars' COMBINED mass.
 */
export function binaryStar(): SystemDefinition {
  const G = G_ASTRO;
  const m1 = 1.1; // M_sun
  const m2 = 0.9; // M_sun
  const a = 2.0; // AU, separation between the stars
  const totalStarMass = m1 + m2;

  // Distances of each star from the barycenter and their circular speeds.
  const r1 = (m2 / totalStarMass) * a;
  const r2 = (m1 / totalStarMass) * a;
  const omega = Math.sqrt((G * totalStarMass) / (a * a * a)); // mutual angular rate

  const starA = createBody({
    name: 'Star A',
    mass: m1,
    radius: 0.24,
    color: '#ffdf6b',
    position: new Vector3(-r1, 0, 0),
    velocity: new Vector3(0, -omega * r1, 0),
    showTrail: true,
  });
  const starB = createBody({
    name: 'Star B',
    mass: m2,
    radius: 0.2,
    color: '#ff8f5a',
    position: new Vector3(r2, 0, 0),
    velocity: new Vector3(0, omega * r2, 0),
    showTrail: true,
  });

  // Circumbinary planet, far enough out to see the two stars as one point mass.
  const planet = orbitingBody({
    name: 'Planet',
    mass: 3e-5,
    radius: 0.06,
    color: '#7ce0c0',
    G,
    centralMass: totalStarMass,
    distance: 4 * a,
    phase: Math.PI / 2,
    inclination: 0.05,
  });

  const bodies = [starA, starB, planet];
  toCenterOfMassFrame(bodies);

  return {
    name: 'Binary Star',
    description:
      'Two unequal stars on a circular mutual orbit plus a distant circumbinary planet (AU units, G = 4π²).',
    bodies,
    G,
    softening: 1e-3,
    dt: 2e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 1,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 3,
  };
}
