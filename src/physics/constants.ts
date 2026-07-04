/**
 * Physical constants and the unit convention used by OrbitLab.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  UNIT SYSTEM  (the "astronomical" units used by most presets)
 * ─────────────────────────────────────────────────────────────────────────
 *   length : AU        (1 AU = mean Earth–Sun distance)
 *   mass   : M_sun     (1 solar mass)
 *   time   : yr        (1 Julian year)
 *
 * In these units Newton's gravitational constant is NOT 6.674e-11. Instead it
 * follows from Kepler's third law. For a circular orbit of radius 1 AU around a
 * 1 M_sun star, the period is 1 year, so:
 *
 *     G · M_sun / a^3 = (2π / T)^2   with a = 1 AU, M_sun = 1, T = 1 yr
 *  => G = 4π²  ≈ 39.4784  [ AU³ / (M_sun · yr²) ]
 *
 * A body on a 1 AU circular orbit therefore has speed v = 2π ≈ 6.283 AU/yr.
 * This makes the Solar-System preset physically self-consistent without any
 * enormous numbers, which keeps floating-point error small.
 *
 * IMPORTANT: `G` is a *simulation parameter*, not a hard-coded global. Presets
 * that are more natural in other units (e.g. the figure-8 choreography, which is
 * published with G = 1, m = 1) set their own G. The engine only ever uses the
 * `G` stored on the running Simulation, so every preset stays internally
 * consistent. See the README, "Unit scaling".
 */

/** Newton's constant in AU³ / (M_sun · yr²). Default for astronomical presets. */
export const G_ASTRO = 4 * Math.PI * Math.PI; // ≈ 39.478418

/** Newton's constant in "natural" units where masses and G are O(1). */
export const G_NATURAL = 1;

/**
 * Reference masses expressed in solar masses (the mass unit above).
 * Sourced from IAU / JPL values, rounded — good to a few significant figures,
 * which is all a visualization needs.
 */
export const MASS = {
  SUN: 1,
  MERCURY: 1.6601e-7,
  VENUS: 2.4478e-6,
  EARTH: 3.0034e-6,
  MOON: 3.6943e-8,
  MARS: 3.2271e-7,
  JUPITER: 9.5479e-4,
  SATURN: 2.8583e-4,
  URANUS: 4.3662e-5,
  NEPTUNE: 5.1514e-5,
} as const;

/**
 * Softening length ε (in length units). It replaces the true 1/r² law with
 *   a ∝ (r² + ε²)^(-3/2)
 * so that a close approach (r → 0) produces a large but FINITE acceleration
 * instead of a singularity that blows the integrator up to NaN/Infinity. A
 * small ε barely affects well-separated orbits. See gravity.ts and the
 * softening test in tests/gravity.test.ts.
 */
export const DEFAULT_SOFTENING = 1e-4;

/** Default integration timestep, in years for astronomical presets. */
export const DEFAULT_DT = 2e-3;

/** Sensible slider bounds surfaced by the UI. */
export const LIMITS = {
  DT_MIN: 1e-5,
  DT_MAX: 5e-2,
  SOFTENING_MIN: 0,
  SOFTENING_MAX: 1e-1,
  STEPS_PER_FRAME_MIN: 0,
  STEPS_PER_FRAME_MAX: 40,
} as const;
