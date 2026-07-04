import type { OrbitLabStore } from '../state/useOrbitLab';
import { INTEGRATOR_LIST, LIMITS } from '../physics';
import { PRESETS, type PresetCategory } from '../presets';
import { Panel, Slider, Toggle } from './controls';
import { TimeControls } from './TimeControls';
import { fmt, fmtSci } from './format';

const CATEGORIES: PresetCategory[] = ['Systems', 'Three-body', 'Demos'];

export function LeftSidebar({ store }: { store: OrbitLabStore }) {
  return (
    <aside className="sidebar sidebar--left">
      <Panel title="Presets" dot>
        {CATEGORIES.map((cat) => (
          <div className="preset-group" key={cat}>
            <div className="eyebrow preset-group__label">{cat}</div>
            {PRESETS.filter((p) => p.category === cat).map((p) => (
              <button
                key={p.id}
                className="preset"
                aria-pressed={store.presetId === p.id}
                onClick={() => store.loadPreset(p.id)}
              >
                <div className="preset__name">{p.name}</div>
                <div className="preset__blurb">{p.blurb}</div>
              </button>
            ))}
          </div>
        ))}
      </Panel>

      <Panel title="Simulation">
        <TimeControls store={store} />
        <Slider
          label="Softening ε"
          value={store.softening}
          min={LIMITS.SOFTENING_MIN}
          max={LIMITS.SOFTENING_MAX}
          step={0.0005}
          display={fmtSci(store.softening)}
          onChange={store.setSoftening}
        />
        <Toggle
          label="Collisions (merge on contact)"
          checked={store.collisionsEnabled}
          onChange={store.setCollisionsEnabled}
        />
        <div className="help-text">
          Gravitational constant G = <span className="mono">{fmt(store.G)}</span> in this preset’s
          units. Softening prevents singular accelerations during close approaches.
        </div>
      </Panel>

      <Panel title="Integrator">
        <div className="preset-group">
          {INTEGRATOR_LIST.map((info) => (
            <button
              key={info.name}
              className="preset"
              aria-pressed={store.integrator === info.name}
              onClick={() => store.setIntegrator(info.name)}
            >
              <div className="preset__name">
                {info.label}
                <span className="pill" style={{ marginLeft: 8 }}>
                  order {info.order}
                </span>
                {info.symplectic && (
                  <span className="pill on" style={{ marginLeft: 6 }}>
                    symplectic
                  </span>
                )}
              </div>
              <div className="preset__blurb">{info.summary}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="View">
        <Slider
          label="Distance scale"
          value={store.view.distanceScale}
          min={0.1}
          max={12}
          step={0.1}
          display={`${fmt(store.view.distanceScale)}×`}
          onChange={(v) => store.setView({ distanceScale: v })}
        />
        <Slider
          label="Radius scale"
          value={store.view.radiusScale}
          min={0.1}
          max={8}
          step={0.1}
          display={`${fmt(store.view.radiusScale)}×`}
          onChange={(v) => store.setView({ radiusScale: v })}
        />
        <Slider
          label="Trail length"
          value={store.view.trailLength}
          min={0}
          max={800}
          step={10}
          display={`${store.view.trailLength} pts`}
          onChange={(v) => store.setView({ trailLength: v })}
        />
        <Toggle
          label="Show labels"
          checked={store.view.showLabels}
          onChange={(v) => store.setView({ showLabels: v })}
        />
        <Toggle
          label="Show trails"
          checked={store.view.showTrails}
          onChange={(v) => store.setView({ showTrails: v })}
        />
        <Toggle
          label="Trail fade (phosphor)"
          checked={store.view.trailFade}
          onChange={(v) => store.setView({ trailFade: v })}
        />
      </Panel>
    </aside>
  );
}
