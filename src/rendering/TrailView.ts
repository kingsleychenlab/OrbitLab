import * as THREE from 'three';
import { Vector3 as PhysVec, type Body } from '../physics';
import type { ViewOptions } from './types';
import { toSceneVec, cssColor } from './three-utils';

interface TrailEntry {
  line: THREE.Line;
  positions: Float32Array;
  colors: Float32Array;
  /** Recent PHYSICS-space samples (mapped to scene each frame so a change of
   *  distance scale re-projects the whole trail without kinking). */
  samples: PhysVec[];
  capacity: number;
}

/**
 * Orbit trails rendered as additive vertex-colored lines that fade from the
 * body's color at the head to black at the tail. Because the blend is additive,
 * "fades to black" reads as "fades to invisible" — a phosphor-persistence look
 * borrowed from radar and oscilloscope screens.
 *
 * Trails are stored in physics coordinates and re-projected every frame, so the
 * distance-scale slider never leaves a broken seam behind.
 */
export class TrailView {
  readonly group = new THREE.Group();
  private entries = new Map<string, TrailEntry>();

  sync(bodies: readonly Body[], view: ViewOptions): void {
    const seen = new Set<string>();
    const capacity = Math.max(2, Math.floor(view.trailLength));

    for (const body of bodies) {
      const active = view.showTrails && body.showTrail;
      if (!active) {
        // Trail turned off: drop any existing line so it disappears cleanly.
        const existing = this.entries.get(body.id);
        if (existing) {
          this.disposeEntry(existing);
          this.entries.delete(body.id);
        }
        continue;
      }

      seen.add(body.id);
      let entry = this.entries.get(body.id);
      if (!entry || entry.capacity !== capacity) {
        if (entry) this.disposeEntry(entry);
        entry = this.createEntry(capacity);
        this.entries.set(body.id, entry);
      }

      // Append the latest sample, keeping at most `capacity`.
      entry.samples.push(new PhysVec(body.position.x, body.position.y, body.position.z));
      if (entry.samples.length > capacity) entry.samples.shift();

      this.rebuild(entry, body, view);
    }

    for (const [id, entry] of this.entries) {
      if (!seen.has(id)) {
        this.disposeEntry(entry);
        this.entries.delete(id);
      }
    }
  }

  private rebuild(entry: TrailEntry, body: Body, view: ViewOptions): void {
    const n = entry.samples.length;
    const base = cssColor(body.color);
    const tmp = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      toSceneVec(entry.samples[i], view.distanceScale, tmp);
      entry.positions[i * 3 + 0] = tmp.x;
      entry.positions[i * 3 + 1] = tmp.y;
      entry.positions[i * 3 + 2] = tmp.z;

      // Head (newest) is brightest; tail fades. Without fade, keep it uniform-ish.
      const headFrac = n > 1 ? i / (n - 1) : 1;
      const intensity = view.trailFade ? headFrac * headFrac : 0.35 + 0.5 * headFrac;
      entry.colors[i * 3 + 0] = base.r * intensity;
      entry.colors[i * 3 + 1] = base.g * intensity;
      entry.colors[i * 3 + 2] = base.b * intensity;
    }

    const geo = entry.line.geometry;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, n);
    geo.computeBoundingSphere();
  }

  private createEntry(capacity: number): TrailEntry {
    const positions = new Float32Array(capacity * 3);
    const colors = new Float32Array(capacity * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, material);
    line.frustumCulled = false;
    this.group.add(line);
    return { line, positions, colors, samples: [], capacity };
  }

  private disposeEntry(entry: TrailEntry): void {
    this.group.remove(entry.line);
    entry.line.geometry.dispose();
    (entry.line.material as THREE.Material).dispose();
  }

  /** Forget all recorded points (e.g. on reset) without destroying lines. */
  clear(): void {
    for (const entry of this.entries.values()) this.disposeEntry(entry);
    this.entries.clear();
  }

  dispose(): void {
    this.clear();
  }
}
