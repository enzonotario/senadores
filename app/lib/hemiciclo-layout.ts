/**
 * Layout de hemiciclo puro para OG (Takumi) — misma idea que HemicicloChart,
 * sin DOM / media queries / interacción.
 */

export type OgHemicicloGroup = {
  color: string;
  count: number;
};

export type OgHemicicloSeat = {
  x: number;
  y: number;
  r: number;
  color: string;
};

export type OgHemicicloLayout = {
  width: number;
  height: number;
  seats: OgHemicicloSeat[];
};

/** Serializa grupos para prop OG: `45:14b8a6,30:ef4444`. */
export function encodeOgHemiciclo(groups: OgHemicicloGroup[]): string {
  return groups
    .filter((g) => g.count > 0 && g.color)
    .map((g) => {
      const hex = String(g.color).replace(/^#/, "").trim();
      return `${Math.round(g.count)}:${hex}`;
    })
    .join(",");
}

/** Parsea `45:14b8a6,30:ef4444`. */
export function decodeOgHemiciclo(raw?: string | null): OgHemicicloGroup[] {
  const s = String(raw || "").trim();
  if (!s) return [];
  const out: OgHemicicloGroup[] = [];
  for (const part of s.split(",")) {
    const [countRaw, hexRaw] = part.split(":");
    const count = Number(countRaw);
    const hex = String(hexRaw || "").trim();
    if (!Number.isFinite(count) || count <= 0 || !/^[0-9a-fA-F]{3,8}$/.test(hex)) {
      continue;
    }
    out.push({ count: Math.round(count), color: `#${hex}` });
  }
  return out;
}

type Geom = {
  W: number;
  H: number;
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  numRows: number;
  dotR: number;
  pitch: number;
  aLeft: number;
  aRight: number;
  sweep: number;
};

function computeGeom(n: number): Geom {
  const total = Math.max(1, n);
  const targetRows =
    total <= 36 ? 3 : total <= 90 ? 4 : total <= 150 ? 6 : total <= 220 ? 7 : 8;
  const compact = total <= 100;

  // ViewBox pensado para caber en la OG (~520–600px de ancho útil)
  const W = compact ? 640 : 720;
  const H = compact ? 340 : 380;
  const cx = W / 2;
  const cy = H - 4;

  const angleMargin = ((compact ? 6 : 4) * Math.PI) / 180;
  const aLeft = Math.PI - angleMargin;
  const aRight = angleMargin;
  const sweep = aLeft - aRight;

  const maxDot = compact ? 14 : 11;
  const minDot = compact ? 8 : 7;

  function tryGeom(dotR: number, outerScale = 1): Geom | null {
    const gap = Math.max(2, Math.round(dotR * 0.22));
    const pitch = 2 * dotR + gap;
    const pad = dotR + 8;
    const outerRMax = Math.min(cx - pad, cy - pad);
    const outerR = outerRMax * outerScale;

    let numRows = targetRows;
    while (numRows > 2 && (numRows - 1) * pitch > outerR * 0.5) {
      numRows -= 1;
    }

    const innerR = outerR - (numRows - 1) * pitch;
    if (innerR < Math.max(40, pad + 12)) return null;

    const radii = Array.from({ length: numRows }, (_, row) =>
      numRows === 1
        ? innerR
        : innerR + ((outerR - innerR) * row) / (numRows - 1),
    );
    const capacity = radii.reduce(
      (sum, r) => sum + Math.max(1, Math.floor((r * sweep) / pitch) + 1),
      0,
    );
    if (capacity < total) return null;

    return {
      W,
      H,
      cx,
      cy,
      innerR,
      outerR,
      numRows,
      dotR,
      pitch,
      aLeft,
      aRight,
      sweep,
    };
  }

  function capacityOf(g: Geom): number {
    const radii = Array.from({ length: g.numRows }, (_, row) =>
      g.numRows === 1
        ? g.innerR
        : g.innerR + ((g.outerR - g.innerR) * row) / (g.numRows - 1),
    );
    return radii.reduce(
      (sum, r) => sum + Math.max(1, Math.floor((r * g.sweep) / g.pitch) + 1),
      0,
    );
  }

  let best: Geom | null = null;
  for (let dotR = maxDot; dotR >= minDot; dotR -= 1) {
    const g = tryGeom(dotR, 1);
    if (g) {
      best = g;
      break;
    }
  }

  if (best) {
    const idealCap = Math.ceil(total * 1.1);
    if (capacityOf(best) > idealCap) {
      let lo = 0.55;
      let hi = 1;
      let tight = best;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        const g = tryGeom(best.dotR, mid);
        if (g && capacityOf(g) >= total) {
          tight = g;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      best = tight;
    }
    return best;
  }

  const gap = Math.max(2, Math.round(minDot * 0.22));
  const pitch = 2 * minDot + gap;
  const pad = minDot + 8;
  const outerR = Math.min(cx - pad, cy - pad);
  const numRows = Math.max(2, targetRows);
  const innerR = Math.max(pad + 16, outerR - (numRows - 1) * pitch);

  return {
    W,
    H,
    cx,
    cy,
    innerR,
    outerR,
    numRows,
    dotR: minDot,
    pitch,
    aLeft,
    aRight,
    sweep,
  };
}

function seatXY(r: number, p: number, g: Geom) {
  const angle = g.aLeft - p * (g.aLeft - g.aRight);
  return {
    x: g.cx + r * Math.cos(angle),
    y: g.cy - r * Math.sin(angle),
  };
}

function rowRadii(g: Geom) {
  return Array.from({ length: g.numRows }, (_, row) =>
    g.numRows === 1
      ? g.innerR
      : g.innerR + ((g.outerR - g.innerR) * row) / (g.numRows - 1),
  );
}

function rowCapacity(r: number, g: Geom) {
  const arc = r * g.sweep;
  return Math.max(1, Math.floor(arc / g.pitch) + 1);
}

function seatsPerRow(g: Geom, total: number): number[] {
  const radii = rowRadii(g);
  const caps = radii.map((r) => rowCapacity(r, g));
  const counts = Array(g.numRows).fill(0) as number[];
  if (!total) return counts;

  const totalR = radii.reduce((s, r) => s + r, 0);
  let remaining = total;

  for (let i = 0; i < g.numRows; i++) {
    const ideal = Math.round((total * (radii[i] ?? 0)) / totalR);
    const n = Math.min(caps[i] ?? 1, Math.max(0, ideal));
    counts[i] = n;
    remaining -= n;
  }

  for (let i = g.numRows - 1; i >= 0 && remaining > 0; i--) {
    const room = (caps[i] ?? 0) - (counts[i] ?? 0);
    const add = Math.min(room, remaining);
    counts[i] = (counts[i] ?? 0) + add;
    remaining -= add;
  }

  for (let i = g.numRows - 1; i >= 0 && remaining > 0; i--) {
    counts[i] = (counts[i] ?? 0) + 1;
    remaining -= 1;
  }

  let diff = total - counts.reduce((s, n) => s + n, 0);
  for (let i = g.numRows - 1; i >= 0 && diff !== 0; i--) {
    if (diff > 0) {
      const room = (caps[i] ?? Infinity) - (counts[i] ?? 0);
      if (room <= 0 && caps[i] !== undefined) continue;
      counts[i] = (counts[i] ?? 0) + 1;
      diff -= 1;
    } else if ((counts[i] ?? 0) > 0) {
      counts[i] = (counts[i] ?? 0) - 1;
      diff += 1;
    }
  }

  return counts;
}

/**
 * Asigna bancas por ángulo (izq→der) y colorea por grupos en ese orden
 * (mismo criterio visual que el hemiciclo de la UI).
 */
export function layoutOgHemiciclo(
  groups: OgHemicicloGroup[],
): OgHemicicloLayout | null {
  const colors: string[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) colors.push(g.color);
  }
  const n = colors.length;
  if (!n) return null;

  const g = computeGeom(n);
  const counts = seatsPerRow(g, n);
  const radii = rowRadii(g);

  type SeatPos = { x: number; y: number; p: number };
  const positions: SeatPos[] = [];
  for (let row = 0; row < g.numRows; row++) {
    const r = radii[row] ?? g.innerR;
    const count = counts[row] ?? 0;
    for (let j = 0; j < count; j++) {
      const p = count > 1 ? j / (count - 1) : 0.5;
      const { x, y } = seatXY(r, p, g);
      positions.push({ x, y, p });
    }
  }
  positions.sort((a, b) => a.p - b.p);

  const seats: OgHemicicloSeat[] = positions.map((pos, i) => ({
    x: Math.round(pos.x * 10) / 10,
    y: Math.round(pos.y * 10) / 10,
    r: g.dotR,
    color: colors[i] ?? "#6b7280",
  }));

  return { width: g.W, height: g.H, seats };
}

/** Agrupa miembros activos por clave política y ordena por tamaño desc. */
export function groupsForOgHemiciclo(
  members: { group?: string | null }[],
  colors: Record<string, string>,
): OgHemicicloGroup[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    const key = (m.group || "Sin grupo").trim() || "Sin grupo";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"),
    )
    .map(([name, count]) => ({
      count,
      color: colors[name] || "#6b7280",
    }));
}
