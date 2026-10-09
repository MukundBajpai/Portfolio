/**
 * Packaging artwork for the 3D collectible, drawn on canvases (so it follows the site's theme tokens).
 * Layout is shared with the 3D scene: CARD/WINDOW are in scene units, PRINT is canvas pixels.
 */
export const CARD = { w: 3.4, h: 4.6 };
export const WINDOW = { x0: -1.45, x1: 1.45, y0: -1.2, y1: 1.8 };
export const ACCESSORY_X = 0.98;
export const ACCESSORY_Y = { laptop: 1.05, agent: 0.2, mug: -0.72 };
const PRINT = { w: 1024, h: 1386 };

export interface PrintColors {
  accent: string;
  accentSoft: string;
  accentDeep: string;
  ink: string;
  mist: string;
  smoke: string;
  signal: string;
  onAccent: string;
}

export interface PrintContent {
  first: string;
  last: string;
  role: string;
  team: string;
  series: string;
  edition: string;
  location: string;
  year: number;
  features: string[];
  stats: { v: string; k: string }[];
  links: string[];
}

const ux = (x: number) => ((x + CARD.w / 2) / CARD.w) * PRINT.w;
const uy = (y: number) => ((CARD.h / 2 - y) / CARD.h) * PRINT.h;

export function makePrintCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT.w;
  canvas.height = PRINT.h;
  return canvas;
}

function font(ctx: CanvasRenderingContext2D, spec: string, spacing = 0): void {
  ctx.font = spec;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function halftone(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let y = y0; y < y1; y += 18) {
    for (let x = x0; x < x1; x += 18) {
      const fade = 1 - Math.hypot((x - x0) / (x1 - x0), (y - y0) / (y1 - y0)) / 1.42;
      if (fade <= 0) continue;
      ctx.beginPath();
      ctx.arc(x, y, 4.2 * fade, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function starburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number, fill: string): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ink: string): void {
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0b0b0c';
  let cx = x + 12;
  let seed = 7;
  while (cx < x + w - 12) {
    seed = (seed * 9301 + 49297) % 233280;
    const bar = 2 + (seed % 4);
    ctx.fillRect(cx, y + 10, bar, h - 34);
    cx += bar + 2 + ((seed >> 3) % 3);
  }
  font(ctx, '500 15px "Geist Mono", monospace', 3);
  ctx.fillStyle = '#0b0b0c';
  ctx.fillText('8 901234 567890', x + 14, y + h - 8);
  ctx.strokeStyle = ink;
}

/** Front of the backer card: hang tab, series branding, window backdrop, accessory labels, name band. */
export function drawFront(canvas: HTMLCanvasElement, c: PrintColors, content: PrintContent): void {
  const ctx = canvas.getContext('2d')!;
  const { w: W, h: H } = PRINT;
  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1c1c20');
  bg.addColorStop(1, '#0a0a0b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, W * 0.55, 0, W, 150, `${c.accent}55`);
  halftone(ctx, 0, H - 330, W * 0.5, H, `${c.accent}33`);

  // Window backdrop (sits behind the clear blister)
  const wx = ux(WINDOW.x0);
  const wy = uy(WINDOW.y1);
  const ww = ux(WINDOW.x1) - wx;
  const wh = uy(WINDOW.y0) - wy;
  ctx.save();
  rounded(ctx, wx, wy, ww, wh, 44);
  ctx.clip();
  ctx.fillStyle = '#0c0c0e';
  ctx.fillRect(wx, wy, ww, wh);
  const glow = ctx.createRadialGradient(wx + ww * 0.33, wy + wh * 0.42, 10, wx + ww * 0.33, wy + wh * 0.42, ww * 0.7);
  glow.addColorStop(0, `${c.accent}66`);
  glow.addColorStop(1, `${c.accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = wx; x < wx + ww; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, wy);
    ctx.lineTo(x, wy + wh);
    ctx.stroke();
  }
  for (let y = wy; y < wy + wh; y += 44) {
    ctx.beginPath();
    ctx.moveTo(wx, y);
    ctx.lineTo(wx + ww, y);
    ctx.stroke();
  }
  // Agent network constellation behind the accessories column
  const nodes = [
    [ux(0.55), uy(1.55)], [ux(1.3), uy(1.35)], [ux(0.7), uy(0.55)], [ux(1.32), uy(-0.1)],
    [ux(0.62), uy(-0.35)], [ux(1.25), uy(-1.0)], [ux(0.2), uy(0.9)],
  ];
  ctx.strokeStyle = `${c.accent}44`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  nodes.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = `${c.accentSoft}aa`;
  for (const [x, y] of nodes) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  font(ctx, '400 300px Anton, Impact, sans-serif');
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 3;
  ctx.strokeText('AI', wx + 24, wy + wh - 28);
  ctx.restore();

  rounded(ctx, wx, wy, ww, wh, 44);
  ctx.lineWidth = 5;
  ctx.strokeStyle = c.accent;
  ctx.stroke();

  // Accessory labels
  font(ctx, '600 17px "Geist Mono", monospace', 2.5);
  ctx.textAlign = 'center';
  const labels: [number, string][] = [
    [ACCESSORY_Y.laptop - 0.42, 'LAPTOP · SHIPS CODE'],
    [ACCESSORY_Y.agent - 0.42, 'AI AGENT · AUTONOMOUS'],
    [ACCESSORY_Y.mug - 0.33, 'CHAI · FUEL'],
  ];
  for (const [y, text] of labels) {
    const tx = ux(ACCESSORY_X);
    const ty = uy(y);
    const tw = ctx.measureText(text).width + 28;
    rounded(ctx, tx - tw / 2, ty - 22, tw, 32, 16);
    ctx.fillStyle = 'rgba(10,10,11,0.85)';
    ctx.fill();
    ctx.strokeStyle = `${c.accent}88`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = c.ink;
    ctx.fillText(text, tx, ty);
  }
  ctx.textAlign = 'left';

  // Hang tab + slot
  rounded(ctx, W / 2 - 130, 16, 260, 78, 22);
  ctx.fillStyle = '#0d0d0f';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  rounded(ctx, W / 2 - 64, 42, 128, 24, 12);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Brand badge + series
  const badge = ctx.createLinearGradient(40, 36, 132, 128);
  badge.addColorStop(0, c.accentSoft);
  badge.addColorStop(1, c.accentDeep);
  ctx.beginPath();
  ctx.arc(86, 82, 48, 0, Math.PI * 2);
  ctx.fillStyle = badge;
  ctx.fill();
  font(ctx, '400 46px Anton, Impact, sans-serif');
  ctx.fillStyle = c.onAccent;
  ctx.textAlign = 'center';
  ctx.fillText('MB', 86, 99);
  ctx.textAlign = 'left';
  font(ctx, '600 15px "Geist Mono", monospace', 3);
  ctx.textAlign = 'center';
  ctx.fillStyle = c.ink;
  ctx.fillText(content.series.toUpperCase() + '  ·  ' + content.edition.toUpperCase(), W / 2, 124);
  ctx.textAlign = 'left';

  // Starburst
  starburst(ctx, W - 110, uy(WINDOW.y1) + 40, 62, 18, c.accentSoft);
  font(ctx, '400 34px Anton, Impact, sans-serif');
  ctx.fillStyle = c.onAccent;
  ctx.textAlign = 'center';
  ctx.fillText('NEW!', W - 110, uy(WINDOW.y1) + 44);
  font(ctx, '700 15px "Geist Mono", monospace', 2);
  ctx.fillText(String(content.year), W - 110, uy(WINDOW.y1) + 66);
  ctx.textAlign = 'left';

  // Name band
  const band = uy(WINDOW.y0);
  font(ctx, '400 132px Anton, Impact, sans-serif', 1);
  ctx.fillStyle = c.ink;
  ctx.fillText(content.first.toUpperCase(), 64, band + 150);
  const firstWidth = ctx.measureText(content.first.toUpperCase() + ' ').width;
  ctx.lineWidth = 3;
  ctx.strokeStyle = c.accent;
  ctx.strokeText(content.last.toUpperCase(), 64 + firstWidth, band + 150);

  font(ctx, '700 22px "Geist Mono", monospace', 4);
  const role = content.role.toUpperCase();
  const pillW = ctx.measureText(role).width + 44;
  rounded(ctx, 64, band + 182, pillW, 48, 24);
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.fillStyle = c.onAccent;
  ctx.fillText(role, 86, band + 214);
  font(ctx, '500 19px "Geist Mono", monospace', 3.5);
  ctx.fillStyle = c.mist;
  ctx.fillText(content.team.toUpperCase(), 64 + pillW + 22, band + 214);

  font(ctx, '500 14px "Geist Mono", monospace', 3);
  ctx.fillStyle = c.smoke;
  ctx.fillText('AGES 18+ · AGENTS INCLUDED · NO BATTERIES REQUIRED', 64, H - 36);
  ctx.textAlign = 'right';
  ctx.fillText('MB-001', W - 64, H - 36);
  ctx.textAlign = 'left';
}

/** Back of the card: bio, features, stats, links, barcode. */
export function drawBack(canvas: HTMLCanvasElement, c: PrintColors, content: PrintContent, portrait?: HTMLImageElement): void {
  const ctx = canvas.getContext('2d')!;
  const { w: W, h: H } = PRINT;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#101012';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, c.accentDeep);
  bar.addColorStop(0.5, c.accent);
  bar.addColorStop(1, c.accentSoft);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 14);

  font(ctx, '400 92px Anton, Impact, sans-serif', 1);
  ctx.fillStyle = c.ink;
  ctx.fillText(`${content.first} ${content.last}`.toUpperCase(), 64, 142);
  font(ctx, '600 22px "Geist Mono", monospace', 4);
  ctx.fillStyle = c.accentSoft;
  ctx.fillText(`${content.role} — ${content.team}`.toUpperCase(), 64, 186);

  // Portrait window
  const px = 64;
  const py = 226;
  const pw = 340;
  const ph = 430;
  ctx.save();
  rounded(ctx, px, py, pw, ph, 26);
  ctx.clip();
  const pg = ctx.createRadialGradient(px + pw / 2, py + ph * 0.4, 10, px + pw / 2, py + ph * 0.4, pw);
  pg.addColorStop(0, `${c.accent}77`);
  pg.addColorStop(1, '#141416');
  ctx.fillStyle = pg;
  ctx.fillRect(px, py, pw, ph);
  if (portrait) {
    const scale = Math.max(pw / portrait.naturalWidth, ph / portrait.naturalHeight) * 1.02;
    const dw = portrait.naturalWidth * scale;
    const dh = portrait.naturalHeight * scale;
    ctx.drawImage(portrait, px + (pw - dw) / 2, py + ph - dh, dw, dh);
  }
  ctx.restore();
  rounded(ctx, px, py, pw, ph, 26);
  ctx.lineWidth = 4;
  ctx.strokeStyle = c.accent;
  ctx.stroke();

  // Features
  const fx = 450;
  font(ctx, '700 20px "Geist Mono", monospace', 5);
  ctx.fillStyle = c.accentSoft;
  ctx.fillText('FEATURES', fx, 250);
  font(ctx, '500 27px Geist, system-ui, sans-serif');
  let fy = 298;
  for (const feature of content.features) {
    ctx.fillStyle = c.accent;
    ctx.fillText('✓', fx, fy);
    ctx.fillStyle = c.ink;
    for (const line of wrap(ctx, feature, W - fx - 104)) {
      ctx.fillText(line, fx + 38, fy);
      fy += 36;
    }
    fy += 16;
  }

  // Power stats
  let sy = 712;
  font(ctx, '700 20px "Geist Mono", monospace', 5);
  ctx.fillStyle = c.accentSoft;
  ctx.fillText('POWER STATS', 64, sy);
  sy += 24;
  const boxW = (W - 128 - 2 * 20) / 3;
  content.stats.forEach((stat, i) => {
    const bx = 64 + (i % 3) * (boxW + 20);
    const by = sy + Math.floor(i / 3) * 150;
    rounded(ctx, bx, by, boxW, 132, 20);
    ctx.fillStyle = '#17171a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();
    font(ctx, '400 60px Anton, Impact, sans-serif');
    ctx.fillStyle = i % 2 ? c.accentSoft : c.ink;
    ctx.fillText(stat.v, bx + 24, by + 72);
    font(ctx, '600 16px "Geist Mono", monospace', 3);
    ctx.fillStyle = c.mist;
    ctx.fillText(stat.k.toUpperCase(), bx + 24, by + 108);
  });

  // Collect them all + warning
  const ly = 1062;
  font(ctx, '700 20px "Geist Mono", monospace', 5);
  ctx.fillStyle = c.accentSoft;
  ctx.fillText('COLLECT THEM ALL', 64, ly);
  font(ctx, '500 21px "Geist Mono", monospace', 1.5);
  ctx.fillStyle = c.ink;
  content.links.forEach((link, i) => ctx.fillText(link, 64, ly + 40 + i * 34));

  rounded(ctx, 560, ly - 28, W - 624, 122, 18);
  ctx.strokeStyle = c.accentSoft;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  font(ctx, '700 19px "Geist Mono", monospace', 4);
  ctx.fillStyle = c.accentSoft;
  ctx.fillText('⚠ WARNING', 584, ly + 8);
  font(ctx, '500 24px Geist, system-ui, sans-serif');
  ctx.fillStyle = c.ink;
  ctx.fillText('May automate your entire', 584, ly + 44);
  ctx.fillText('workflow. Handle with prompts.', 584, ly + 74);

  barcode(ctx, 64, H - 150, 300, 100, c.ink);
  font(ctx, '500 16px "Geist Mono", monospace', 3);
  ctx.fillStyle = c.smoke;
  ctx.textAlign = 'right';
  ctx.fillText(`MADE IN ${content.location.toUpperCase()}`, W - 64, H - 92);
  ctx.fillText(`© ${content.year} ${content.first} ${content.last}`.toUpperCase(), W - 64, H - 62);
  ctx.textAlign = 'left';
}

/** Tiny code editor for the laptop accessory's screen. */
export function drawScreen(canvas: HTMLCanvasElement, c: PrintColors): void {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#0b0c0f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#16171b';
  ctx.fillRect(0, 0, W, 34);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((dot, i) => {
    ctx.beginPath();
    ctx.arc(22 + i * 20, 17, 6, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();
  });
  font(ctx, '500 21px "Geist Mono", monospace');
  const lines: [string, string][][] = [
    [[c.accent, 'const '], [c.ink, 'agent = '], [c.accentSoft, 'orchestrate'], [c.ink, '({']],
    [[c.mist, '  ticket: '], [c.signal, "'#4821'"], [c.ink, ',']],
    [[c.mist, '  route: '], [c.signal, "'triage'"], [c.ink, ',']],
    [[c.mist, '  context: '], [c.accentSoft, 'rag'], [c.ink, '.mcp(),']],
    [[c.ink, '});']],
    [[c.signal, '✓ grounded · resolved']],
  ];
  lines.forEach((parts, row) => {
    let x = 24;
    for (const [color, text] of parts) {
      ctx.fillStyle = color;
      ctx.fillText(text, x, 76 + row * 38);
      x += ctx.measureText(text).width;
    }
  });
}

/** Front plate of the plinth. */
export function drawNameplate(canvas: HTMLCanvasElement, c: PrintColors, content: PrintContent): void {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#141416');
  g.addColorStop(1, '#0c0c0d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, 0, 14, H);
  font(ctx, '400 64px Anton, Impact, sans-serif', 1);
  ctx.fillStyle = c.ink;
  ctx.fillText(`${content.first} ${content.last}`.toUpperCase(), 44, 88);
  font(ctx, '600 22px "Geist Mono", monospace', 4);
  ctx.fillStyle = c.accentSoft;
  ctx.textAlign = 'right';
  ctx.fillText(`${content.role.toUpperCase()} · MB-001`, W - 34, 84);
  ctx.textAlign = 'left';
}
