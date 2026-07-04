import { Vector3, createBody, G_ASTRO, MASS, type SystemDefinition } from '../physics';
import { orbitingBody, toCenterOfMassFrame } from './helpers';

/**
 * Solar System approximation.
 *
 * UNITS (see constants.ts): length = AU, mass = M_sun, time = yr, so G = 4π².
 * Masses and orbital DISTANCES are the real IAU values, so the orbital speeds
 * and periods come out physically correct (Earth: 1 AU, ~2π AU/yr, 1 yr).
 *
 * The only non-physical quantities are the drawn RADII: true planetary radii in
 * AU are ~1e-5 and would be invisible, so each body is given a visual radius
 * purely for rendering (collisions are off, so radii never affect the physics).
 * Planets start at spread-out phases so they are not artificially aligned.
 */
export function solarSystem(): SystemDefinition {
  const G = G_ASTRO;

  const sun = createBody({
    name: 'Sun',
    mass: MASS.SUN,
    radius: 0.22, // visual only
    color: '#ffd85e',
    position: new Vector3(0, 0, 0),
    velocity: new Vector3(0, 0, 0),
    showTrail: false,
  });

  // [name, mass, semi-major axis (AU), visual radius, color, phase, inclination]
  const planetData: Array<[string, number, number, number, string, number, number]> = [
    ['Mercury', MASS.MERCURY, 0.387, 0.03, '#b7b0a6', 0.3, 0.12],
    ['Venus', MASS.VENUS, 0.723, 0.05, '#e8c37e', 1.6, 0.06],
    ['Earth', MASS.EARTH, 1.0, 0.055, '#6fb1ff', 2.7, 0.0],
    ['Mars', MASS.MARS, 1.524, 0.045, '#e06a4a', 3.9, 0.03],
    ['Jupiter', MASS.JUPITER, 5.203, 0.14, '#e0a866', 0.8, 0.02],
    ['Saturn', MASS.SATURN, 9.537, 0.12, '#d9c48a', 5.1, 0.04],
    ['Uranus', MASS.URANUS, 19.19, 0.09, '#9fe0e6', 2.1, 0.01],
    ['Neptune', MASS.NEPTUNE, 30.07, 0.088, '#5b7cff', 4.4, 0.03],
  ];

  const bodies = [sun];
  for (const [name, mass, dist, radius, color, phase, inc] of planetData) {
    bodies.push(
      orbitingBody({
        name,
        mass,
        radius,
        color,
        G,
        centralMass: MASS.SUN + mass,
        distance: dist,
        phase,
        inclination: inc,
      }),
    );
  }

  // Put the barycenter at rest at the origin (the Sun then wobbles slightly).
  toCenterOfMassFrame(bodies);

  return {
    name: 'Solar System',
    description:
      'Sun + eight planets at real relative masses and AU distances (G = 4π²). Visual radii only; distances are to scale — zoom to see the inner planets.',
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
