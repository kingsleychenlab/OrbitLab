import type { SystemDefinition } from '../physics';
import { solarSystem } from './solarSystem';
import { earthMoon } from './earthMoon';
import { sunEarthJupiter } from './sunEarthJupiter';
import { binaryStar } from './binaryStar';
import { threeBody } from './threeBody';
import { figureEight } from './figureEight';
import { asteroidBelt } from './asteroidBelt';
import { slingshot } from './slingshot';
import { collisionMerger } from './collisionMerger';
import { unstableOrbit } from './unstableOrbit';

export type PresetCategory = 'Systems' | 'Three-body' | 'Demos';

export interface PresetInfo {
  id: string;
  name: string;
  category: PresetCategory;
  /** One-line teaser for the preset list. */
  blurb: string;
  /** Builds a FRESH system (new body ids) every call. */
  build: () => SystemDefinition;
}

/** Every preset, in menu order. Each `build()` returns independent state. */
export const PRESETS: PresetInfo[] = [
  {
    id: 'solarSystem',
    name: 'Solar System',
    category: 'Systems',
    blurb: 'Sun + 8 planets, real masses & AU distances',
    build: solarSystem,
  },
  {
    id: 'earthMoon',
    name: 'Earth · Moon',
    category: 'Systems',
    blurb: 'Two-body barycentric orbit in natural units',
    build: earthMoon,
  },
  {
    id: 'sunEarthJupiter',
    name: 'Sun · Earth · Jupiter',
    category: 'Systems',
    blurb: 'Jupiter perturbing Earth over many orbits',
    build: sunEarthJupiter,
  },
  {
    id: 'binaryStar',
    name: 'Binary Star',
    category: 'Systems',
    blurb: 'Two stars + a circumbinary planet',
    build: binaryStar,
  },
  {
    id: 'asteroidBelt',
    name: 'Asteroid Belt',
    category: 'Systems',
    blurb: '~90 test particles stirred by Jupiter',
    build: asteroidBelt,
  },
  {
    id: 'threeBody',
    name: 'Three-Body (Pythagorean)',
    category: 'Three-body',
    blurb: "Burrau's chaotic 3-4-5 problem",
    build: threeBody,
  },
  {
    id: 'figureEight',
    name: 'Figure-8 Choreography',
    category: 'Three-body',
    blurb: 'Three masses sharing one figure-eight',
    build: figureEight,
  },
  {
    id: 'slingshot',
    name: 'Gravitational Slingshot',
    category: 'Demos',
    blurb: 'A probe flung by a moving planet',
    build: slingshot,
  },
  {
    id: 'collisionMerger',
    name: 'Collision / Merger',
    category: 'Demos',
    blurb: 'Bodies collide and merge (collisions ON)',
    build: collisionMerger,
  },
  {
    id: 'unstableOrbit',
    name: 'Unstable Orbit',
    category: 'Demos',
    blurb: 'Packed heavy planets that eject one another',
    build: unstableOrbit,
  },
];

export const DEFAULT_PRESET_ID = 'solarSystem';

export function getPreset(id: string): PresetInfo | undefined {
  return PRESETS.find((p) => p.id === id);
}

export {
  solarSystem,
  earthMoon,
  sunEarthJupiter,
  binaryStar,
  threeBody,
  figureEight,
  asteroidBelt,
  slingshot,
  collisionMerger,
  unstableOrbit,
};
