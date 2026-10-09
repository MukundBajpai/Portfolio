import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import type { ExtrudeGeometryOptions } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from '../../core/gsap';
import {
  ACCESSORY_X,
  ACCESSORY_Y,
  CARD,
  drawBack,
  drawFront,
  drawNameplate,
  drawScreen,
  makePrintCanvas,
  PrintColors,
  PrintContent,
  WINDOW,
} from './figure-prints';
import { traceSilhouette } from './silhouette';

const FIGURE_HEIGHT = 2.15;
const FIGURE_X = -0.42;
const CARD_DEPTH = 0.07;
const BLISTER_DEPTH = 0.52;
const BEVEL = 0.1;
const PLINTH_TOP = -0.92;
const INSIDE_Z = 0.3;
const OUTLINE = '#140c0d';

/**
 * A toy "blister pack" collectible: printed backer card, clear plastic bubble, the owner's cut-out
 * extruded into a glossy vinyl bust, and accessories. Drag to spin 360°, flip, or unbox it.
 */
export class FigureEngine {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(28, 1, 0.1, 60);
  private readonly stage = new Group();
  private readonly pkg = new Group();
  private readonly contents = new Group();
  private readonly robot = new Group();
  private readonly prints = {
    front: makePrintCanvas(),
    back: makePrintCanvas(),
    screen: makeCanvas(512, 320),
    plate: makeCanvas(1024, 128),
  };
  private readonly textures: CanvasTexture[] = [];
  private readonly tinted: { material: MeshStandardMaterial | MeshPhysicalMaterial; key: 'accent' | 'emissive' }[] = [];
  private readonly rim = new DirectionalLight(0xffffff, 2.2);
  private blister!: Mesh;
  private blisterMaterial!: MeshPhysicalMaterial;
  private eyes: Mesh[] = [];
  private portrait?: HTMLImageElement;

  private rotY = -0.5;
  private velY = 0;
  private dragging = false;
  private lastX = 0;
  private pauseUntil = 0;
  private hoverX = 0;
  private hoverY = 0;
  private tiltX = 0;
  private tiltY = 0;
  private time = 0;
  private autoSpin = true;
  private unboxed = false;
  private unboxTimeline?: gsap.core.Timeline;
  private turning?: gsap.core.Tween;
  private width = 0;
  private height = 0;
  private frame = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly content: PrintContent,
    private colors: PrintColors,
    private low = false,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // Low ambient IBL keeps the dark printed card dark; lights do the modelling.
    this.scene.environmentIntensity = 0.38;
    pmrem.dispose();

    const key = new DirectionalLight(0xfff4e8, 2.3);
    key.position.set(3.5, 5, 7);
    const fill = new DirectionalLight(0xffffff, 0.45);
    fill.position.set(-5, 1, 4);
    this.rim.position.set(-3, 3, -6);
    this.scene.add(key, fill, this.rim, this.stage);

    this.stage.add(this.pkg);
    this.pkg.add(this.contents);
    this.buildCard();
    this.buildBlister();
    this.buildPlinth();
    this.buildAccessories();
    this.paint(colors);
    this.resize();
  }

  /** Loads the cut-out (transparent PNG/WebP) and builds the extruded figure; the portrait prints on the card back. */
  async load(figureSrc: string, portraitSrc?: string): Promise<void> {
    const [figure, portrait] = await Promise.all([
      loadImage(figureSrc),
      portraitSrc ? loadImage(portraitSrc).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    this.portrait = portrait;
    this.buildFigure(figure);
    this.paint(this.colors);
  }

  /** Redraws every print and re-tints accent materials (called on theme changes). */
  paint(colors: PrintColors): void {
    this.colors = colors;
    drawFront(this.prints.front, colors, this.content);
    drawBack(this.prints.back, colors, this.content, this.portrait);
    drawScreen(this.prints.screen, colors);
    drawNameplate(this.prints.plate, colors, this.content);
    this.textures.forEach((t) => (t.needsUpdate = true));
    const accent = new Color(colors.accent);
    this.rim.color.copy(accent);
    for (const { material, key } of this.tinted) {
      if (key === 'accent') material.color.copy(accent);
      else material.emissive.copy(accent);
    }
  }

  /** Low tier: 1x resolution and 30fps. Antialiasing is fixed at creation. */
  setQuality(low: boolean): void {
    this.low = low;
    this.width = 0;
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h || (w === this.width && h === this.height)) return;
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(this.low ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const half = Math.tan((this.camera.fov * Math.PI) / 360);
    const fitHeight = (CARD.h * 0.5 * 1.16) / half;
    const fitWidth = (CARD.w * 0.5 * 1.3) / (half * this.camera.aspect);
    this.camera.position.set(0, 0.1, Math.max(fitHeight, fitWidth));
    this.camera.updateProjectionMatrix();
  }

  /** Plays once when the section first comes into view: the box drops in with a spin. */
  intro(): void {
    gsap.from(this.stage.position, { y: 3.2, duration: 1.8, ease: 'expo.out' });
    gsap.from(this.stage.rotation, { z: -0.35, duration: 1.8, ease: 'expo.out' });
    gsap.fromTo(this, { rotY: this.rotY - Math.PI * 2 }, { rotY: this.rotY, duration: 2.4, ease: 'expo.out' });
  }

  render(dt: number): void {
    this.time += dt;
    if (!this.dragging && !this.turning) {
      this.rotY += this.velY;
      this.velY *= Math.pow(0.9, dt * 60);
      if (this.autoSpin && performance.now() > this.pauseUntil && Math.abs(this.velY) < 0.002) {
        this.rotY += dt * 0.38;
      }
    }
    this.tiltX += (this.hoverY * 0.14 - this.tiltX) * 0.06;
    this.tiltY += (this.hoverX * 0.22 - this.tiltY) * 0.06;
    this.pkg.rotation.set(this.tiltX, this.rotY + this.tiltY, 0);
    this.pkg.position.y = Math.sin(this.time * 1.2) * 0.05;

    // The little agent is alive: head bob, antenna glow, the occasional blink.
    this.robot.position.y = ACCESSORY_Y.agent + Math.sin(this.time * 2.2) * 0.025;
    this.robot.rotation.z = Math.sin(this.time * 1.4) * 0.05;
    const blink = this.time % 3.4 < 0.12 ? 0.15 : 1;
    this.eyes.forEach((eye) => (eye.scale.y = blink));

    if (this.low && this.frame++ % 2) return;
    this.renderer.render(this.scene, this.camera);
  }

  pointerDown(x: number): void {
    this.dragging = true;
    this.lastX = x;
    this.velY = 0;
    this.turning?.kill();
    this.turning = undefined;
  }

  pointerMove(x: number, nx: number, ny: number): void {
    this.hoverX = nx;
    this.hoverY = ny;
    if (!this.dragging) return;
    const dx = x - this.lastX;
    this.lastX = x;
    this.velY = dx * 0.0085;
    this.rotY += this.velY;
    this.pauseUntil = performance.now() + 2600;
  }

  pointerUp(): void {
    this.dragging = false;
  }

  pointerLeave(): void {
    this.hoverX = 0;
    this.hoverY = 0;
    this.dragging = false;
  }

  showSide(side: 'front' | 'back'): void {
    const turn = Math.PI * 2;
    const front = Math.round(this.rotY / turn) * turn;
    const candidates = side === 'front' ? [front] : [front - Math.PI, front + Math.PI];
    const target = candidates.reduce((a, b) => (Math.abs(b - this.rotY) < Math.abs(a - this.rotY) ? b : a));
    this.velY = 0;
    this.pauseUntil = performance.now() + 6000;
    this.turning?.kill();
    this.turning = gsap.to(this, {
      rotY: target,
      duration: 1.4,
      ease: 'expo.inOut',
      onComplete: () => (this.turning = undefined),
    });
  }

  setAutoSpin(on: boolean): void {
    this.autoSpin = on;
  }

  /** Blister flies off and the figure steps forward; call again to repack. Returns the new state. */
  toggleUnbox(): boolean {
    this.unboxTimeline ??= gsap
      .timeline({ paused: true })
      .to(this.blister.position, { z: '+=2.4', y: '+=0.7', duration: 1, ease: 'power3.in' })
      .to(this.blister.rotation, { x: -1.1, z: 0.3, duration: 1, ease: 'power3.in' }, '<')
      .to(this.blisterMaterial, { opacity: 0, duration: 0.45 }, '-=0.45')
      .set(this.blister, { visible: false })
      .to(this.contents.position, { z: 0.45, y: 0.05, duration: 0.9, ease: 'back.out(2)' }, '-=0.25')
      .to(this.contents.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.9, ease: 'back.out(2)' }, '<');
    this.unboxed = !this.unboxed;
    if (this.unboxed) this.unboxTimeline.play();
    else this.unboxTimeline.reverse();
    this.showSide('front');
    return this.unboxed;
  }

  dispose(): void {
    gsap.killTweensOf(this);
    this.unboxTimeline?.kill();
    this.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((m) => m.dispose());
    });
    this.textures.forEach((t) => t.dispose());
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  // ─── Construction ───────────────────────────────────────────────

  private texture(source: HTMLCanvasElement): CanvasTexture {
    const texture = new CanvasTexture(source);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(texture);
    return texture;
  }

  private buildCard(): void {
    const body = new Mesh(
      new RoundedBoxGeometry(CARD.w, CARD.h, CARD_DEPTH, 4, 0.05),
      new MeshStandardMaterial({ color: 0x141416, roughness: 0.85 }),
    );
    const print = (source: HTMLCanvasElement) =>
      new MeshStandardMaterial({ map: this.texture(source), roughness: 0.72, envMapIntensity: 0.5 });
    const front = new Mesh(new PlaneGeometry(CARD.w, CARD.h), print(this.prints.front));
    front.position.z = CARD_DEPTH / 2 + 0.002;
    const back = new Mesh(new PlaneGeometry(CARD.w, CARD.h), print(this.prints.back));
    back.rotation.y = Math.PI;
    back.position.z = -(CARD_DEPTH / 2 + 0.002);
    this.pkg.add(body, front, back);
  }

  private buildBlister(): void {
    const inset = 0.08;
    const shape = roundedRect(
      WINDOW.x0 + inset,
      WINDOW.y0 + inset,
      WINDOW.x1 - WINDOW.x0 - inset * 2,
      WINDOW.y1 - WINDOW.y0 - inset * 2,
      0.34,
    );
    const geometry = new ExtrudeGeometry(shape, {
      depth: BLISTER_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 6,
      curveSegments: 14,
    });
    // Thin clear shell: mostly see-through, with glossy reflections that brighten at glancing angles.
    this.blisterMaterial = new MeshPhysicalMaterial({
      color: 0xdfe6ee,
      transparent: true,
      opacity: 0.12,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.2,
      depthWrite: false,
    });
    this.blister = new Mesh(geometry, this.blisterMaterial);
    this.blister.position.z = CARD_DEPTH / 2 + BEVEL;
    this.pkg.add(this.blister);
  }

  private buildPlinth(): void {
    const dark = new MeshPhysicalMaterial({ color: 0x151517, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 });
    const plinth = new Mesh(new RoundedBoxGeometry(1.5, 0.22, 0.46, 3, 0.05), dark);
    plinth.position.set(FIGURE_X, PLINTH_TOP - 0.11, INSIDE_Z);

    const stripeMaterial = new MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, emissiveIntensity: 0.6, roughness: 0.3 });
    this.tinted.push({ material: stripeMaterial, key: 'accent' }, { material: stripeMaterial, key: 'emissive' });
    const stripe = new Mesh(new RoundedBoxGeometry(1.52, 0.03, 0.48, 2, 0.012), stripeMaterial);
    stripe.position.set(FIGURE_X, PLINTH_TOP - 0.005, INSIDE_Z);

    const plate = new Mesh(new PlaneGeometry(1.36, 0.17), new MeshBasicMaterial({ map: this.texture(this.prints.plate) }));
    plate.position.set(FIGURE_X, PLINTH_TOP - 0.11, INSIDE_Z + 0.232);
    this.contents.add(plinth, stripe, plate);
  }

  private buildAccessories(): void {
    const metal = new MeshPhysicalMaterial({ color: 0x2a2b30, metalness: 0.75, roughness: 0.28, clearcoat: 0.6 });
    const ivory = new MeshPhysicalMaterial({ color: 0xefe9df, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
    const accentPlastic = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
    const glow = new MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 2.4 });
    this.tinted.push({ material: accentPlastic, key: 'accent' }, { material: glow, key: 'emissive' });

    // Laptop, open, angled toward the figure
    const laptop = new Group();
    const base = new Mesh(new RoundedBoxGeometry(0.72, 0.035, 0.34, 2, 0.012), metal);
    base.position.y = -0.2;
    const lid = new Group();
    lid.position.set(0, -0.19, -0.16);
    lid.rotation.x = -0.12;
    const screenBody = new Mesh(new RoundedBoxGeometry(0.72, 0.46, 0.022, 2, 0.012), metal);
    screenBody.position.y = 0.23;
    const display = new Mesh(new PlaneGeometry(0.66, 0.4), new MeshBasicMaterial({ map: this.texture(this.prints.screen) }));
    display.position.set(0, 0.23, 0.0125);
    lid.add(screenBody, display);
    laptop.add(base, lid);
    // Kept forward so the tilted lid never pokes through the backer card.
    laptop.position.set(ACCESSORY_X, ACCESSORY_Y.laptop, INSIDE_Z + 0.08);
    laptop.rotation.y = -0.2;

    // Tiny autonomous agent
    const head = new Mesh(new RoundedBoxGeometry(0.42, 0.32, 0.3, 3, 0.09), ivory);
    head.position.y = 0.12;
    const visor = new Mesh(
      new RoundedBoxGeometry(0.34, 0.18, 0.02, 2, 0.05),
      new MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.1, clearcoat: 1 }),
    );
    visor.position.set(0, 0.12, 0.151);
    this.eyes = [-0.075, 0.075].map((x) => {
      const eye = new Mesh(new SphereGeometry(0.034, 16, 12), glow);
      eye.position.set(x, 0.13, 0.166);
      return eye;
    });
    const antenna = new Mesh(new CylinderGeometry(0.01, 0.01, 0.12, 8), metal);
    antenna.position.y = 0.34;
    const bulb = new Mesh(new SphereGeometry(0.032, 16, 12), glow);
    bulb.position.y = 0.41;
    const torso = new Mesh(new RoundedBoxGeometry(0.3, 0.24, 0.22, 3, 0.07), accentPlastic);
    torso.position.y = -0.17;
    this.robot.add(head, visor, ...this.eyes, antenna, bulb, torso);
    this.robot.position.set(ACCESSORY_X, ACCESSORY_Y.agent, INSIDE_Z + 0.02);
    this.robot.rotation.y = -0.35;

    // A cup of chai
    const mug = new Group();
    const cup = new Mesh(new CylinderGeometry(0.15, 0.13, 0.3, 40), ivory);
    const band = new Mesh(new CylinderGeometry(0.1515, 0.1485, 0.07, 40, 1, true), accentPlastic);
    band.position.y = 0.02;
    const chai = new Mesh(new CircleGeometry(0.135, 32), new MeshStandardMaterial({ color: 0xb5773f, roughness: 0.25 }));
    chai.rotation.x = -Math.PI / 2;
    chai.position.y = 0.13;
    const handle = new Mesh(new TorusGeometry(0.075, 0.022, 12, 24, Math.PI), ivory);
    handle.rotation.z = -Math.PI / 2;
    handle.position.x = 0.15;
    mug.add(cup, band, chai, handle);
    mug.position.set(ACCESSORY_X, ACCESSORY_Y.mug, INSIDE_Z);
    mug.rotation.y = -0.6;

    this.contents.add(laptop, this.robot, mug);
  }

  private buildFigure(image: HTMLImageElement): void {
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const { points, maskWidth, maskHeight } = traceSilhouette(image, w, h);
    if (points.length < 3) return;
    const figW = FIGURE_HEIGHT * (w / h);
    const shape = new Shape(
      points.map(([px, py]) => new Vector2(((px + 0.5) / maskWidth - 0.5) * figW, (0.5 - (py + 0.5) / maskHeight) * FIGURE_HEIGHT)),
    );

    // Every face samples the photo at its (x, y), so the sides read as the painted edge of the figure.
    const uv = (x: number, y: number) => new Vector2(x / figW + 0.5, y / FIGURE_HEIGHT + 0.5);
    const UVGenerator: ExtrudeGeometryOptions['UVGenerator'] = {
      generateTopUV: (_g, v, a, b, c) => [a, b, c].map((i) => uv(v[i * 3], v[i * 3 + 1])),
      generateSideWallUV: (_g, v, a, b, c, d) => [a, b, c, d].map((i) => uv(v[i * 3], v[i * 3 + 1])),
    };
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 1,
      UVGenerator,
    });

    // ExtrudeGeometry puts both lids in group 0 (back lid first, then front) and the walls in group 1.
    const [lids, walls] = geometry.groups;
    const half = lids.count / 2;
    geometry.clearGroups();
    geometry.addGroup(lids.start + half, half, 0);
    geometry.addGroup(walls.start, walls.count, 1);
    geometry.addGroup(lids.start, half, 2);

    // Flatten transparency onto a dark outline colour so any cut-out works (no halo from stray RGB).
    const flat = makeCanvas(w, h);
    const ctx = flat.getContext('2d')!;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0);
    const map = this.texture(flat);

    const vinyl = new MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.9, clearcoatRoughness: 0.14, envMapIntensity: 0.9 });
    const edge = new MeshPhysicalMaterial({ color: 0x2a1113, roughness: 0.5, clearcoat: 0.8 });
    const backside = new MeshPhysicalMaterial({ map, color: 0x3a3232, roughness: 0.6 });
    const figure = new Mesh(geometry, [vinyl, edge, backside]);
    figure.position.set(FIGURE_X, PLINTH_TOP + FIGURE_HEIGHT / 2, INSIDE_Z - 0.05);
    this.contents.add(figure);
  }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): Shape {
  const s = new Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
