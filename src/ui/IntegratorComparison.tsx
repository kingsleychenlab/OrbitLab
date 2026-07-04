import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrbitLabStore } from '../state/useOrbitLab';
import {
  runIntegratorComparison,
  comparisonStepBudget,
  type ComparisonSeries,
} from '../state/comparison';
import { Segmented } from './controls';
import { LineChart } from './LineChart';
import { fmtSci } from './format';

type DtMult = '0.5' | '1' | '2';

/**
 * "Numerical Accuracy" — runs Euler, Semi-implicit Euler, Leapfrog and RK4 on
 * the SAME initial conditions and plots how each one's energy drift grows. The
 * whole computation happens offline in the pure engine (four throwaway
 * Simulations), which is only possible because physics is decoupled from React
 * and Three.js.
 */
export function IntegratorComparison({ store }: { store: OrbitLabStore }) {
  const [result, setResult] = useState<ComparisonSeries[] | null>(null);
  const [running, setRunning] = useState(false);
  const [dtMult, setDtMult] = useState<DtMult>('1');
  const [meta, setMeta] = useState<{ steps: number; tEnd: number } | null>(null);
  const ranForRef = useRef<string>('');

  const run = useCallback(
    (mult: DtMult) => {
      setRunning(true);
      // Defer so the "running" state paints before the (synchronous) compute.
      requestAnimationFrame(() => {
        const def = store.getComparisonDefinition();
        const steps = comparisonStepBudget(def.bodies.length);
        const dt = def.dt * parseFloat(mult);
        const series = runIntegratorComparison(def, { steps, samples: 90, dt });
        setResult(series);
        setMeta({ steps, tEnd: steps * dt });
        setRunning(false);
      });
    },
    [store],
  );

  // Auto-run when the panel first appears or the preset changes.
  useEffect(() => {
    if (ranForRef.current !== store.presetId) {
      ranForRef.current = store.presetId;
      run(dtMult);
    }
  }, [store.presetId, dtMult, run]);

  const chartSeries =
    result?.map((s) => ({
      color: s.color,
      points: s.points.map((p) => ({ x: p.t, y: p.drift })),
    })) ?? [];

  return (
    <div className="compare">
      <div className="compare__controls">
        <div className="compare__intro">
          Same start, four methods. Energy drift <span className="mono">|ΔE/E₀|</span> on a log
          axis — symplectic methods stay flat, Euler climbs, and RK4 wins early but drifts on long
          Hamiltonian runs.
        </div>

        <div>
          <div className="field__sub">Timestep (× preset Δt)</div>
          <Segmented<DtMult>
            value={dtMult}
            onChange={(v) => setDtMult(v)}
            options={[
              { value: '0.5', label: '0.5×' },
              { value: '1', label: '1×' },
              { value: '2', label: '2×' },
            ]}
          />
        </div>

        <button className="btn btn--primary btn--block" onClick={() => run(dtMult)} disabled={running}>
          {running ? 'Running…' : '↻ Re-run comparison'}
        </button>

        <div className="compare__legend">
          {result?.map((s) => (
            <div className="legend-item" key={s.integrator}>
              <span className="legend-item__swatch" style={{ background: s.color }} />
              <span className="legend-item__name">{s.label}</span>
              <span className="legend-item__value">{fmtSci(s.finalDrift)}</span>
              <span className={`legend-item__tag ${s.symplectic ? 'symp' : ''}`}>
                {s.symplectic ? 'sympl' : 'non'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="compare__chart">
        {chartSeries.length > 0 ? (
          <LineChart series={chartSeries} height={200} logY yFormat={(v) => fmtSci(v, 0)} />
        ) : (
          <div className="chart__empty">Run a comparison to see the curves.</div>
        )}
        <div className="compare__note">
          {meta
            ? `${meta.steps.toLocaleString()} steps · integrated to t ≈ ${fmtSci(meta.tEnd)} in preset units. `
            : ''}
          Final |ΔE/E₀| is listed per method at left. Lower and flatter is better.
        </div>
      </div>
    </div>
  );
}
