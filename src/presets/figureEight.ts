import { createBody, Vector3, G_NATURAL, type SystemDefinition } from '../physics';

/**
 * The figure-eight three-body choreography (Chenciner & Montgomery, 2000;
 * numerically discovered by C. Moore, 1993).
 *
 * UNITS: natural (G = 1), three EQUAL masses m = 1. With the special initial
 * conditions below, all three bodies chase each other around a single shared
 * figure-eight curve, evenly spaced in time. It is a genuine, remarkably stable
 * periodic solution of the Newtonian three-body problem — and a perfect proof
 * that OrbitLab computes orbits rather than scripting them: the eight emerges
 * purely from the gravitational integration of these numbers.
 *
 * Initial data (Montgomery's canonical values):
 *   r3 = −(r1 + r2) = 0,   v1 = v2 = −v3 / 2
 */
export function figureEight(): SystemDefinition {
  const G = G_NATURAL;

  // Canonical figure-8 initial conditions.
  const x = 0.97000436;
  const y = 0.24308753;
  const vx = 0.4662036850;
  const vy = 0.4323657300;

  const bodies = [
    createBody({
      name: 'Alpha',
      mass: 1,
      radius: 0.06,
      color: '#ff6b6b',
      position: new Vector3(-x, y, 0),
      velocity: new Vector3(vx, vy, 0),
    }),
    createBody({
      name: 'Beta',
      mass: 1,
      radius: 0.06,
      color: '#4dd2ff',
      position: new Vector3(x, -y, 0),
      velocity: new Vector3(vx, vy, 0),
    }),
    createBody({
      name: 'Gamma',
      mass: 1,
      radius: 0.06,
      color: '#ffd166',
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(-2 * vx, -2 * vy, 0),
    }),
  ];

  return {
    name: 'Figure-8 Choreography',
    description:
      'Three equal masses tracing one shared figure-eight (Chenciner–Montgomery). A stable periodic solution that appears purely from integrating gravity.',
    bodies,
    G,
    softening: 0,
    dt: 1e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 2.4,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 3,
  };
}
