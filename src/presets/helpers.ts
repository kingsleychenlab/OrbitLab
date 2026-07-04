import {
  Vector3,
  createBody,
  centerOfMass,
  linearMomentum,
  totalMass,
  type Body,
} from '../physics';

/** Circular orbital speed for a test body at radius r around mass M: v = √(GM/r). */
export function circularSpeed(G: number, centralMass: number, r: number): number {
  return Math.sqrt((G * centralMass) / r);
}

export interface OrbitParams {
  name: string;
  mass: number;
  radius: number;
  color: string;
  G: number;
  /** Effective mass the orbit is computed around (use M_central + m for 2-body). */
  centralMass: number;
  distance: number;
  /** Center position/velocity to add (the primary the body orbits). */
  center?: Vector3;
  centerVelocity?: Vector3;
  /** Starting angle in the orbital plane (radians). */
  phase?: number;
  /** Orbital inclination about the x-axis (radians) for a 3D look. */
  inclination?: number;
  /** Reverse the orbital direction. */
  retrograde?: boolean;
  /** Multiply the circular speed by (1 + kick) to make the orbit eccentric. */
  speedKick?: number;
  showTrail?: boolean;
}

/**
 * Create a body on a (by default circular) Keplerian orbit. The position starts
 * at `phase` in the orbital plane; velocity is perpendicular to it with the
 * circular-orbit magnitude. An `inclination` tilts the plane about the x-axis so
 * systems read as genuinely 3D. The orbit is placed relative to `center` and
 * boosted by `centerVelocity`, which is how moons/planets inherit their host's
 * motion. Nothing here hard-codes a path — these are just consistent initial
 * conditions handed to the gravity integrator.
 */
export function orbitingBody(p: OrbitParams): Body {
  const center = p.center ?? Vector3.zero();
  const centerVel = p.centerVelocity ?? Vector3.zero();
  const phase = p.phase ?? 0;
  const inc = p.inclination ?? 0;
  const dir = p.retrograde ? -1 : 1;
  const speed = circularSpeed(p.G, p.centralMass, p.distance) * (1 + (p.speedKick ?? 0));

  // In-plane position and (perpendicular) velocity, then tilt about x by `inc`.
  const px = Math.cos(phase) * p.distance;
  const py = Math.sin(phase) * p.distance;
  const vx = -Math.sin(phase) * speed * dir;
  const vy = Math.cos(phase) * speed * dir;

  const position = new Vector3(px, py * Math.cos(inc), py * Math.sin(inc)).addInPlace(center);
  const velocity = new Vector3(vx, vy * Math.cos(inc), vy * Math.sin(inc)).addInPlace(centerVel);

  return createBody({
    name: p.name,
    mass: p.mass,
    radius: p.radius,
    color: p.color,
    position,
    velocity,
    showTrail: p.showTrail ?? true,
  });
}

/**
 * Shift a system into its center-of-mass frame: subtract the COM position and
 * COM velocity from every body. This makes the total momentum zero and centers
 * the system at the origin, so it neither drifts off-screen nor rotates about a
 * moving barycenter — purely a Galilean change of frame, so the physics is
 * unchanged.
 */
export function toCenterOfMassFrame(bodies: Body[]): void {
  const M = totalMass(bodies);
  if (M <= 0) return;
  const R = centerOfMass(bodies);
  const V = linearMomentum(bodies).scaleInPlace(1 / M);
  for (const b of bodies) {
    b.position.subInPlace(R);
    b.velocity.subInPlace(V);
  }
}

/**
 * Deterministic PRNG (mulberry32). Presets that scatter many bodies (the
 * asteroid belt) use a fixed seed so the layout is reproducible run to run —
 * no unseeded Math.random() "magic".
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform sample in [min, max) from a 0..1 generator. */
export function range(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}
