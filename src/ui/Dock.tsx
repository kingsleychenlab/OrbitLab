import { useState } from 'react';
import type { OrbitLabStore } from '../state/useOrbitLab';
import { GraphPanel } from './GraphPanel';
import { IntegratorComparison } from './IntegratorComparison';
import { fmtTime } from './format';

type Tab = 'graphs' | 'accuracy' | 'logs';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'graphs', label: 'Conservation graphs' },
  { id: 'accuracy', label: 'Numerical accuracy' },
  { id: 'logs', label: 'Activity log' },
];

/** Collapsible bottom dock holding the graphs, the integrator comparison, and
 *  the activity log. */
export function Dock({ store }: { store: OrbitLabStore }) {
  const [tab, setTab] = useState<Tab>('graphs');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="dock">
      <div className="dock__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="dock__tab"
            aria-pressed={!collapsed && tab === t.id}
            onClick={() => {
              setTab(t.id);
              setCollapsed(false);
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="dock__spacer" />
        <button className="dock__tab" onClick={() => store.exportMetricsCSV()} title="Export metrics history">
          ↓ Metrics CSV
        </button>
        <button className="dock__tab" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? '▲ Expand' : '▼ Collapse'}
        </button>
      </div>

      <div className={`dock__body${collapsed ? ' dock__body--collapsed' : ''}`}>
        {tab === 'graphs' && <GraphPanel store={store} />}
        {tab === 'accuracy' && <IntegratorComparison store={store} />}
        {tab === 'logs' && <LogView store={store} />}
      </div>
    </section>
  );
}

function LogView({ store }: { store: OrbitLabStore }) {
  if (store.logs.length === 0) {
    return <div className="chart__empty">No activity yet.</div>;
  }
  return (
    <div className="logs">
      {store.logs.map((l) => (
        <div key={l.id} className={`log-line log-line--${l.kind}`}>
          <span className="log-line__time">
            {l.simTime === null ? '—' : `t=${fmtTime(l.simTime)}`}
          </span>
          <span>{l.message}</span>
        </div>
      ))}
    </div>
  );
}
