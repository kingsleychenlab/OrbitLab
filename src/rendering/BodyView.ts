import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Body } from '../physics';
import type { ViewOptions } from './types';
import { toSceneVec, getGlowTexture, getRingTexture, cssColor } from './three-utils';

interface BodyEntry {
  core: THREE.Mesh;
  glow: THREE.Sprite;
  ring: THREE.Sprite; // selection halo
  label: CSS2DObject;
  labelEl: HTMLDivElement;
}

const MIN_DRAW_RADIUS = 0.06; // scene units — keeps tiny bodies clickable/visible
const SELECT_COLOR = '#ffb454';

/**
 * Owns the Three.js objects for every body: a lit sphere (`core`), an additive
 * glow sprite that fakes a bloom halo cheaply, a name label (CSS2D), and a
 * selection ring. It reconciles that set against the simulation's body list
 * each frame — creating meshes for new bodies and disposing meshes for bodies
 * that were merged or deleted — and never touches physics.
 */
export class BodyView {
  readonly group = new THREE.Group();
  private entries = new Map<string, BodyEntry>();
  private sphereGeo = new THREE.SphereGeometry(1, 24, 24);

  /** Meshes that can be clicked to select a body. */
  pickables(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    for (const e of this.entries.values()) list.push(e.core);
    return list;
  }

  /** Scene-space position of a body's core (for camera follow); null if gone. */
  scenePositionOf(id: string): THREE.Vector3 | null {
    const e = this.entries.get(id);
    return e ? e.core.position : null;
  }

  sync(bodies: readonly Body[], view: ViewOptions): void {
    const seen = new Set<string>();

    for (const body of bodies) {
      seen.add(body.id);
      let entry = this.entries.get(body.id);
      if (!entry) entry = this.createEntry(body);

      const color = cssColor(body.color);

      // Position.
      toSceneVec(body.position, view.distanceScale, entry.core.position);
      entry.glow.position.copy(entry.core.position);
      entry.ring.position.copy(entry.core.position);

      // Sphere size (clamped so specks stay visible & clickable).
      const drawR = Math.max(body.radius * view.radiusScale, MIN_DRAW_RADIUS);
      entry.core.scale.setScalar(drawR);

      const mat = entry.core.material as THREE.MeshStandardMaterial;
      mat.color.copy(color);
      mat.emissive.copy(color);

      // Glow scales with the body and its color; locked bodies glow a touch less.
      const glowSize = drawR * 5 + 0.22;
      entry.glow.scale.setScalar(glowSize);
      (entry.glow.material as THREE.SpriteMaterial).color.copy(color);
      (entry.glow.material as THREE.SpriteMaterial).opacity = body.locked ? 0.6 : 0.9;

      // Selection ring.
      const selected = view.selectedId === body.id;
      entry.ring.visible = selected;
      if (selected) entry.ring.scale.setScalar(drawR * 6 + 0.4);

      // Label.
      entry.labelEl.textContent = body.name;
      entry.labelEl.style.color = body.color;
      entry.labelEl.classList.toggle('body-label--selected', selected);
      entry.label.visible = view.showLabels;
    }

    // Remove bodies that no longer exist (merged away / deleted).
    for (const [id, entry] of this.entries) {
      if (!seen.has(id)) {
        this.disposeEntry(entry);
        this.entries.delete(id);
      }
    }
  }

  private createEntry(body: Body): BodyEntry {
    const material = new THREE.MeshStandardMaterial({
      color: cssColor(body.color),
      emissive: cssColor(body.color),
      emissiveIntensity: 0.9,
      roughness: 0.4,
      metalness: 0.0,
    });
    const core = new THREE.Mesh(this.sphereGeo, material);
    core.userData.id = body.id;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: cssColor(body.color),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.75,
      }),
    );

    const ring = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getRingTexture(),
        color: new THREE.Color(SELECT_COLOR),
        transparent: true,
        depthWrite: false,
        opacity: 0.95,
      }),
    );
    ring.visible = false;

    const labelEl = document.createElement('div');
    labelEl.className = 'body-label';
    labelEl.textContent = body.name;
    const label = new CSS2DObject(labelEl);
    label.position.set(0, 1.6, 0);
    label.center.set(0, 1);
    core.add(label);

    this.group.add(core, glow, ring);

    const entry: BodyEntry = { core, glow, ring, label, labelEl };
    this.entries.set(body.id, entry);
    return entry;
  }

  private disposeEntry(entry: BodyEntry): void {
    (entry.core.material as THREE.Material).dispose();
    (entry.glow.material as THREE.Material).dispose();
    (entry.ring.material as THREE.Material).dispose();
    entry.label.removeFromParent();
    entry.labelEl.remove();
    this.group.remove(entry.core, entry.glow, entry.ring);
  }

  /** Remove every body mesh (e.g. when loading a new preset). */
  clear(): void {
    for (const entry of this.entries.values()) this.disposeEntry(entry);
    this.entries.clear();
  }

  dispose(): void {
    this.clear();
    this.sphereGeo.dispose();
  }
}
