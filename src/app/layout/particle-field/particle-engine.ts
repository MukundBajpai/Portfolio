import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

/** Shape indices: 0 neural core · 1 agent network · 2 data wave · 3 helix · 4 portal ring */
export interface FieldState {
  from: number;
  to: number;
  t: number;
  glow: number;
  /** Horizontal offset on landscape screens, as a fraction of the half-width. */
  shift: number;
  /** Vertical offset on portrait screens, as a fraction of the half-height. */
  lift: number;
}

const FOV = 45;
const CAMERA_Z = 6;

const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uProgress;
uniform float uIntro;
uniform float uSize;
uniform float uPixelRatio;
uniform float uGlow;
uniform float uForce;
uniform vec2 uMouse;
uniform vec3 uTone0;
uniform vec3 uTone1;
uniform vec3 uTone2;
uniform vec3 uTone3;

attribute vec3 aShape1;
attribute vec3 aShape2;
attribute vec3 aShape3;
attribute vec3 aShape4;
attribute float aRandom;
attribute float aScale;
attribute float aTone;

varying vec3 vColor;
varying float vAlpha;

${NOISE}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 toneColor(float t) {
  if (t < 0.5) return uTone0;
  if (t < 1.5) return uTone1;
  if (t < 2.5) return uTone2;
  return uTone3;
}

vec3 shapeAt(float i) {
  if (i < 0.5) return position;
  if (i < 1.5) return aShape1;
  if (i < 2.5) return aShape2;
  if (i < 3.5) return aShape3;
  return aShape4;
}

vec3 animateShape(float i, vec3 p) {
  if (i < 0.5) {
    p.xz = rot(uTime * 0.07) * p.xz;
    float n = snoise(p * 0.85 + vec3(0.0, uTime * 0.16, 0.0));
    return p * (1.0 + n * 0.16);
  }
  if (i < 1.5) {
    p.xz = rot(uTime * 0.045) * p.xz;
    p.y += sin(uTime * 0.7 + aRandom * 6.2831) * 0.035;
    return p;
  }
  if (i < 2.5) {
    p.y += sin(p.x * 0.85 + uTime * 0.75) * 0.22
         + sin(p.z * 1.35 + uTime * 0.55) * 0.14
         + snoise(vec3(p.xz * 0.32, uTime * 0.12)) * 0.3;
    return p;
  }
  if (i < 3.5) {
    p.yz = rot(uTime * 0.32) * p.yz;
    return p;
  }
  p.xy = rot(uTime * (0.06 + aRandom * 0.1)) * p.xy;
  return p;
}

void main() {
  float delay = aRandom * 0.35;
  float t = clamp((uProgress - delay) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);

  vec3 pos = mix(animateShape(uFrom, shapeAt(uFrom)), animateShape(uTo, shapeAt(uTo)), t);

  float swirl = sin(t * 3.14159265);
  vec3 turbulence = vec3(
    snoise(pos * 0.55 + vec3(uTime * 0.25, 0.0, 0.0)),
    snoise(pos * 0.55 + vec3(17.3, uTime * 0.25, 0.0)),
    snoise(pos * 0.55 + vec3(0.0, 41.7, uTime * 0.25))
  );
  pos += turbulence * swirl * 0.6;

  vec3 scatter = normalize(vec3(sin(aRandom * 91.7), cos(aRandom * 47.3), sin(aRandom * 23.9 + 1.3) * 0.35) + 0.0001);
  pos = mix(pos, scatter * (5.0 + aRandom * 7.0), uIntro * uIntro);

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vec2 diff = world.xy - uMouse;
  float push = (1.0 - smoothstep(0.0, 1.35, length(diff))) * uForce;
  world.xy += normalize(diff + 0.0001) * push * 0.5;
  world.z += push * 0.35;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  float depth = max(-mv.z, 0.6);
  gl_PointSize = min(uSize * aScale * uPixelRatio * (1.0 + push * 0.9) / depth, 64.0);

  float twinkle = 0.7 + 0.3 * sin(uTime * (0.8 + aRandom * 2.4) + aRandom * 50.0);
  vColor = mix(toneColor(aTone), uTone2, push * 0.7);
  vAlpha = uGlow * twinkle * (1.0 - smoothstep(4.0, 16.0, depth)) * (1.0 - uIntro * 0.6);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a *= a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
}
`;

export type Tone = [number, number, number];

/** Four RGB tones (0..1: base, accent, soft accent, counterpoint) + cumulative share of particles per tone. */
export interface ParticlePalette {
  tones: Tone[];
  shares: number[];
}

/** Warm graphite: the ivory "base" particles become ink dust on paper. */
const LIGHT_BASE: Tone = [0.34, 0.28, 0.24];

/** Additive glow vanishes on a light page, so light mode paints deeper tones with normal blending. */
function lightTones(tones: Tone[]): Tone[] {
  return tones.map((t, i) => (i === 0 ? LIGHT_BASE : (t.map((c) => c * 0.84) as Tone)));
}

export class ParticleEngine {
  readonly intro = { value: 1 };

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly points: Points;
  private readonly uniforms = {
    uTime: { value: 0 },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uProgress: { value: 0 },
    uIntro: this.intro,
    uSize: { value: 26 },
    uPixelRatio: { value: 1 },
    uGlow: { value: 0 },
    uForce: { value: 0 },
    uMouse: { value: new Vector2(99, 99) },
    uTone0: { value: new Vector3() },
    uTone1: { value: new Vector3() },
    uTone2: { value: new Vector3() },
    uTone3: { value: new Vector3() },
    uOpacity: { value: 1 },
  };

  private readonly mouseTarget = new Vector2(99, 99);
  private forceTarget = 0;
  private pointerX = 0;
  private pointerY = 0;
  private tiltX = 0;
  private tiltY = 0;
  private shift = 0;
  private lift = 0;
  private halfW = 1;
  private halfH = 1;
  private width = 0;
  private height = 0;

  /** Per-particle random 0..1 used to assign a tone according to the palette's shares. */
  private readonly picks: Float32Array;
  private shares: number[] = [];
  private palette: ParticlePalette;
  private light = false;
  private low = false;
  private frame = 0;
  private readonly count: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    palette: ParticlePalette,
    light: boolean,
    low: boolean,
  ) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.z = CAMERA_Z;

    const n = particleCount();
    this.count = n;
    this.picks = Float32Array.from({ length: n }, () => Math.random());
    this.geometry = buildGeometry(n);
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.palette = palette;
    this.setTheme(light);
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.setQuality(low);
  }

  /** Low tier: 1x resolution, ~half the particles (they're shuffled, so any prefix is an even sample), 30fps. */
  setQuality(low: boolean): void {
    this.low = low;
    this.geometry.setDrawRange(0, low ? Math.round(this.count * 0.55) : this.count);
    this.width = 0;
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h || (w === this.width && h === this.height)) return;
    this.width = w;
    this.height = h;

    const dpr = this.low ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.halfH = Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
    this.halfW = this.halfH * this.camera.aspect;
    this.uniforms.uPixelRatio.value = dpr;
    this.uniforms.uSize.value = 26 * Math.min(Math.max(h / 900, 0.7), 1.4);
    this.points.scale.setScalar(this.camera.aspect < 1 ? Math.max(0.5, this.camera.aspect * 1.05) : 1);
  }

  setTheme(light: boolean): void {
    this.light = light;
    this.material.blending = light ? NormalBlending : AdditiveBlending;
    this.material.needsUpdate = true;
    this.uniforms.uOpacity.value = light ? 0.8 : 1;
    this.setPalette(this.palette);
  }

  setPalette(palette: ParticlePalette): void {
    this.palette = palette;
    const { shares } = palette;
    const tones = this.light ? lightTones(palette.tones) : palette.tones;
    const u = this.uniforms;
    [u.uTone0, u.uTone1, u.uTone2, u.uTone3].forEach((uniform, i) => uniform.value.set(...tones[i]));
    if (shares.join() === this.shares.join()) return;
    this.shares = shares;
    const attribute = this.geometry.getAttribute('aTone') as BufferAttribute;
    for (let i = 0; i < this.picks.length; i++) {
      attribute.setX(i, shares.findIndex((share) => this.picks[i] <= share));
    }
    attribute.needsUpdate = true;
  }

  /** Normalised device coords (-1..1). */
  pointer(nx: number, ny: number): void {
    this.mouseTarget.set(nx * this.halfW, ny * this.halfH);
    this.pointerX = nx;
    this.pointerY = ny;
    this.forceTarget = 1;
  }

  pointerLeave(): void {
    this.forceTarget = 0;
  }

  render(state: FieldState, time: number): void {
    const u = this.uniforms;
    u.uTime.value = time;
    u.uFrom.value = state.from;
    u.uTo.value = state.to;
    u.uProgress.value = state.t;
    // Portrait screens put text over the swarm, so it glows a little less there.
    const portrait = this.camera.aspect < 1;
    u.uGlow.value += (state.glow * (portrait ? 0.7 : 1) - u.uGlow.value) * 0.05;
    u.uMouse.value.lerp(this.mouseTarget, 0.1);
    u.uForce.value += (this.forceTarget - u.uForce.value) * 0.05;

    this.shift += ((portrait ? 0 : state.shift * this.halfW) - this.shift) * 0.05;
    this.lift += ((portrait ? state.lift * this.halfH : 0) - this.lift) * 0.05;
    this.points.position.set(this.shift, this.lift, 0);

    this.tiltX += (this.pointerY * 0.12 - this.tiltX) * 0.04;
    this.tiltY += (this.pointerX * 0.18 - this.tiltY) * 0.04;
    this.points.rotation.set(-this.tiltX, this.tiltY, 0);

    if (this.low && this.frame++ % 2) return;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}

function particleCount(): number {
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  if (w < 700 || cores <= 4) return 7000;
  if (w < 1300) return 11000;
  return 16000;
}

function gauss(): number {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

/** Random index order so each morph sends particles on unrelated paths (a swarm, not a slide). */
function shuffled(points: Float32Array): Float32Array {
  const n = points.length / 3;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    for (let k = 0; k < 3; k++) {
      const tmp = points[i * 3 + k];
      points[i * 3 + k] = points[j * 3 + k];
      points[j * 3 + k] = tmp;
    }
  }
  return points;
}

function sphere(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const shell = Math.floor(n * 0.7);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    let x: number, y: number, z: number;
    if (i < shell) {
      const yy = 1 - (i / (shell - 1)) * 2;
      const r = Math.sqrt(1 - yy * yy);
      const th = golden * i;
      const R = 1.5 * (0.97 + Math.random() * 0.06);
      x = Math.cos(th) * r * R;
      y = yy * R;
      z = Math.sin(th) * r * R;
    } else {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const R = 1.5 * Math.cbrt(Math.random()) * 0.82;
      x = R * Math.sin(ph) * Math.cos(th);
      y = R * Math.sin(ph) * Math.sin(th);
      z = R * Math.cos(ph);
    }
    out.set([x, y, z], i * 3);
  }
  return shuffled(out);
}

function network(n: number): Float32Array {
  const hubs: [number, number, number][] = [[0, 0, 0]];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    hubs.push([Math.cos(a) * 2.5, Math.sin(a) * 1.45, Math.sin(a + 0.8) * 0.8]);
  }
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
  ];
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let p: [number, number, number];
    if (r < 0.16) {
      p = [gauss() * 0.3, gauss() * 0.3, gauss() * 0.3];
    } else if (r < 0.58) {
      const h = hubs[1 + Math.floor(Math.random() * 6)];
      p = [h[0] + gauss() * 0.17, h[1] + gauss() * 0.17, h[2] + gauss() * 0.17];
    } else if (r < 0.9) {
      const [a, b] = edges[Math.floor(Math.random() * edges.length)];
      const u = Math.random();
      p = [
        hubs[a][0] + (hubs[b][0] - hubs[a][0]) * u + gauss() * 0.025,
        hubs[a][1] + (hubs[b][1] - hubs[a][1]) * u + gauss() * 0.025,
        hubs[a][2] + (hubs[b][2] - hubs[a][2]) * u + gauss() * 0.025,
      ];
    } else {
      p = [(Math.random() - 0.5) * 11, (Math.random() - 0.5) * 6.5, (Math.random() - 0.5) * 4 - 1];
    }
    out.set(p, i * 3);
  }
  return shuffled(out);
}

function wave(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const cols = Math.ceil(Math.sqrt(n * 2.2));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.set(
      [
        (c / (cols - 1) - 0.5) * 12 + gauss() * 0.02,
        -1.35,
        2.2 - (r / Math.max(rows - 1, 1)) * 7 + gauss() * 0.02,
      ],
      i * 3,
    );
  }
  return shuffled(out);
}

function helix(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const turns = 3.5;
  const R = 0.9;
  const len = 9.5;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let p: [number, number, number];
    if (r < 0.84) {
      const strand = r < 0.42 ? 0 : 1;
      const u = Math.random();
      const a = u * turns * Math.PI * 2 + strand * Math.PI;
      p = [(u - 0.5) * len, Math.cos(a) * R + gauss() * 0.04, Math.sin(a) * R + gauss() * 0.04];
    } else {
      const u = (Math.floor(Math.random() * 40) + 0.5) / 40;
      const a = u * turns * Math.PI * 2;
      const v = Math.random() * 2 - 1;
      p = [(u - 0.5) * len, Math.cos(a) * R * v, Math.sin(a) * R * v + gauss() * 0.015];
    }
    out.set(p, i * 3);
  }
  return shuffled(out);
}

function ring(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let p: [number, number, number];
    if (Math.random() < 0.72) {
      const th = Math.random() * Math.PI * 2;
      const rr = Math.abs(gauss()) * 0.14;
      const ph = Math.random() * Math.PI * 2;
      const R = 2.05 + rr * Math.cos(ph);
      p = [R * Math.cos(th), R * Math.sin(th), rr * Math.sin(ph)];
    } else {
      const rad = Math.pow(Math.random(), 0.6) * 1.75;
      const th = Math.random() * Math.PI * 2 + rad * 2.4;
      p = [Math.cos(th) * rad, Math.sin(th) * rad, gauss() * 0.06];
    }
    out.set(p, i * 3);
  }
  return shuffled(out);
}

function buildGeometry(n: number): BufferGeometry {
  const geometry = new BufferGeometry();
  const random = new Float32Array(n);
  const scale = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    random[i] = Math.random();
    scale[i] = Math.random() < 0.018 ? 3 + Math.random() * 1.6 : 0.55 + Math.random() ** 2 * 1.25;
  }

  geometry.setAttribute('position', new BufferAttribute(sphere(n), 3));
  geometry.setAttribute('aShape1', new BufferAttribute(network(n), 3));
  geometry.setAttribute('aShape2', new BufferAttribute(wave(n), 3));
  geometry.setAttribute('aShape3', new BufferAttribute(helix(n), 3));
  geometry.setAttribute('aShape4', new BufferAttribute(ring(n), 3));
  geometry.setAttribute('aRandom', new BufferAttribute(random, 1));
  geometry.setAttribute('aScale', new BufferAttribute(scale, 1));
  geometry.setAttribute('aTone', new BufferAttribute(new Float32Array(n), 1));
  return geometry;
}
