import { describe, it, expect } from 'vitest';
import {
  Vector3,
  createBody,
  kineticEnergy,
  potentialEnergy,
  totalEnergy,
  angularMomentum,
  centerOfMass,
  leapfrog,
  Simulation,
  type SystemDefinition,
} from '../physics';
import { twoBodyCircular, circularPeriod } from './helpers';

const G = 1;

describe('metrics: closed-form checks', () => {
  it('kinetic energy = Σ ½ m|v|²', () => {
    const a = createBody({ mass: 2, velocity: new Vector3(3, 0, 0) }); // ½·2·9 = 9
    const b = createBody({ mass: 1, velocity: new Vector3(0, 4, 0) }); // ½·1·16 = 8
    expect(kineticEnergy([a, b])).toBeCloseTo(17, 12);
  });

  it('potential energy = −G m₁ m₂ / r (ε = 0)', () => {
    const a = createBody({ mass: 2, position: new Vector3(0, 0, 0) });
    const b = createBody({ mass: 5, position: new Vector3(2, 0, 0) });
    expect(potentialEnergy([a, b], G, 0)).toBeCloseTo(-(G * 2 * 5) / 2, 12);
  });

  it('angular momentum of a circular orbit points along +z and is nonzero', () => {
    const bodies = twoBodyCircular(G, 1, 1e-3, 1);
    const L = angularMomentum(bodies);
    expect(Math.abs(L.x)).toBeLessThan(1e-12);
    expect(Math.abs(L.y)).toBeLessThan(1e-12);
    expect(L.z).toBeGreaterThan(0);
  });

  it('a bound circular orbit has negative total energy', () => {
    const bodies = twoBodyCircular(G, 1, 1e-3, 1);
    expect(totalEnergy(bodies, G, 0)).toBeLessThan(0);
  });
});

describe('metrics: center of mass stays nearly constant', () => {
  it('holds the COM fixed for a system launched in the COM frame', () => {
    const bodies = twoBodyCircular(G, 1, 1e-3, 1);
    const com0 = centerOfMass(bodies);
    const T = circularPeriod(G, 1, 1e-3, 1);
    const dt = T / 400;
    for (let i = 0; i < 6000; i++) leapfrog(bodies, dt, G, 0);
    const com = centerOfMass(bodies);
    expect(com.distanceTo(com0)).toBeLessThan(1e-6);
  });
});

// A tiny self-contained system definition for exercising the Simulation class.
function twoBodyDefinition(): SystemDefinition {
  return {
    name: 'Test two-body',
    description: 'circular orbit',
    bodies: twoBodyCircular(G, 1, 1e-3, 1),
    G,
    softening: 0,
    dt: circularPeriod(G, 1, 1e-3, 1) / 500,
    integrator: 'leapfrog',
    collisionsEnabled: false,
    suggestedDistanceScale: 1,
    suggestedRadiusScale: 1,
    suggestedStepsPerFrame: 4,
  };
}

describe('Simulation: drift bookkeeping and lifecycle', () => {
  it('reports ~zero drift at t=0 and small energy drift under Leapfrog', () => {
    const sim = new Simulation(twoBodyDefinition());
    const m0 = sim.getDriftMetrics();
    expect(m0.time).toBe(0);
    expect(m0.energyDrift).toBeCloseTo(0, 12);
    expect(m0.momentumDrift).toBeLessThan(1e-9);

    sim.stepMany(4000);
    const m = sim.getDriftMetrics();
    expect(m.stepCount).toBe(4000);
    expect(Number.isFinite(m.energyDrift)).toBe(true);
    expect(m.energyDrift).toBeLessThan(1e-2); // symplectic ⇒ bounded & small
    expect(m.bodyCount).toBe(2);
  });

  it('records a decimated history that spans the whole run', () => {
    const sim = new Simulation(twoBodyDefinition());
    sim.stepMany(5000);
    expect(sim.history.length).toBeGreaterThan(1);
    expect(sim.history.length).toBeLessThanOrEqual(600);
    // History covers from t≈0 to the current time.
    expect(sim.history[0].t).toBeCloseTo(0, 6);
    expect(sim.history[sim.history.length - 1].t).toBeGreaterThan(0);
  });

  it('reset restores the initial state', () => {
    const sim = new Simulation(twoBodyDefinition());
    const start = sim.bodies[1].position.clone();
    sim.stepMany(125); // a quarter orbit ⇒ clearly displaced from the start
    expect(sim.bodies[1].position.distanceTo(start)).toBeGreaterThan(0.1);
    sim.reset();
    expect(sim.time).toBe(0);
    expect(sim.stepCount).toBe(0);
    expect(sim.bodies[1].position.distanceTo(start)).toBeCloseTo(0, 12);
  });

  it('serializes and reloads a system round-trip', () => {
    const sim = new Simulation(twoBodyDefinition());
    sim.updateBody(sim.bodies[0].id, { name: 'Renamed star' });
    const snapshot = sim.serialize();

    const sim2 = new Simulation(twoBodyDefinition());
    sim2.loadSerialized(snapshot);
    expect(sim2.bodies).toHaveLength(2);
    expect(sim2.bodies[0].name).toBe('Renamed star');
    expect(sim2.bodies[0].mass).toBeCloseTo(sim.bodies[0].mass, 12);
    expect(sim2.params.G).toBe(G);
  });

  it('exports body state as CSV with a header row', () => {
    const sim = new Simulation(twoBodyDefinition());
    const csv = sim.toBodiesCSV();
    const lines = csv.split('\n');
    expect(lines[0]).toContain('mass');
    expect(lines).toHaveLength(3); // header + 2 bodies
  });
});
