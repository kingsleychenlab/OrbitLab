import { createBody, Vector3, G_NATURAL, type SystemDefinition } from '../physics';

/**
 * Gravitational slingshot (gravity assist).
 *
 * UNITS: natural (G = 1). A massive planet cruises in the +x direction; a tiny
 * probe crosses its path from below and swings closely behind it. In the
 * planet's frame the probe's speed is unchanged (elastic hyperbolic flyby), but
 * because the planet is MOVING, the maneuver adds a chunk of the planet's
 * velocity to the probe in the simulation frame — the probe leaves markedly
 * faster than it arrived, while the planet loses an imperceptible amount of
 * speed (its mass is ~10⁷× larger).
 *
 * The encounter geometry (planet speed, probe launch point, impact parameter)
 * is tuned so the flyby is close but non-colliding; nothing is scripted, the
 * boost falls out of the integration. Focus the camera on the Probe to watch
 * the speed jump on the accuracy panel.
 */
export function slingshot(): SystemDefinition {
  const G = G_NATURAL;

  const planet = createBody({
    name: 'Planet',
    mass: 45,
    radius: 0.7,
    color: '#6ea8ff',
    position: new Vector3(-30, 0, 0),
    velocity: new Vector3(5, 0, 0), // cruising in +x
    showTrail: true,
  });

  const probe = createBody({
    name: 'Probe',
    mass: 1e-6, // negligible: it does not perturb the planet
    radius: 0.14,
    color: '#ff5d73',
    position: new Vector3(3.6, -18, 0), // impact parameter tuned for a close, non-clipping pass
    velocity: new Vector3(0, 3, 0), // heading up toward the planet's path
    showTrail: true,
  });

  return {
    name: 'Gravitational Slingshot',
    description:
      'A light probe swings behind a massive moving planet and is flung forward — a real gravity assist, integrated from Newtonian gravity. Focus the Probe and watch its speed jump.',
    bodies: [planet, probe],
    G,
    softening: 0.03,
    dt: 2e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 1,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 4,
  };
}
