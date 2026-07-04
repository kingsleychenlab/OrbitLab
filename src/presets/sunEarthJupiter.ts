import { Vector3, createBody, G_ASTRO, MASS, type SystemDefinition } from '../physics';
import { orbitingBody, toCenterOfMassFrame } from './helpers';

/**
 * Sun–Earth–Jupiter.
 *
 * Units are astronomical (AU, M_sun, yr; G = 4π²). This is the classic
 * restricted-ish system used to see Jupiter's gravitational tug on Earth: over
 * many orbits Earth's ellipse slowly precesses and breathes. Real masses and
 * distances; visual radii for rendering only.
 */
export function sunEarthJupiter(): SystemDefinition {
  const G = G_ASTRO;

  const sun = createBody({
    name: 'Sun',
    mass: MASS.SUN,
    radius: 0.18,
    color: '#ffd85e',
    position: new Vector3(0, 0, 0),
    showTrail: false,
  });

  const earth = orbitingBody({
    name: 'Earth',
    mass: MASS.EARTH,
    radius: 0.07,
    color: '#6fb1ff',
    G,
    centralMass: MASS.SUN + MASS.EARTH,
    distance: 1.0,
    phase: 0,
  });

  const jupiter = orbitingBody({
    name: 'Jupiter',
    mass: MASS.JUPITER,
    radius: 0.16,
    color: '#e0a866',
    G,
    centralMass: MASS.SUN + MASS.JUPITER,
    distance: 5.203,
    phase: Math.PI * 0.6,
  });

  const bodies = [sun, earth, jupiter];
  toCenterOfMassFrame(bodies);

  return {
    name: 'Sun · Earth · Jupiter',
    description:
      'Three real bodies in AU units. Watch Jupiter perturb Earth’s orbit over many revolutions — the motion is integrated, not scripted.',
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
