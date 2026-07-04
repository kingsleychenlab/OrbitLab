/**
 * Everything the renderer needs to know that is NOT physics. These are pure
 * presentation controls, owned by React and passed down each frame; changing
 * any of them never alters the simulation.
 */
export interface ViewOptions {
  /** Multiplies physics positions to scene units. */
  distanceScale: number;
  /** Multiplies body radii when drawing spheres. */
  radiusScale: number;
  /** Master toggle for name labels. */
  showLabels: boolean;
  /** Master toggle for orbit trails (per-body `showTrail` still applies). */
  showTrails: boolean;
  /** Max number of points retained per trail. */
  trailLength: number;
  /** Fade older trail segments toward invisible (phosphor persistence). */
  trailFade: boolean;
  /** Currently selected body id, or null. */
  selectedId: string | null;
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  distanceScale: 1,
  radiusScale: 1,
  showLabels: true,
  showTrails: true,
  trailLength: 260,
  trailFade: true,
  selectedId: null,
};
