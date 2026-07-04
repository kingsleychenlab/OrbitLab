import { createBody, Vector3, G_NATURAL, type SystemDefinition } from '../physics';

/**
 * Chaotic three-body system — Burrau's "Pythagorean" problem (1913).
 *
 * UNITS: natural (G = 1). Three bodies of mass 3, 4, 5 are placed AT REST on the
 * vertices of a 3-4-5 right triangle:
 *     m=3 at (1, 3),  m=4 at (−2, −1),  m=5 at (1, −1)
 * With no initial velocity they fall together, undergo a sequence of extremely
 * close approaches and slingshots, and eventually eject one body. It is the
 * textbook demonstration of deterministic chaos: the trajectory is exquisitely
 * sensitive to the timestep, so runs with different dt diverge completely.
 *
 * Softening is kept small but nonzero to survive the near-collisions without
 * the integrator exploding; RK4 or a small Leapfrog step tracks it best.
 */
export function threeBody(): SystemDefinition {
  const G = G_NATURAL;

  const bodies = [
    createBody({
      name: 'Body 3',
      mass: 3,
      radius: 0.14,
      color: '#ff6b6b',
      position: new Vector3(1, 3, 0),
      velocity: new Vector3(0, 0, 0),
    }),
    createBody({
      name: 'Body 4',
      mass: 4,
      radius: 0.16,
      color: '#4dd2ff',
      position: new Vector3(-2, -1, 0),
      velocity: new Vector3(0, 0, 0),
    }),
    createBody({
      name: 'Body 5',
      mass: 5,
      radius: 0.18,
      color: '#ffd166',
      position: new Vector3(1, -1, 0),
      velocity: new Vector3(0, 0, 0),
    }),
  ];

  return {
    name: 'Three-Body (Pythagorean)',
    description:
      "Burrau's 3-4-5 problem: three masses released from rest. A chaotic cascade of close encounters that eventually ejects one body — change dt and the outcome changes entirely.",
    bodies,
    G,
    // softening 0.05 caps the deepest close approaches so fixed-step Leapfrog
    // conserves energy to ~1e-4 while the dynamics stay genuinely chaotic.
    softening: 0.05,
    dt: 1e-3,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 1.2,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 3,
  };
}
