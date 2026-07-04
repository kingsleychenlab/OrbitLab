import { createBody, Vector3, G_ASTRO, MASS, type SystemDefinition } from '../physics';
import { orbitingBody, toCenterOfMassFrame } from './helpers';

/**
 * Unstable orbit demo — a planetary system that is too tightly packed to last.
 *
 * Units are astronomical (AU, M_sun, yr; G = 4π²). A Sun hosts two VERY massive
 * planets (~15 Jupiter masses each) whose orbits at 1.0 and 1.35 AU are far too
 * close for their mass: their mutual Hill radii overlap, so the orbits cross.
 * The result is a chaotic scattering that, after a number of encounters,
 * ejects one planet to a wildly eccentric or unbound orbit while the other
 * recoils inward — a compact demonstration of dynamical instability. Contrast
 * with the Solar System preset, whose widely spaced, low-mass planets are
 * stable for billions of years.
 */
export function unstableOrbit(): SystemDefinition {
  const G = G_ASTRO;
  const heavyPlanet = 0.015; // ~15 Jupiter masses in M_sun

  const sun = createBody({
    name: 'Star',
    mass: MASS.SUN,
    radius: 0.2,
    color: '#ffd85e',
    position: new Vector3(0, 0, 0),
    showTrail: false,
  });

  const inner = orbitingBody({
    name: 'Planet b',
    mass: heavyPlanet,
    radius: 0.12,
    color: '#ff7b5a',
    G,
    centralMass: MASS.SUN + heavyPlanet,
    distance: 1.0,
    phase: 0,
  });

  const outer = orbitingBody({
    name: 'Planet c',
    mass: heavyPlanet,
    radius: 0.12,
    color: '#7c9dff',
    G,
    centralMass: MASS.SUN + heavyPlanet,
    distance: 1.35,
    phase: Math.PI, // start on the far side; they still drift into resonance
  });

  const bodies = [sun, inner, outer];
  toCenterOfMassFrame(bodies);

  return {
    name: 'Unstable Orbit',
    description:
      'Two over-massive planets packed too close (1.0 & 1.35 AU). Their orbits cross and chaotically scatter, ejecting one — instability emerging from the physics, not scripted.',
    bodies,
    G,
    softening: 1e-3,
    dt: 1.5e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 1,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 3,
  };
}
