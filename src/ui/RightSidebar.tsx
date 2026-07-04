import type { OrbitLabStore } from '../state/useOrbitLab';
import { Panel } from './controls';
import { BodyEditor } from './BodyEditor';
import { AccuracyPanel } from './AccuracyPanel';
import { fmt } from './format';

export function RightSidebar({ store }: { store: OrbitLabStore }) {
  return (
    <aside className="sidebar sidebar--right">
      <Panel
        title={`Bodies · ${store.bodies.length}`}
        right={
          <button className="btn btn--sm" onClick={store.addBody}>
            ＋ Add
          </button>
        }
      >
        <div className="body-list">
          {store.bodies.map((b) => (
            <div
              key={b.id}
              className="body-row"
              aria-selected={store.selectedId === b.id}
              onClick={() => store.selectBody(b.id)}
              onDoubleClick={() => store.focusBody(b.id)}
              title="Click to select · double-click to focus camera"
            >
              <span className="body-row__swatch" style={{ background: b.color, color: b.color }} />
              <span className="body-row__name">{b.name}</span>
              <span className="body-row__meta">m {fmt(b.mass, 2)}</span>
              <span className="body-row__flags">
                <span className={b.locked ? 'on' : ''} title="locked">
                  {b.locked ? '🔒' : ' '}
                </span>
                <span className={b.showTrail ? 'on' : ''} title="trail">
                  ∿
                </span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Body editor" dot>
        <BodyEditor store={store} />
      </Panel>

      <Panel title="Accuracy · telemetry" dot>
        <AccuracyPanel store={store} />
      </Panel>
    </aside>
  );
}
