import { Vector3, createBody, type Body } from '../physics';

/**
 * Build an exact two-body circular orbit in the center-of-mass frame (total
 * momentum = 0, motion in the xy-plane). Both bodies orbit the common COM at
 * angular velocity ω = sqrt(G(M+m)/r³); their speeds are set so momentum
 * cancels, giving a closed circle of separation `r`.
 */
export function twoBodyCircular(G: number, M: number, m: number, r: number): Body[] {
  const omega = Math.sqrt((G * (M + m)) / (r * r * r));
  const rPrimary = (m / (M + m)) * r; // primary's distance from COM
  const rSecondary = (M / (M + m)) * r; // secondary's distance from COM

  const primary = createBody({
    name: 'Primary',
    mass: M,
    radius: 0.05,
    position: new Vector3(-rPrimary, 0, 0),
    velocity: new Vector3(0, -omega * rPrimary, 0),
  });
  const secondary = createBody({
    name: 'Secondary',
    mass: m,
    radius: 0.02,
    position: new Vector3(rSecondary, 0, 0),
    velocity: new Vector3(0, omega * rSecondary, 0),
  });
  return [primary, secondary];
}

/** Orbital period of the circular two-body system above. */
export function circularPeriod(G: number, M: number, m: number, r: number): number {
  const omega = Math.sqrt((G * (M + m)) / (r * r * r));
  return (2 * Math.PI) / omega;
}

/** Distance between two bodies. */
export function separation(a: Body, b: Body): number {
  return a.position.distanceTo(b.position);
}

/** True iff every position/velocity component of every body is finite. */
export function allFinite(bodies: readonly Body[]): boolean {
  for (const b of bodies) {
    const vals = [
      b.position.x, b.position.y, b.position.z,
      b.velocity.x, b.velocity.y, b.velocity.z,
    ];
    if (vals.some((v) => !Number.isFinite(v))) return false;
  }
  return true;
}
