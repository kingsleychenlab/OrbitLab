import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Body } from '../physics';
import type { ViewOptions } from './types';
import { BodyView } from './BodyView';
import { TrailView } from './TrailView';
import { createStarfield } from './three-utils';

export type FrameCallback = (dtSeconds: number) => void;
export type SelectCallback = (id: string | null) => void;

const GRID_COLOR = new THREE.Color('#2a3d55');
const GRID_COLOR_INNER = new THREE.Color('#37506e');

/**
 * The imperative Three.js layer. It owns the WebGL context, camera, controls,
 * starfield, reference grid, and the per-body / trail views, and runs the
 * render loop. React mounts it once and then only pushes plain data in
 * (`syncBodies`) or calls intent methods (`focusOn`, `frameSystem`). No physics
 * lives here — the frame callback is where the app advances the simulation, and
 * this class merely draws whatever bodies it is handed.
 */
export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private bodyView = new BodyView();
  private trailView = new TrailView();
  private grid: THREE.PolarGridHelper;
  private starfield: THREE.Points;

  private frameCallback: FrameCallback | null = null;
  private onSelect: SelectCallback | null = null;
  private followId: string | null = null;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downPos = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private lastTime = performance.now();
  private fps = 0;

  constructor(private container: HTMLElement) {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    this.scene.background = new THREE.Color('#05060d');

    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.01, 200000);
    this.camera.position.set(0, 14, 26);

    // preserveDrawingBuffer keeps the frame readable for screenshots/exports and
    // avoids blank captures under software rendering; the cost is negligible for
    // this scene size.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.classList.add('orbit-canvas');
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    const labelEl = this.labelRenderer.domElement;
    labelEl.style.position = 'absolute';
    labelEl.style.top = '0';
    labelEl.style.left = '0';
    labelEl.style.pointerEvents = 'none';
    container.appendChild(labelEl);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.75;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 150000;

    // Lighting: bodies are emissive, but a soft key + fill gives spheres form.
    this.scene.add(new THREE.AmbientLight(0x2b3550, 1.1));
    const key = new THREE.PointLight(0xffffff, 1.4, 0, 0.0);
    key.position.set(0, 0, 0);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
    fill.position.set(1, 0.6, 1);
    this.scene.add(fill);

    // Ecliptic reference grid (polar → radial + circular, suits orbital motion).
    this.grid = new THREE.PolarGridHelper(20, 8, 6, 72, GRID_COLOR_INNER, GRID_COLOR);
    const gridMat = this.grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.22;
    gridMat.depthWrite = false;
    this.scene.add(this.grid);

    this.starfield = createStarfield();
    this.scene.add(this.starfield);

    this.scene.add(this.trailView.group);
    this.scene.add(this.bodyView.group);

    // Interaction: click to select / deselect a body.
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerup', this.handlePointerUp);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.renderer.setAnimationLoop(this.animate);
  }

  setFrameCallback(cb: FrameCallback | null): void {
    this.frameCallback = cb;
  }

  setOnSelect(cb: SelectCallback | null): void {
    this.onSelect = cb;
  }

  getFps(): number {
    return this.fps;
  }

  /** Push the current bodies + view options into the scene (called each frame). */
  syncBodies(bodies: readonly Body[], view: ViewOptions): void {
    this.bodyView.sync(bodies, view);
    this.trailView.sync(bodies, view);
  }

  /** Smoothly track a body id with the camera; pass null to stop following. */
  focusOn(id: string | null): void {
    this.followId = id;
  }

  isFollowing(id: string): boolean {
    return this.followId === id;
  }

  /** Position the camera to frame a system of the given physics radius. */
  frameSystem(physicsRadius: number, distanceScale: number): void {
    const r = Math.max(physicsRadius * distanceScale, 1);
    this.followId = null;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(r * 0.18, r * 0.62, r * 1.35);
    this.camera.near = Math.max(r * 1e-3, 0.01);
    // Far must comfortably contain the starfield shell (radius ~4200).
    this.camera.far = Math.max(r * 60, 12000);
    this.camera.updateProjectionMatrix();
    // Resize the reference grid to match the system.
    this.rebuildGrid(r * 1.35);
    this.controls.update();
  }

  private rebuildGrid(radius: number): void {
    this.scene.remove(this.grid);
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
    this.grid = new THREE.PolarGridHelper(radius, 8, 6, 72, GRID_COLOR_INNER, GRID_COLOR);
    const gridMat = this.grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.2;
    gridMat.depthWrite = false;
    this.scene.add(this.grid);
  }

  /** Forget all trail points (used on reset / preset load). */
  clearTrails(): void {
    this.trailView.clear();
  }

  /** Drop all body + trail meshes (used before loading a new preset). */
  resetScene(): void {
    this.bodyView.clear();
    this.trailView.clear();
    this.followId = null;
  }

  private animate = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.fps = this.fps * 0.9 + (1 / Math.max(dt, 1e-4)) * 0.1;

    // The app advances physics and calls syncBodies from inside this callback.
    if (this.frameCallback) this.frameCallback(dt);

    this.updateFollow();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  private updateFollow(): void {
    if (!this.followId) return;
    const target = this.bodyView.scenePositionOf(this.followId);
    if (!target) {
      this.followId = null;
      return;
    }
    // Move both the camera and the orbit pivot toward the body, preserving the
    // user's current viewing offset so they can still rotate while following.
    const delta = target.clone().sub(this.controls.target).multiplyScalar(0.35);
    this.controls.target.add(delta);
    this.camera.position.add(delta);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.downPos.set(e.clientX, e.clientY);
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    // Ignore drags (camera rotation) — only treat a near-stationary click as a pick.
    if (this.downPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.bodyView.pickables(), false);
    if (hits.length > 0) {
      this.onSelect?.(hits[0].object.userData.id as string);
    } else {
      this.onSelect?.(null);
    }
  };

  private handleResize = (): void => {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  };

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.dispose();
    this.bodyView.dispose();
    this.trailView.dispose();
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
    this.starfield.geometry.dispose();
    (this.starfield.material as THREE.Material).dispose();
    this.renderer.dispose();
    dom.remove();
    this.labelRenderer.domElement.remove();
  }
}
