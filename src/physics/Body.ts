import { Vector3 } from './Vector3';

/**
 * A gravitating point mass. This is the single domain object shared by the
 * physics engine, the renderer, and the UI. It carries both dynamical state
 * (mass, position, velocity) and presentation metadata (color, label, trail).
 *
 * `radius` is a physical quantity in length units: it is used for collision
 * detection and, after a display scale is applied, for how large the sphere is
 * drawn. It does NOT affect the gravitational field (bodies are point masses).
 *
 * A `locked` body still acts as a source of gravity on everything else, but the
 * integrator never updates its own position or velocity — handy for pinning a
 * central star or setting up controlled demos.
 */
export interface Body {
  id: string;
  name: string;
  /** Mass in simulation mass units (M_sun for astronomical presets). */
  mass: number;
  /** Physical radius in length units. Used for collisions + (scaled) rendering. */
  radius: number;
  /** Position vector, length units. */
  position: Vector3;
  /** Velocity vector, length/time units. */
  velocity: Vector3;
  /** Hex color string, e.g. "#ffcc55", used by the renderer. */
  color: string;
  /** If true the integrator holds this body fixed (still gravitates others). */
  locked: boolean;
  /** Per-body toggle for drawing an orbit trail. */
  showTrail: boolean;
}

/** Plain-JSON form of a Body, produced by save/export and consumed by load. */
export interface BodyJSON {
  id: string;
  name: string;
  mass: number;
  radius: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  color: string;
  locked: boolean;
  showTrail: boolean;
}

let idCounter = 0;
/** Monotonic id generator; stable within a session, unique per body. */
export function nextBodyId(): string {
  idCounter += 1;
  return `b${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export interface CreateBodyOptions {
  name?: string;
  mass?: number;
  radius?: number;
  position?: Vector3;
  velocity?: Vector3;
  color?: string;
  locked?: boolean;
  showTrail?: boolean;
  id?: string;
}

/** Factory that fills sensible defaults so callers only specify what matters. */
export function createBody(opts: CreateBodyOptions = {}): Body {
  return {
    id: opts.id ?? nextBodyId(),
    name: opts.name ?? 'Body',
    mass: opts.mass ?? 1,
    radius: opts.radius ?? 0.1,
    position: opts.position ? opts.position.clone() : Vector3.zero(),
    velocity: opts.velocity ? opts.velocity.clone() : Vector3.zero(),
    color: opts.color ?? '#8ab4ff',
    locked: opts.locked ?? false,
    showTrail: opts.showTrail ?? true,
  };
}

/** Deep clone — position/velocity are copied so the source is never aliased. */
export function cloneBody(b: Body): Body {
  return {
    ...b,
    position: b.position.clone(),
    velocity: b.velocity.clone(),
  };
}

export function bodyToJSON(b: Body): BodyJSON {
  return {
    id: b.id,
    name: b.name,
    mass: b.mass,
    radius: b.radius,
    position: b.position.toJSON(),
    velocity: b.velocity.toJSON(),
    color: b.color,
    locked: b.locked,
    showTrail: b.showTrail,
  };
}

export function bodyFromJSON(j: BodyJSON): Body {
  return {
    id: j.id ?? nextBodyId(),
    name: j.name ?? 'Body',
    mass: j.mass ?? 1,
    radius: j.radius ?? 0.1,
    position: Vector3.from(j.position),
    velocity: Vector3.from(j.velocity),
    color: j.color ?? '#8ab4ff',
    locked: j.locked ?? false,
    showTrail: j.showTrail ?? true,
  };
}
