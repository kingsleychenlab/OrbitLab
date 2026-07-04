/**
 * Minimal, dependency-free 3D vector used throughout the physics engine.
 *
 * It deliberately does NOT import Three.js — the engine must stay framework and
 * renderer agnostic so it can run in Node (tests) and be reasoned about in
 * isolation. The renderer converts these into THREE.Vector3 at the boundary.
 *
 * Two styles of method are provided on purpose:
 *   - Pure methods (`add`, `sub`, `scale`, `cross`, ...) return a new vector and
 *     never mutate. These read cleanly and are used in tests and cold paths.
 *   - In-place methods (`addInPlace`, `addScaledInPlace`, ...) mutate `this` and
 *     return it. These avoid allocations inside the O(N^2) gravity/integrator
 *     hot loops, which matters for larger systems (e.g. the asteroid belt).
 */
export class Vector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  /** Build from anything with x/y/z (e.g. a plain JSON object). */
  static from(v: { x: number; y: number; z: number }): Vector3 {
    return new Vector3(v.x, v.y, v.z);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  // ---- pure (allocating) operations ----

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  /** Vector (cross) product: this × v. */
  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  // ---- in-place (allocation-free) operations for hot loops ----

  addInPlace(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  subInPlace(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  scaleInPlace(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  /** this += v * s  (fused multiply-add, no temporary allocation). */
  addScaledInPlace(v: Vector3, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }

  // ---- scalar reductions ----

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  distanceToSq(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSq(v));
  }

  /** Returns a new unit vector; returns a zero vector if length is 0. */
  normalize(): Vector3 {
    const len = this.length();
    return len > 0 ? this.scale(1 / len) : Vector3.zero();
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  toJSON(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }
}
