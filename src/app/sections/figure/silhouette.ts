/**
 * Traces the outline of an image's opaque area into a simplified polygon, so a transparent PNG/WebP
 * cut-out can be extruded into a solid 3D shape. Coordinates are in mask pixels (y down).
 */
export function traceSilhouette(image: CanvasImageSource, width: number, height: number, maskHeight = 220): {
  points: [number, number][];
  maskWidth: number;
  maskHeight: number;
} {
  const maskWidth = Math.max(8, Math.round((width / height) * maskHeight));
  const canvas = document.createElement('canvas');
  canvas.width = maskWidth;
  canvas.height = maskHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, maskWidth, maskHeight);
  const { data } = ctx.getImageData(0, 0, maskWidth, maskHeight);

  const mask = new Uint8Array(maskWidth * maskHeight);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0;

  const contour = mooreTrace(mask, maskWidth, maskHeight);
  return { points: simplifyClosed(contour, 0.9), maskWidth, maskHeight };
}

/** Moore-neighbour boundary tracing (Jacob's stopping criterion) of the first blob found scanning row-major. */
function mooreTrace(mask: Uint8Array, w: number, h: number): [number, number][] {
  const start = mask.indexOf(1);
  if (start < 0) return [];
  // Clockwise (screen space, y down): W, NW, N, NE, E, SE, S, SW
  const dirs = [
    [-1, 0], [-1, -1], [0, -1], [1, -1],
    [1, 0], [1, 1], [0, 1], [-1, 1],
  ];
  const dirIndex = (dx: number, dy: number) => dirs.findIndex(([x, y]) => x === dx && y === dy);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;

  const sx = start % w;
  const sy = Math.floor(start / w);
  let x = sx;
  let y = sy;
  let back = 0; // entered the start pixel from the west (background)
  const out: [number, number][] = [[x, y]];

  for (let guard = 0; guard < w * h * 4; guard++) {
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8;
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (!solid(nx, ny)) continue;
      const prev = (back + k - 1) % 8;
      const bx = x + dirs[prev][0];
      const by = y + dirs[prev][1];
      back = dirIndex(bx - nx, by - ny);
      x = nx;
      y = ny;
      moved = true;
      break;
    }
    if (!moved) break; // single isolated pixel
    if (x === sx && y === sy && back === 0) break;
    out.push([x, y]);
  }
  return out;
}

/** Ramer–Douglas–Peucker for a closed ring: split at the point farthest from the first vertex. */
function simplifyClosed(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 8) return points;
  let far = 0;
  let farDist = -1;
  for (let i = 1; i < points.length; i++) {
    const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
    if (d > farDist) {
      farDist = d;
      far = i;
    }
  }
  const a = rdp(points.slice(0, far + 1), epsilon);
  const b = rdp([...points.slice(far), points[0]], epsilon);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function rdp(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dist = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / len;
    if (dist > max) {
      max = dist;
      index = i;
    }
  }
  if (max <= epsilon) return [points[0], points[points.length - 1]];
  return [...rdp(points.slice(0, index + 1), epsilon).slice(0, -1), ...rdp(points.slice(index), epsilon)];
}
