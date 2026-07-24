import { normalizeResultado, normalizeVotoTipo } from "@/utils/votoTipo";
import {
  formatMandatoKey,
  mandatoKeyFromFecha,
  type MandatoRange,
} from "@/utils/memberCareer";

/** Acta mínima para series temporales (diputados o senadores). */
export type ActaChartRow = {
  fecha?: string | null;
  resultado?: string | null;
  titulo?: string | null;
  periodo?: string | null;
  votosAfirmativos?: number | null;
  votosNegativos?: number | null;
  abstenciones?: number | null;
  ausentes?: number | null;
  presentes?: number | null;
  miembros?: number | null;
  tipoVotoDiputado?: string | null;
  tipoVotoSenador?: string | null;
  votoSenador?: { tipoVoto?: string | null } | null;
};

export type VotosTimeGroupBy =
  | "mes"
  | "trimestre"
  | "cuatrimestre"
  | "periodo"
  | "mandato";

type VotoBucket = {
  afirmativo: number;
  negativo: number;
  abstencion: number;
  ausente: number;
};

const EMPTY_VOTO_BUCKET = (): VotoBucket => ({
  afirmativo: 0,
  negativo: 0,
  abstencion: 0,
  ausente: 0,
});

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function monthKeyFromFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  if (!y || idx < 0 || idx > 11) return key;
  return `${MONTHS_SHORT[idx]} ${y}`;
}

function sortedMonthKeys(keys: Iterable<string>): string[] {
  return [...keys].sort();
}

/** Trimestre calendario: 2024-T1 … 2024-T4 */
export function trimestreKeyFromFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-T${q}`;
}

export function formatTrimestreKey(key: string): string {
  const match = /^(\d{4})-T([1-4])$/.exec(key);
  if (!match) return key;
  return `T${match[2]} ${match[1]}`;
}

/** Cuatrimestre (ene–abr / may–ago / sep–dic): 2024-C1 … 2024-C3 */
export function cuatrimestreKeyFromFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  const c = Math.floor(d.getMonth() / 4) + 1;
  return `${d.getFullYear()}-C${c}`;
}

export function formatCuatrimestreKey(key: string): string {
  const match = /^(\d{4})-C([1-3])$/.exec(key);
  if (!match) return key;
  const ranges = ["ene–abr", "may–ago", "sep–dic"];
  return `${ranges[Number(match[2]) - 1]} ${match[1]}`;
}

function periodoKeyFromActa(a: ActaChartRow): string {
  const raw = String(a.periodo || "").trim();
  return raw || "sin-periodo";
}

function formatPeriodoKey(key: string): string {
  if (key === "sin-periodo") return "Sin período";
  return `Período ${key}`;
}

function bucketKeyForActa(
  a: ActaChartRow,
  groupBy: VotosTimeGroupBy,
  mandatos?: MandatoRange[],
): string | null {
  if (groupBy === "mes") return monthKeyFromFecha(a.fecha);
  if (groupBy === "trimestre") return trimestreKeyFromFecha(a.fecha);
  if (groupBy === "cuatrimestre") return cuatrimestreKeyFromFecha(a.fecha);
  if (groupBy === "mandato") {
    if (!mandatos?.length) return null;
    return mandatoKeyFromFecha(a.fecha, mandatos) || "sin-mandato";
  }
  return periodoKeyFromActa(a);
}

function formatBucketKey(
  key: string,
  groupBy: VotosTimeGroupBy,
  mandatos?: MandatoRange[],
): string {
  if (groupBy === "mes") return formatMonthKey(key);
  if (groupBy === "trimestre") return formatTrimestreKey(key);
  if (groupBy === "cuatrimestre") return formatCuatrimestreKey(key);
  if (groupBy === "mandato") return formatMandatoKey(key, mandatos || []);
  return formatPeriodoKey(key);
}

function sortBucketKeys(keys: string[], groupBy: VotosTimeGroupBy): string[] {
  return [...keys].sort((a, b) => {
    if (groupBy === "periodo") {
      if (a === "sin-periodo") return 1;
      if (b === "sin-periodo") return -1;
      const an = Number(a);
      const bn = Number(b);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return a.localeCompare(b, "es");
    }
    if (groupBy === "mandato") {
      if (a === "sin-mandato") return 1;
      if (b === "sin-mandato") return -1;
      return a.localeCompare(b);
    }
    return a.localeCompare(b);
  });
}

function actaPresentismo(a: ActaChartRow): number | null {
  const afirm = Number(a.votosAfirmativos || 0);
  const neg = Number(a.votosNegativos || 0);
  const abs = Number(a.abstenciones || 0);
  const aus = Number(a.ausentes || 0);
  const present = afirm + neg + abs;
  const total = present + aus;
  if (total > 0) return Math.round((present / total) * 1000) / 10;

  if (a.presentes != null && a.miembros != null && a.miembros > 0) {
    return Math.round((Number(a.presentes) / Number(a.miembros)) * 1000) / 10;
  }
  return null;
}

/** Resultados de actas agregados por mes. */
export function actasResultadosByMonth(actas: ActaChartRow[]) {
  const map = new Map<
    string,
    { afirmativo: number; negativo: number; otros: number }
  >();

  for (const a of actas) {
    const key = monthKeyFromFecha(a.fecha);
    if (!key) continue;
    const bucket = map.get(key) || { afirmativo: 0, negativo: 0, otros: 0 };
    const r = normalizeResultado(a.resultado);
    if (r === "afirmativo") bucket.afirmativo++;
    else if (r === "negativo") bucket.negativo++;
    else bucket.otros++;
    map.set(key, bucket);
  }

  const months = sortedMonthKeys(map.keys());
  return {
    months,
    labels: months.map(formatMonthKey),
    afirmativo: months.map((m) => map.get(m)!.afirmativo),
    negativo: months.map((m) => map.get(m)!.negativo),
    otros: months.map((m) => map.get(m)!.otros),
  };
}

/** Presentismo promedio de la cámara por mes (desde conteos del acta). */
export function actasPresentismoByMonth(actas: ActaChartRow[]) {
  const map = new Map<string, number[]>();

  for (const a of actas) {
    const key = monthKeyFromFecha(a.fecha);
    if (!key) continue;
    const p = actaPresentismo(a);
    if (p == null) continue;
    const list = map.get(key) || [];
    list.push(p);
    map.set(key, list);
  }

  const months = sortedMonthKeys(map.keys());
  return {
    months,
    labels: months.map(formatMonthKey),
    presentismo: months.map((m) => {
      const vals = map.get(m)!;
      const avg = vals.reduce((s, n) => s + n, 0) / vals.length;
      return Math.round(avg * 10) / 10;
    }),
    volumen: months.map((m) => map.get(m)!.length),
  };
}

function memberVotoTipo(a: ActaChartRow): string {
  return normalizeVotoTipo(
    a.tipoVotoDiputado ||
      a.tipoVotoSenador ||
      a.votoSenador?.tipoVoto ||
      "ausente",
  );
}

/**
 * Presentismo acumulado del miembro a lo largo de sus actas
 * (orden cronológico).
 */
export function miembroPresentismoSeries(actas: ActaChartRow[]) {
  const sorted = [...actas]
    .filter((a) => a.fecha)
    .sort(
      (a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime(),
    );

  let present = 0;
  let total = 0;
  const dates: string[] = [];
  const labels: string[] = [];
  const cumulative: number[] = [];
  const rolling: number[] = [];
  const window: number[] = [];

  for (const a of sorted) {
    const tipo = memberVotoTipo(a);
    total++;
    const isPresent = tipo !== "ausente" ? 1 : 0;
    present += isPresent;
    window.push(isPresent);
    if (window.length > 20) window.shift();

    const d = new Date(a.fecha!);
    dates.push(a.fecha!);
    labels.push(
      Number.isNaN(d.getTime())
        ? String(a.fecha)
        : d.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          }),
    );
    cumulative.push(Math.round((present / total) * 1000) / 10);
    const rollSum = window.reduce((s, n) => s + n, 0);
    rolling.push(Math.round((rollSum / window.length) * 1000) / 10);
  }

  return {
    dates,
    labels,
    cumulative,
    rolling,
    titulos: sorted.map((a) => a.titulo || ""),
  };
}

export function miembroVotoBreakdown(actas: ActaChartRow[]) {
  const counts: Record<string, number> = {
    afirmativo: 0,
    negativo: 0,
    abstencion: 0,
    ausente: 0,
  };

  for (const a of actas) {
    const key = memberVotoTipo(a);
    if (key === "afirmativo" || key === "negativo" || key === "abstencion") {
      counts[key] += 1;
    } else {
      counts.ausente += 1;
    }
  }

  return counts;
}

/**
 * Votos del miembro agregados en el tiempo
 * (mes / trimestre / cuatrimestre / período legislativo / mandato).
 */
export function miembroVotosOverTime(
  actas: ActaChartRow[],
  groupBy: VotosTimeGroupBy = "mes",
  mandatos: MandatoRange[] = [],
) {
  const map = new Map<string, VotoBucket>();

  for (const a of actas) {
    const key = bucketKeyForActa(a, groupBy, mandatos);
    if (!key) continue;
    const bucket = map.get(key) || EMPTY_VOTO_BUCKET();
    const tipo = memberVotoTipo(a);
    if (tipo === "afirmativo" || tipo === "negativo" || tipo === "abstencion") {
      bucket[tipo] += 1;
    } else {
      bucket.ausente += 1;
    }
    map.set(key, bucket);
  }

  const keys = sortBucketKeys([...map.keys()], groupBy);
  return {
    keys,
    labels: keys.map((k) => formatBucketKey(k, groupBy, mandatos)),
    afirmativo: keys.map((k) => map.get(k)!.afirmativo),
    negativo: keys.map((k) => map.get(k)!.negativo),
    abstencion: keys.map((k) => map.get(k)!.abstencion),
    ausente: keys.map((k) => map.get(k)!.ausente),
  };
}

/** Índice en `dates` (ISO) más cercano a `targetMs` (≥ target si hay empate). */
export function nearestDateIndex(
  dates: string[],
  targetMs: number,
): number | null {
  if (!dates.length) return null;
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < dates.length; i++) {
    const t = new Date(dates[i]!).getTime();
    if (Number.isNaN(t)) continue;
    const dist = Math.abs(t - targetMs);
    if (dist < bestDist || (dist === bestDist && t >= targetMs)) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestDist === Number.POSITIVE_INFINITY ? null : bestIdx;
}

/** Primer índice con fecha ≥ target (para inicio de mandato). */
export function firstIndexOnOrAfter(
  dates: string[],
  targetMs: number,
): number | null {
  for (let i = 0; i < dates.length; i++) {
    const t = new Date(dates[i]!).getTime();
    if (!Number.isNaN(t) && t >= targetMs) return i;
  }
  return dates.length ? dates.length - 1 : null;
}

/** Último índice con fecha ≤ target (para fin de mandato). */
export function lastIndexOnOrBefore(
  dates: string[],
  targetMs: number,
): number | null {
  for (let i = dates.length - 1; i >= 0; i--) {
    const t = new Date(dates[i]!).getTime();
    if (!Number.isNaN(t) && t <= targetMs) return i;
  }
  return dates.length ? 0 : null;
}

export function actaVotoBreakdown(acta: ActaChartRow) {
  return {
    afirmativo: Number(acta.votosAfirmativos || 0),
    negativo: Number(acta.votosNegativos || 0),
    abstencion: Number(acta.abstenciones || 0),
    ausente: Number(acta.ausentes || 0),
  };
}
