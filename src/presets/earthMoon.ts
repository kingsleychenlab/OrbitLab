import { Vector3, createBody, G_NATURAL, type SystemDefinition } from '../physics';
import { orbitingBody, toCenterOfMassFrame } from './helpers';

/**
 * Earth–Moon system.
 *
 * UNITS (natural, chosen so every number is O(1) and the math stays clean):
 *   length = mean Earth–Moon distance (384,400 km)
 *   mass   = Earth mass
 *   G      = 1
 * The Moon/Earth mass ratio (0.0123) is real, so the barycenter sits ~0.0123 of
 * the way to the Moon and BOTH bodies orbit it — Earth visibly wobbles. Radii
 * are enlarged for visibility. This is a faithful two-body problem, just in
 * convenient units.
 */
export function earthMoon(): SystemDefinition {
  const G = G_NATURAL;
  const earthMass = 1;
  const moonMass = 0.0123;

  const earth = createBody({
    name: 'Earth',
    mass: earthMass,
    radius: 0.06,
    color: '#5aa0ff',
    position: new Vector3(0, 0, 0),
    showTrail: true,
  });

  const moon = orbitingBody({
    name: 'Moon',
    mass: moonMass,
    radius: 0.022,
    color: '#cfd2d6',
    G,
    centralMass: earthMass + moonMass, // true 2-body relative orbit
    distance: 1,
    phase: 0,
    inclination: 0.09, // ~5° tilt, for a 3D look
  });

  const bodies = [earth, moon];
  toCenterOfMassFrame(bodies);

  return {
    name: 'Earth · Moon',
    description:
      'A two-body system in natural units (length = Earth–Moon distance, mass = Earth mass, G = 1). Both bodies orbit their shared barycenter.',
    bodies,
    G,
    softening: 1e-3,
    dt: 5e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 4,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 4,
  };
}
