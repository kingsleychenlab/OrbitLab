import { useEffect } from 'react';
import type { OrbitLabStore } from '../state/useOrbitLab';

/**
 * Shown in place of the 3D view when WebGL can't start. It keeps the simulation
 * advancing on a timer so telemetry, the conservation graphs, and the accuracy
 * comparison still update — only the 3D rendering is missing.
 */
export function ViewportFallback({ store }: { store: OrbitLabStore }) {
  useEffect(() => {
    const timer = window.setInterval(() => store.headlessTick(), 33);
    return () => window.clearInterval(timer);
  }, [store]);

  return (
    <div className="viewport" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          3D viewport unavailable
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          This browser could not create a WebGL context, so the 3D scene can’t be drawn. Everything
          else still works — the physics engine keeps running headless, and the telemetry, graphs,
          and numerical-accuracy comparison update live. Enable hardware acceleration / WebGL to see
          the 3D view.
        </p>
      </div>
    </div>
  );
}
