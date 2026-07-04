import {
  Simulation,
  INTEGRATOR_LIST,
  type SystemDefinition,
  type IntegratorName,
} from '../physics';

/**
 * Offline integrator comparison — runs the SAME initial conditions through all
 * four integrators and records how each one's total-energy drift grows over
 * time. Because the physics engine is framework-free, we simply spin up four
 * independent Simulations and step them; no rendering, no React. This is the
 * data behind the "Numerical Accuracy" panel.
 */

export interface ComparisonPoint {
  t: number;
  /** |E(t) − E₀| / |E₀|, clamped to a tiny floor so it survives a log axis. */
  drift: number;
}

export interface ComparisonSeries {
  integrator: IntegratorName;
  label: string;
  color: string;
  symplectic: boolean;
  points: ComparisonPoint[];
  finalDrift: number;
}

export const COMPARISON_COLORS: Record<IntegratorName, string> = {
  euler: '#ff6b9d',
  semiImplicitEuler: '#ffd166',
  leapfrog: '#3fe0c5',
  rk4: '#a685ff',
};

const DRIFT_FLOOR = 1e-16;

/**
 * Choose a step count that keeps the total work bounded regardless of body
 * count, so the comparison stays responsive even on the asteroid belt.
 */
export function comparisonStepBudget(bodyCount: number): number {
  const pairCost = Math.max(1, (bodyCount * bodyCount) / 2);
  const budget = 4_000_000 / (pairCost * 4); // 4 integrators, ~4 evals each
  return Math.round(Math.min(3000, Math.max(400, budget)));
}

export interface ComparisonOptions {
  steps: number;
  /** Number of points sampled per curve. */
  samples: number;
  /** Optional timestep override (defaults to the preset's dt). */
  dt?: number;
}

export function runIntegratorComparison(
  def: SystemDefinition,
  opts: ComparisonOptions,
): ComparisonSeries[] {
  const dt = opts.dt ?? def.dt;
  const sampleEvery = Math.max(1, Math.floor(opts.steps / opts.samples));

  return INTEGRATOR_LIST.map((info) => {
    // Each Simulation deep-clones def.bodies on load, so the four runs share
    // identical initial conditions but never alias each other's state.
    const sim = new Simulation({ ...def, integrator: info.name, dt });
    const points: ComparisonPoint[] = [{ t: 0, drift: DRIFT_FLOOR }];

    for (let i = 1; i <= opts.steps; i++) {
      sim.step();
      if (i % sampleEvery === 0 || i === opts.steps) {
        const d = sim.getDriftMetrics().energyDrift;
        points.push({ t: sim.time, drift: Math.max(d, DRIFT_FLOOR) });
      }
    }

    return {
      integrator: info.name,
      label: info.label,
      color: COMPARISON_COLORS[info.name],
      symplectic: info.symplectic,
      points,
      finalDrift: sim.getDriftMetrics().energyDrift,
    };
  });
}
