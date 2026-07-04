import { useRef } from 'react';
import type { OrbitLabStore } from '../state/useOrbitLab';
import { INTEGRATORS } from '../physics';
import { fmtTime } from './format';

/** Global header: brand, live status telemetry, and system I/O actions. */
export function TopBar({
  store,
  onToggleLeft,
  onToggleRight,
}: {
  store: OrbitLabStore;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const time = store.metrics?.time ?? 0;

  return (
    <header className="topbar">
      <button className="btn btn--icon drawer-toggle" onClick={onToggleLeft} aria-label="Toggle controls">
        ☰
      </button>

      <div className="brand">
        <span className="brand__mark" />
        <div>
          <div className="brand__name">
            Orbit<b>Lab</b>
          </div>
          <div className="brand__tag">N-body gravity lab</div>
        </div>
      </div>

      <div className="topbar__status">
        <StatChip label="System" value={store.systemName} />
        <StatChip label="Sim time" value={fmtTime(time)} accent />
        <StatChip label="Integrator" value={INTEGRATORS[store.integrator].label.split(' ')[0]} />
        <StatChip label="Bodies" value={String(store.metrics?.bodyCount ?? store.bodies.length)} />
        <StatChip label="FPS" value={String(Math.round(store.fps))} />
      </div>

      <div className="topbar__actions">
        <button className="btn btn--sm" onClick={store.saveJSON} title="Save system as JSON">
          Save
        </button>
        <button
          className="btn btn--sm"
          onClick={() => fileRef.current?.click()}
          title="Load system from JSON"
        >
          Load
        </button>
        <button
          className="btn btn--sm"
          onClick={store.exportBodiesCSV}
          title="Export current body states as CSV"
        >
          Export CSV
        </button>
        <button
          className="btn btn--icon drawer-toggle"
          onClick={onToggleRight}
          aria-label="Toggle telemetry"
        >
          ⚙
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) store.loadJSONFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="stat-chip">
      <span className="stat-chip__label">{label}</span>
      <span className={`stat-chip__value${accent ? ' accent' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}
