import * as THREE from 'three';

/**
 * Coordinate mapping between physics space and scene space.
 *
 * The physics engine works in an arbitrary right-handed frame where most
 * presets orbit in the XY-plane and use +Z for orbital inclination. Three.js,
 * however, is happiest with +Y "up" and the ground on the XZ-plane. So we map
 *
 *     scene = ( phys.x , phys.z , phys.y ) · scale
 *
 * which lays each orbital plane flat on the ecliptic grid and turns the
 * physics inclination axis into scene "up". `scale` is the user's distance
 * scale (rendering only — it never touches the simulation).
 */
export function toSceneVec(
  p: { x: number; y: number; z: number },
  scale: number,
  out: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  return out.set(p.x * scale, p.z * scale, p.y * scale);
}

/** A soft radial-gradient sprite texture, shared by all body glows and stars. */
let glowTexture: THREE.Texture | null = null;
export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.28)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/** A thin ring sprite texture used to mark the selected body. */
let ringTexture: THREE.Texture | null = null;
export function getRingTexture(): THREE.Texture {
  if (ringTexture) return ringTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  ringTexture = new THREE.CanvasTexture(canvas);
  ringTexture.colorSpace = THREE.SRGBColorSpace;
  return ringTexture;
}

/**
 * A layered starfield: thousands of additive points on a large shell, in cool
 * bluish-white tints with a handful of warmer stars, so the background reads as
 * deep space rather than a flat black rectangle.
 */
export function createStarfield(count = 2600, radius = 4200): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const cool = new THREE.Color('#aecbff');
  const warm = new THREE.Color('#ffd9a8');
  const white = new THREE.Color('#ffffff');
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Uniform direction on a sphere, placed in a thick outer shell.
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.75 + 0.25 * Math.random());
    const sinPhi = Math.sin(phi);
    positions[i * 3 + 0] = r * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const roll = Math.random();
    tmp.copy(roll > 0.94 ? warm : roll > 0.5 ? cool : white);
    const brightness = 0.5 + 0.5 * Math.random();
    colors[i * 3 + 0] = tmp.r * brightness;
    colors[i * 3 + 1] = tmp.g * brightness;
    colors[i * 3 + 2] = tmp.b * brightness;

    sizes[i] = radius * (0.004 + 0.01 * Math.random() * Math.random());
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    map: getGlowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    size: radius * 0.012,
  });

  const points = new THREE.Points(geometry, material);
  points.matrixAutoUpdate = false;
  points.frustumCulled = false;
  return points;
}

/** Convert a CSS hex color to a cached THREE.Color (sRGB). */
const colorCache = new Map<string, THREE.Color>();
export function cssColor(hex: string): THREE.Color {
  let c = colorCache.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    colorCache.set(hex, c);
  }
  return c;
}
