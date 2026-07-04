import type { OrbitLabStore } from '../state/useOrbitLab';
import type { HistorySample } from '../physics';
import { LineChart, type ChartPoint } from './LineChart';
import { fmt, fmtSci } from './format';

type Key = 'energy' | 'energyDrift' | 'angularMomentumDrift' | 'comDrift';

const CARDS: Array<{ key: Key; title: string; color: string; format: (v: number) => string }> = [
  { key: 'energy', title: 'Total energy E', color: 'var(--series-energy)', format: (v) => fmt(v) },
  { key: 'energyDrift', title: 'Energy drift |ΔE/E₀|', color: 'var(--series-energy-drift)', format: fmtSci },
  { key: 'angularMomentumDrift', title: 'Angular momentum drift', color: 'var(--series-ang)', format: fmtSci },
  { key: 'comDrift', title: 'Center-of-mass drift', color: 'var(--series-com)', format: fmtSci },
];

/** The four required time-series charts, fed by the simulation's history buffer. */
export function GraphPanel({ store }: { store: OrbitLabStore }) {
  const history = store.history;
  return (
    <div className="graph-grid">
      {CARDS.map((card) => {
        const points: ChartPoint[] = history.map((h: HistorySample) => ({ x: h.t, y: h[card.key] }));
        const latest = history.length ? history[history.length - 1][card.key] : NaN;
        return (
          <div className="chart-card" key={card.key}>
            <div className="chart-card__head">
              <div className="chart-card__title">
                <span className="swatch" style={{ background: card.color }} />
                {card.title}
              </div>
              <span className="chart-card__latest">{card.format(latest)}</span>
            </div>
            <LineChart
              series={[{ color: card.color, points }]}
              fill={card.key === 'energy'}
              yFormat={card.format}
            />
          </div>
        );
      })}
    </div>
  );
}
