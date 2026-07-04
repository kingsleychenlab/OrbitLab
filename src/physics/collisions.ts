import type { Body } from './Body';

/**
 * Perfectly inelastic merging of overlapping bodies.
 *
 * When enabled, two bodies whose centers are closer than the sum of their radii
 * are fused into one. The merge conserves mass and (linear) momentum exactly:
 *
 *     m_new = m1 + m2
 *     v_new = (m1 v1 + m2 v2) / (m1 + m2)          ← momentum conservation
 *     r_new = (m1 r1 + m2 r2) / (m1 + m2)          ← center of mass
 *     R_new = (R1³ + R2³)^(1/3)                    ← volume-conserving radius
 *
 * The survivor inherits the identity (id / name / color / locked) of the MORE
 * massive body, so camera focus, selection and trails carry over naturally.
 * Energy is intentionally NOT conserved — a real inelastic collision radiates
 * the kinetic energy of relative motion away as heat.
 */
export interface CollisionEvent {
  time: number;
  survivorId: string;
  survivorName: string;
  absorbedId: string;
  absorbedName: string;
  newMass: number;
}

export interface CollisionOptions {
  enabled: boolean;
  /** Merge when |r_i − r_j| < (R_i + R_j) · overlapFactor. Default 1. */
  overlapFactor?: number;
  /** Current simulation time, stamped onto emitted events. */
  time?: number;
}

/** Fuse two bodies per the conservation laws documented above. */
export function mergeBodies(a: Body, b: Body): Body {
  const primary = a.mass >= b.mass ? a : b;
  const totalMass = a.mass + b.mass;
  const invTotal = totalMass > 0 ? 1 / totalMass : 0;

  // Center-of-mass position and momentum-conserving velocity.
  const position = a.position
    .scale(a.mass)
    .addScaledInPlace(b.position, b.mass)
    .scaleInPlace(invTotal);
  const velocity = a.velocity
    .scale(a.mass)
    .addScaledInPlace(b.velocity, b.mass)
    .scaleInPlace(invTotal);

  // Volume-conserving radius (mass ∝ volume ⇒ R ∝ mass^(1/3) at fixed density).
  const radius = Math.cbrt(a.radius * a.radius * a.radius + b.radius * b.radius * b.radius);

  return {
    ...primary, // id, name, color, locked, showTrail from the heavier body
    mass: totalMass,
    radius,
    position,
    velocity,
  };
}

/**
 * Detect and resolve all overlaps in the system. Returns a NEW body list when
 * any merge happened (and the original list untouched otherwise), plus the list
 * of merge events for the activity log.
 *
 * Merges are applied one pair at a time and the scan restarts, so a pile-up of
 * three or more bodies in a single step collapses correctly across iterations.
 */
export function resolveCollisions(
  bodies: Body[],
  opts: CollisionOptions,
): { bodies: Body[]; events: CollisionEvent[] } {
  const events: CollisionEvent[] = [];
  if (!opts.enabled || bodies.length < 2) {
    return { bodies, events };
  }

  const factor = opts.overlapFactor ?? 1;
  const time = opts.time ?? 0;
  let list = bodies;

  let mergedSomething = true;
  while (mergedSomething) {
    mergedSomething = false;

    for (let i = 0; i < list.length && !mergedSomething; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const bi = list[i];
        const bj = list[j];
        const touchDist = (bi.radius + bj.radius) * factor;

        if (bi.position.distanceToSq(bj.position) <= touchDist * touchDist) {
          const primary = bi.mass >= bj.mass ? bi : bj;
          const secondary = bi.mass >= bj.mass ? bj : bi;
          const combined = mergeBodies(bi, bj);

          events.push({
            time,
            survivorId: primary.id,
            survivorName: primary.name,
            absorbedId: secondary.id,
            absorbedName: secondary.name,
            newMass: combined.mass,
          });

          // Rebuild the list without the two originals, appending the survivor.
          const next: Body[] = [];
          for (let k = 0; k < list.length; k++) {
            if (k !== i && k !== j) next.push(list[k]);
          }
          next.push(combined);
          list = next;
          mergedSomething = true;
          break;
        }
      }
    }
  }

  return { bodies: list, events };
}
