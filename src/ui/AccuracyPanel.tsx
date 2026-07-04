import type { OrbitLabStore } from '../state/useOrbitLab';
import { INTEGRATORS } from '../physics';
import { fmt, fmtSci, fmtFixed } from './format';

// Energy-drift gauge spans 1e-12 (excellent) → 1e0 (broken), i.e. 12 decades.
const GAUGE_MIN_LOG = -12;
const GAUGE_MAX_LOG = 0;

function gaugePercent(drift: number): number {
  const l = Math.log10(Math.max(drift, 1e-16));
  const p = (l - GAUGE_MIN_LOG) / (GAUGE_MAX_LOG - GAUGE_MIN_LOG);
  return Math.min(100, Math.max(0, p * 100));
}

/** The signature "instrument cluster": a prominent energy-drift gauge plus a
 *  grid of conserved-quantity readouts. */
export function AccuracyPanel({ store }: { store: OrbitLabStore }) {
  const m = store.metrics;
  if (!m) return <div className="editor-empty">Telemetry initializing…</div>;

  const driftPct = gaugePercent(m.energyDrift);

  return (
    <div>
      <div className="gauge">
        <div className="gauge__top">
          <span className="eyebrow">Energy drift · |ΔE / E₀|</span>
          <span className="gauge__unit">symplectic → flat</span>
        </div>
        <div className="gauge__value" style={{ color: driftColor(m.energyDrift) }}>
          {fmtSci(m.energyDrift)}
        </div>
        <div className="gauge__track" style={{ marginTop: 8 }}>
          <span className="gauge__needle" style={{ left: `${driftPct}%` }} />
        </div>
        <div className="gauge__scale">
          <span>1e−12</span>
          <span>1e−6</span>
          <span>1e0</span>
        </div>
        <div className="gauge__caption">
          Conserved quantities should stay constant. A <b>flat, tiny</b> drift means the integrator
          is tracking the true trajectory; a rising value means numerical error is accumulating.
        </div>
      </div>

      <div className="telemetry">
        <Tele label="Kinetic K" value={fmt(m.kinetic)} />
        <Tele label="Potential U" value={fmt(m.potential)} />
        <Tele label="Total E" value={fmt(m.total)} />
        <Tele label="Ang. mom. drift" value={fmtSci(m.angularMomentumDrift)} swatch="var(--series-ang)" />
        <Tele label="COM drift" value={fmtSci(m.comDrift)} swatch="var(--series-com)" />
        <Tele label="Momentum drift" value={fmtSci(m.momentumDrift)} swatch="var(--series-mom)" />
        <Tele label="Sim time" value={fmt(m.time)} />
        <Tele label="Timestep Δt" value={fmtSci(m.dt)} />
        <Tele label="Integrator" value={INTEGRATORS[m.integrator].label.split(' ')[0]} />
        <Tele label="Bodies" value={String(m.bodyCount)} />
        <Tele label="Steps" value={String(m.stepCount)} />
        <Tele label="|L|" value={fmtFixed(m.angularMomentum.length(), 3)} />
      </div>
    </div>
  );
}

function Tele({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="tele">
      <div className="tele__label">
        {swatch && <span className="swatch" style={{ background: swatch }} />}
        {label}
      </div>
      <div className="tele__value">{value}</div>
    </div>
  );
}

function driftColor(drift: number): string {
  if (drift < 1e-6) return 'var(--green)';
  if (drift < 1e-2) return 'var(--amber)';
  return 'var(--red)';
}
