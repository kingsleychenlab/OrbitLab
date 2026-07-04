import { Vector3 } from './Vector3';
import {
  createBody,
  cloneBody,
  bodyToJSON,
  bodyFromJSON,
  nextBodyId,
  type Body,
  type BodyJSON,
} from './Body';
import { getIntegrator, type IntegratorName } from './integrators';
import { resolveCollisions, type CollisionEvent } from './collisions';
import {
  computeMetrics,
  linearMomentum,
  angularMomentum,
  centerOfMass,
  totalMass,
  totalEnergy,
  relativeDrift,
  vectorDrift,
} from './metrics';

/**
 * A fully self-describing initial system. Presets return this; save/load round-
 * trips through it. It carries the physics parameters (G, softening, dt) so each
 * preset stays internally consistent in its own unit convention, plus a few
 * render hints the UI uses for a pleasant first view.
 */
export interface SystemDefinition {
  name: string;
  description: string;
  bodies: Body[];
  G: number;
  softening: number;
  dt: number;
  integrator: IntegratorName;
  collisionsEnabled: boolean;
  /** Render hint: multiply positions by this to get scene units. */
  suggestedDistanceScale: number;
  /** Render hint: multiply radii by this to get drawn sphere size. */
  suggestedRadiusScale: number;
  /** Render hint: pleasant default simulation speed (physics steps / frame). */
  suggestedStepsPerFrame: number;
}

export interface SimulationParams {
  G: number;
  softening: number;
  dt: number;
  integrator: IntegratorName;
  collisionsEnabled: boolean;
}

/** One row of the metrics time-series, consumed by the graph panels. */
export interface HistorySample {
  t: number;
  energy: number;
  energyDrift: number;
  angularMomentumDrift: number;
  comDrift: number;
  momentumDrift: number;
}

/** Full diagnostic snapshot for the Accuracy Panel. */
export interface DriftMetrics {
  kinetic: number;
  potential: number;
  total: number;
  energyDrift: number;
  momentumDrift: number;
  angularMomentumDrift: number;
  comDrift: number;
  momentum: Vector3;
  angularMomentum: Vector3;
  centerOfMass: Vector3;
  totalMass: number;
  time: number;
  stepCount: number;
  bodyCount: number;
  integrator: IntegratorName;
  dt: number;
}

/** Baseline (t = 0) references and characteristic scales used for drift. */
interface Baseline {
  energy: number;
  momentum: Vector3;
  angularMomentum: Vector3;
  com: Vector3;
  comVelocity: Vector3;
  momentumScale: number;
  angularScale: number;
  lengthScale: number;
}

const MAX_HISTORY = 600;
const MAX_EVENTS = 250;

/**
 * The engine. Owns the authoritative dynamical state and advances it in time.
 *
 * It is a plain class with ZERO dependency on React or Three.js: the renderer
 * reads `bodies` each frame, and the UI drives it through these methods. This is
 * the boundary that keeps physics out of the view layer.
 *
 * Drift bookkeeping: at load/reset it records the conserved quantities at t = 0
 * (energy, momentum, angular momentum, center of mass) and a few characteristic
 * scales, then reports every later state relative to those.
 */
export class Simulation {
  bodies: Body[] = [];
  params: SimulationParams;
  name = 'Custom system';
  description = '';
  time = 0;
  stepCount = 0;

  history: HistorySample[] = [];
  collisionEvents: CollisionEvent[] = [];

  private initialBodies: Body[] = [];
  private baseline: Baseline;
  private sampleEvery = 1;
  private sampleCounter = 0;

  constructor(def: SystemDefinition) {
    this.params = {
      G: def.G,
      softening: def.softening,
      dt: def.dt,
      integrator: def.integrator,
      collisionsEnabled: def.collisionsEnabled,
    };
    this.baseline = this.emptyBaseline();
    this.loadSystem(def);
  }

  // ─────────────────────────── lifecycle ───────────────────────────

  loadSystem(def: SystemDefinition): void {
    this.name = def.name;
    this.description = def.description;
    this.params = {
      G: def.G,
      softening: def.softening,
      dt: def.dt,
      integrator: def.integrator,
      collisionsEnabled: def.collisionsEnabled,
    };
    this.bodies = def.bodies.map(cloneBody);
    this.initialBodies = def.bodies.map(cloneBody);
    this.time = 0;
    this.stepCount = 0;
    this.collisionEvents = [];
    this.captureBaseline();
    this.resetHistory();
  }

  /** Revert to the initial snapshot (positions, velocities, body list). */
  reset(): void {
    this.bodies = this.initialBodies.map(cloneBody);
    this.time = 0;
    this.stepCount = 0;
    this.collisionEvents = [];
    this.captureBaseline();
    this.resetHistory();
  }

  // ─────────────────────────── stepping ───────────────────────────

  /** Advance the whole system by one timestep (defaults to params.dt). */
  step(overrideDt?: number): void {
    const dt = overrideDt ?? this.params.dt;
    const integrate = getIntegrator(this.params.integrator);
    integrate(this.bodies, dt, this.params.G, this.params.softening);

    if (this.params.collisionsEnabled) {
      const { bodies, events } = resolveCollisions(this.bodies, {
        enabled: true,
        overlapFactor: 1,
        time: this.time + dt,
      });
      if (events.length > 0) {
        this.bodies = bodies;
        this.collisionEvents.push(...events);
        if (this.collisionEvents.length > MAX_EVENTS) {
          this.collisionEvents.splice(0, this.collisionEvents.length - MAX_EVENTS);
        }
      }
    }

    this.time += dt;
    this.stepCount += 1;
    this.recordHistory();
  }

  /** Run `n` steps back-to-back (used to advance many steps per render frame). */
  stepMany(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  // ─────────────────────────── body editing ───────────────────────────

  getBody(id: string): Body | undefined {
    return this.bodies.find((b) => b.id === id);
  }

  addBody(partial: Parameters<typeof createBody>[0] = {}): Body {
    const b = createBody(partial);
    this.bodies.push(b);
    this.syncInitialIfAtStart();
    return b;
  }

  removeBody(id: string): void {
    this.bodies = this.bodies.filter((b) => b.id !== id);
    this.syncInitialIfAtStart();
  }

  /** Deep-copy a body, offset slightly so it is visible, and insert it. */
  duplicateBody(id: string): Body | undefined {
    const src = this.getBody(id);
    if (!src) return undefined;
    const copy = cloneBody(src);
    copy.id = nextBodyId();
    copy.name = `${src.name} copy`;
    // Nudge by 2% of its orbital radius so the duplicate is not exactly coincident.
    const nudge = Math.max(src.position.length() * 0.02, src.radius * 2, 1e-3);
    copy.position.x += nudge;
    this.bodies.push(copy);
    this.syncInitialIfAtStart();
    return copy;
  }

  /** Patch a body's fields; Vector3 fields are copied, not aliased. */
  updateBody(id: string, patch: Partial<Body>): void {
    const b = this.getBody(id);
    if (!b) return;
    if (patch.name !== undefined) b.name = patch.name;
    if (patch.mass !== undefined) b.mass = patch.mass;
    if (patch.radius !== undefined) b.radius = patch.radius;
    if (patch.color !== undefined) b.color = patch.color;
    if (patch.locked !== undefined) b.locked = patch.locked;
    if (patch.showTrail !== undefined) b.showTrail = patch.showTrail;
    if (patch.position !== undefined) b.position.copy(patch.position);
    if (patch.velocity !== undefined) b.velocity.copy(patch.velocity);
    this.syncInitialIfAtStart();
  }

  /**
   * If the sim is still at t = 0, treat edits as (re)defining the initial
   * conditions: re-snapshot and re-baseline so a later reset returns here and
   * energy drift is measured against the edited start.
   */
  private syncInitialIfAtStart(): void {
    if (this.time === 0 && this.stepCount === 0) {
      this.initialBodies = this.bodies.map(cloneBody);
      this.captureBaseline();
      this.resetHistory();
    }
  }

  // ─────────────────────────── params ───────────────────────────

  setIntegrator(name: IntegratorName): void {
    this.params.integrator = name;
  }

  setParams(patch: Partial<SimulationParams>): void {
    Object.assign(this.params, patch);
  }

  // ─────────────────────────── metrics ───────────────────────────

  /** Everything the Accuracy Panel needs, computed fresh from current state. */
  getDriftMetrics(): DriftMetrics {
    const m = computeMetrics(this.bodies, this.params.G, this.params.softening);
    const b = this.baseline;

    // COM should move uniformly (internal forces don't accelerate it), so the
    // "drift" is deviation from the straight inertial line R0 + V_cm0·t.
    const expectedCom = b.com.add(b.comVelocity.scale(this.time));

    return {
      kinetic: m.kinetic,
      potential: m.potential,
      total: m.total,
      energyDrift: relativeDrift(m.total, b.energy),
      momentumDrift: vectorDrift(m.momentum, b.momentum, b.momentumScale),
      angularMomentumDrift: vectorDrift(m.angularMomentum, b.angularMomentum, b.angularScale),
      comDrift: vectorDrift(m.centerOfMass, expectedCom, b.lengthScale),
      momentum: m.momentum,
      angularMomentum: m.angularMomentum,
      centerOfMass: m.centerOfMass,
      totalMass: m.totalMass,
      time: this.time,
      stepCount: this.stepCount,
      bodyCount: this.bodies.length,
      integrator: this.params.integrator,
      dt: this.params.dt,
    };
  }

  private captureBaseline(): void {
    const p = linearMomentum(this.bodies);
    const l = angularMomentum(this.bodies);
    const com = centerOfMass(this.bodies);
    const m = totalMass(this.bodies);
    const energy = totalEnergy(this.bodies, this.params.G, this.params.softening);

    // Characteristic scales make the drifts dimensionless & well-behaved even
    // when a conserved quantity is ~0 at t=0 (e.g. P ≈ 0 in the COM frame).
    const lengthScale = this.characteristicLength();
    const charSpeed = lengthScale > 0 ? Math.sqrt((this.params.G * m) / lengthScale) : 1;

    let sumMV = 0;
    let sumMRV = 0;
    for (const body of this.bodies) {
      const speed = body.velocity.length();
      sumMV += body.mass * speed;
      sumMRV += body.mass * body.position.length() * speed;
    }
    const momentumScale = sumMV > 1e-12 ? sumMV : Math.max(m * charSpeed, 1e-12);
    const angularScale = sumMRV > 1e-12 ? sumMRV : Math.max(m * lengthScale * charSpeed, 1e-12);

    this.baseline = {
      energy,
      momentum: p,
      angularMomentum: l,
      com,
      comVelocity: m > 0 ? p.scale(1 / m) : Vector3.zero(),
      momentumScale,
      angularScale,
      lengthScale: Math.max(lengthScale, 1e-9),
    };
  }

  /** Largest pairwise separation at t=0 (falls back to max radius / 1). */
  private characteristicLength(): number {
    let maxDist = 0;
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const d = this.bodies[i].position.distanceTo(this.bodies[j].position);
        if (d > maxDist) maxDist = d;
      }
    }
    if (maxDist > 0) return maxDist;
    let maxR = 0;
    for (const b of this.bodies) maxR = Math.max(maxR, b.position.length(), b.radius);
    return maxR > 0 ? maxR : 1;
  }

  private emptyBaseline(): Baseline {
    return {
      energy: 0,
      momentum: Vector3.zero(),
      angularMomentum: Vector3.zero(),
      com: Vector3.zero(),
      comVelocity: Vector3.zero(),
      momentumScale: 1,
      angularScale: 1,
      lengthScale: 1,
    };
  }

  // ─────────────────────────── history buffer ───────────────────────────

  private resetHistory(): void {
    this.history = [];
    this.sampleEvery = 1;
    this.sampleCounter = 0;
    this.recordHistory(); // seed the t=0 point
  }

  /**
   * Record a metrics sample, keeping at most MAX_HISTORY points spanning the
   * whole run: when full, decimate to every other sample and double the stride.
   */
  private recordHistory(): void {
    this.sampleCounter += 1;
    if (this.sampleCounter % this.sampleEvery !== 0 && this.history.length > 0) return;

    const d = this.getDriftMetrics();
    this.history.push({
      t: this.time,
      energy: d.total,
      energyDrift: d.energyDrift,
      angularMomentumDrift: d.angularMomentumDrift,
      comDrift: d.comDrift,
      momentumDrift: d.momentumDrift,
    });

    if (this.history.length >= MAX_HISTORY) {
      this.history = this.history.filter((_, i) => i % 2 === 0);
      this.sampleEvery *= 2;
    }
  }

  // ─────────────────────────── serialization ───────────────────────────

  /** Save the current state as a JSON-serializable object. */
  serialize(): SerializedSystem {
    return {
      version: 1,
      name: this.name,
      description: this.description,
      params: { ...this.params },
      bodies: this.bodies.map(bodyToJSON),
    };
  }

  toJSONString(): string {
    return JSON.stringify(this.serialize(), null, 2);
  }

  /** Load a serialized system as fresh initial conditions (clock reset to 0). */
  loadSerialized(data: SerializedSystem): void {
    this.loadSystem({
      name: data.name ?? 'Loaded system',
      description: data.description ?? '',
      bodies: data.bodies.map(bodyFromJSON),
      G: data.params.G,
      softening: data.params.softening,
      dt: data.params.dt,
      integrator: data.params.integrator,
      collisionsEnabled: data.params.collisionsEnabled,
      suggestedDistanceScale: 1,
      suggestedRadiusScale: 1,
      suggestedStepsPerFrame: 4,
    });
  }

  /** Current body states as CSV — the literal per-body simulation data. */
  toBodiesCSV(): string {
    const header = 'id,name,mass,radius,x,y,z,vx,vy,vz,locked';
    const rows = this.bodies.map((b) =>
      [
        b.id,
        csvEscape(b.name),
        b.mass,
        b.radius,
        b.position.x,
        b.position.y,
        b.position.z,
        b.velocity.x,
        b.velocity.y,
        b.velocity.z,
        b.locked ? 1 : 0,
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  /** Recorded metrics time-series as CSV. */
  toMetricsCSV(): string {
    const header = 't,energy,energyDrift,angularMomentumDrift,comDrift,momentumDrift';
    const rows = this.history.map((h) =>
      [h.t, h.energy, h.energyDrift, h.angularMomentumDrift, h.comDrift, h.momentumDrift].join(','),
    );
    return [header, ...rows].join('\n');
  }
}

export interface SerializedSystem {
  version: number;
  name: string;
  description: string;
  params: SimulationParams;
  bodies: BodyJSON[];
}

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
