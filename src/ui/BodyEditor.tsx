import { useEffect, useState } from 'react';
import { Vector3 } from '../physics';
import type { OrbitLabStore } from '../state/useOrbitLab';
import { fmt, fmtVec } from './format';

interface Form {
  name: string;
  mass: string;
  radius: string;
  color: string;
  px: string;
  py: string;
  pz: string;
  vx: string;
  vy: string;
  vz: string;
}

const num = (s: string): number => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
};

/** Editor for the selected body. Local form state is seeded when the selection
 *  changes so typing is never clobbered by the running simulation; a separate
 *  read-only block shows the body's live position/velocity. */
export function BodyEditor({ store }: { store: OrbitLabStore }) {
  const { selectedId } = store;
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setForm(null);
      return;
    }
    const b = store.getBodySnapshot(selectedId);
    if (!b) {
      setForm(null);
      return;
    }
    setForm({
      name: b.name,
      mass: String(b.mass),
      radius: String(b.radius),
      color: b.color,
      px: String(b.position.x),
      py: String(b.position.y),
      pz: String(b.position.z),
      vx: String(b.velocity.x),
      vy: String(b.velocity.y),
      vz: String(b.velocity.z),
    });
    // Re-seed only when the selected id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!selectedId || !form) {
    return (
      <div className="editor-empty">
        Select a body — click it in the viewport or the list above — to edit its mass, orbit, color,
        and trail, or to focus the camera on it.
      </div>
    );
  }

  const id = selectedId;
  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));

  const commitField = (key: keyof Form, value: string) => {
    patch({ [key]: value } as Partial<Form>);
    if (key === 'name') store.updateBody(id, { name: value });
    else if (key === 'color') store.updateBody(id, { color: value });
    else if (key === 'mass') store.updateBody(id, { mass: Math.max(num(value), 0) });
    else if (key === 'radius') store.updateBody(id, { radius: Math.max(num(value), 1e-6) });
  };

  const commitVector = (kind: 'position' | 'velocity', next: Form) => {
    if (kind === 'position') {
      store.updateBody(id, { position: new Vector3(num(next.px), num(next.py), num(next.pz)) });
    } else {
      store.updateBody(id, { velocity: new Vector3(num(next.vx), num(next.vy), num(next.vz)) });
    }
  };

  const setP = (axis: 'px' | 'py' | 'pz', value: string) => {
    const next = { ...form, [axis]: value };
    setForm(next);
    commitVector('position', next);
  };
  const setV = (axis: 'vx' | 'vy' | 'vz', value: string) => {
    const next = { ...form, [axis]: value };
    setForm(next);
    commitVector('velocity', next);
  };

  const live = store.selectedReadout;
  const body = store.bodies.find((b) => b.id === id);

  return (
    <div>
      <div className="field">
        <div className="field__sub">Label</div>
        <input
          className="text-input"
          value={form.name}
          onChange={(e) => commitField('name', e.target.value)}
        />
      </div>

      <div className="swatch-row field">
        <input
          type="color"
          value={form.color}
          onChange={(e) => commitField('color', e.target.value)}
          aria-label="Body color"
        />
        <div style={{ flex: 1 }}>
          <div className="field__sub">Color</div>
          <input
            className="text-input mono"
            value={form.color}
            onChange={(e) => commitField('color', e.target.value)}
          />
        </div>
      </div>

      <div className="row-2 field">
        <div>
          <div className="field__sub">Mass</div>
          <input
            className="num-input"
            value={form.mass}
            inputMode="decimal"
            onChange={(e) => commitField('mass', e.target.value)}
          />
        </div>
        <div>
          <div className="field__sub">Radius</div>
          <input
            className="num-input"
            value={form.radius}
            inputMode="decimal"
            onChange={(e) => commitField('radius', e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <div className="field__sub">Position (x, y, z)</div>
        <div className="vec-grid">
          <input className="num-input" value={form.px} onChange={(e) => setP('px', e.target.value)} />
          <input className="num-input" value={form.py} onChange={(e) => setP('py', e.target.value)} />
          <input className="num-input" value={form.pz} onChange={(e) => setP('pz', e.target.value)} />
        </div>
      </div>

      <div className="field">
        <div className="field__sub">Velocity (x, y, z)</div>
        <div className="vec-grid">
          <input className="num-input" value={form.vx} onChange={(e) => setV('vx', e.target.value)} />
          <input className="num-input" value={form.vy} onChange={(e) => setV('vy', e.target.value)} />
          <input className="num-input" value={form.vz} onChange={(e) => setV('vz', e.target.value)} />
        </div>
      </div>

      {live && (
        <div className="tele field" style={{ marginTop: 4 }}>
          <div className="tele__label">Live state</div>
          <div className="tele__value" style={{ fontSize: 12 }}>
            speed {fmt(live.speed)} · |r| {fmt(live.distanceFromOrigin)}
          </div>
          <div className="field__sub" style={{ marginTop: 6 }}>
            pos {fmtVec(live.position)}
          </div>
          <div className="field__sub">vel {fmtVec(live.velocity)}</div>
        </div>
      )}

      <div className="btn-row field" style={{ marginTop: 10 }}>
        <button
          className={`btn btn--sm ${store.isFollowing(id) ? 'btn--primary' : ''}`}
          onClick={() => store.focusBody(id)}
        >
          ◎ Focus
        </button>
        <button
          className={`btn btn--sm ${body?.locked ? 'btn--primary' : ''}`}
          onClick={() => store.toggleLock(id)}
        >
          {body?.locked ? '🔒 Locked' : '🔓 Lock'}
        </button>
        <button
          className={`btn btn--sm ${body?.showTrail ? 'btn--primary' : ''}`}
          onClick={() => store.toggleTrail(id)}
        >
          ∿ Trail
        </button>
      </div>

      <div className="editor-actions">
        <button className="btn btn--sm" onClick={() => store.duplicateBody(id)}>
          ⧉ Duplicate
        </button>
        <button className="btn btn--sm btn--danger" onClick={() => store.deleteBody(id)}>
          ✕ Delete
        </button>
      </div>
    </div>
  );
}
