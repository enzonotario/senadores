/**
 * Historial de cargos/periodos legislativos (diputado / senador).
 *
 * - Senadores: varias filas del mismo `id` = mandatos.
 * - Diputados: un id suele ser un mandato; reelecciones pueden traer otro HCDN
 *   → agrupamos por apellido+primer nombre+provincia.
 * - Cruce de cámaras: apellido+primer nombre + continuidad temporal (gap ≤ 12 años,
 *   encadenado). No exige misma provincia (p.ej. Pichetto RN → BA).
 */

import { foldNombre } from "../lib/matchSenadorNombre";
import { provinciaKey } from "./provinciaKey";

export type CareerChamber = "diputados" | "senadores";

export type CareerCargo = {
  chamber: CareerChamber;
  memberId: string;
  label: "Diputado" | "Senadora" | "Diputada" | "Senador";
  inicio: string;
  fin: string | null;
  group: string | null;
  provincia: string;
  /** Coincide con el miembro de la ficha que estamos viendo. */
  isCurrentMember: boolean;
  /**
   * Mandato vigente hoy (inicio ≤ ahora ≤ fin).
   * Independiente de la ficha abierta: p.ej. ficha de senador cesado
   * cuyo cargo actual es diputado.
   */
  isActive: boolean;
  path: string;
};

export type CareerPersonRef = {
  chamber: CareerChamber;
  id: string;
  /** "Apellido, Nombre" o equivalente */
  nombreCompleto: string;
  apellido?: string | null;
  nombre?: string | null;
  provincia?: string | null;
  genero?: string | null;
};

type RawPeriod = {
  chamber: CareerChamber;
  memberId: string;
  inicio: string;
  fin: string | null;
  group: string | null;
  provincia: string;
  /** apellido|nombre|provincia */
  personKey: string;
  /** apellido|nombre */
  nameKey: string;
  genero?: string | null;
};

/** Gap máximo (años) entre periodos para aceptar match cross-cámara / homónimo. */
export const CAREER_MAX_GAP_YEARS = 12;

function splitApellidoNombre(opts: {
  apellido?: string | null;
  nombre?: string | null;
  nombreCompleto?: string | null;
}): { apellido: string; nombre: string } | null {
  let apellido = foldNombre(opts.apellido || "");
  let nombre = foldNombre(opts.nombre || "");

  if ((!apellido || !nombre) && opts.nombreCompleto) {
    const folded = foldNombre(opts.nombreCompleto);
    if (folded.includes(",")) {
      const [ape, ...rest] = folded.split(",");
      apellido = ape.trim();
      nombre = rest.join(",").trim();
    } else {
      const tokens = folded.split(/\s+/).filter(Boolean);
      apellido = tokens[0] || "";
      nombre = tokens.slice(1).join(" ");
    }
  }

  if (!apellido || !nombre) return null;
  // Primer nombre basta: reelecciones suelen variar 2º nombre ("Silvana" vs "Silvana Myriam").
  const primerNombre = nombre.split(/\s+/).filter(Boolean)[0] || "";
  if (!primerNombre) return null;
  return { apellido, nombre: primerNombre };
}

/** Nombre completo plegado (sin provincia). Para cruce de cámaras. */
export function personNameKey(opts: {
  apellido?: string | null;
  nombre?: string | null;
  nombreCompleto?: string | null;
}): string | null {
  const parts = splitApellidoNombre(opts);
  if (!parts) return null;
  return `${parts.apellido}|${parts.nombre}`;
}

/** Nombre + provincia. Para reelecciones diputados (ids HCDN distintos). */
export function personKeyFromParts(opts: {
  apellido?: string | null;
  nombre?: string | null;
  nombreCompleto?: string | null;
  provincia?: string | null;
}): string | null {
  const name = personNameKey(opts);
  const prov = provinciaKey(opts.provincia);
  if (!name || !prov) return null;
  return `${name}|${prov}`;
}

function parseYear(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const y = Number(String(iso).slice(0, 4));
  return Number.isFinite(y) && y > 1800 ? y : null;
}

/** Distancia en años entre dos intervalos (0 si se solapan). */
export function yearsBetweenPeriods(
  a: { inicio: string; fin: string | null },
  b: { inicio: string; fin: string | null },
): number {
  const aStart = parseYear(a.inicio);
  const bStart = parseYear(b.inicio);
  if (aStart == null || bStart == null) return Number.POSITIVE_INFINITY;

  const aEnd = parseYear(a.fin) ?? aStart;
  const bEnd = parseYear(b.fin) ?? bStart;

  if (aStart <= bEnd && bStart <= aEnd) return 0;
  if (aEnd < bStart) return bStart - aEnd;
  return aStart - bEnd;
}

function isTemporallyCompatible(
  candidate: { inicio: string; fin: string | null },
  known: Array<{ inicio: string; fin: string | null }>,
  maxGapYears: number,
): boolean {
  if (!known.length) return true;
  return known.some(
    (k) => yearsBetweenPeriods(candidate, k) <= maxGapYears,
  );
}

function cargoLabel(
  chamber: CareerChamber,
  genero?: string | null,
): CareerCargo["label"] {
  const g = String(genero || "")
    .trim()
    .toUpperCase();
  const female = g === "F" || g === "FEMENINO" || g === "MUJER";
  if (chamber === "diputados") return female ? "Diputada" : "Diputado";
  return female ? "Senadora" : "Senador";
}

function toCargo(
  row: RawPeriod,
  current: { chamber: CareerChamber; id: string; genero?: string | null },
): CareerCargo {
  return {
    chamber: row.chamber,
    memberId: row.memberId,
    label: cargoLabel(row.chamber, row.genero || current.genero),
    inicio: row.inicio,
    fin: row.fin,
    group: row.group,
    provincia: row.provincia,
    isCurrentMember:
      row.chamber === current.chamber && row.memberId === current.id,
    isActive: false,
    path:
      row.chamber === "diputados"
        ? `/diputados/${row.memberId}`
        : `/senadores/${row.memberId}`,
  };
}

/** ¿El intervalo cubre `now`? Sin `fin` = abierto. */
export function isCareerPeriodActive(
  inicio: string,
  fin: string | null,
  now: Date = new Date(),
): boolean {
  const start = new Date(inicio);
  if (Number.isNaN(start.getTime()) || start > now) return false;
  if (!fin) return true;
  const end = new Date(fin);
  if (Number.isNaN(end.getTime())) return true;
  return end >= now;
}

/** Marca un solo cargo activo: el vigente con inicio más reciente. */
export function markActiveCareerCargo(
  cargos: CareerCargo[],
  now: Date = new Date(),
): CareerCargo[] {
  let best: CareerCargo | null = null;
  for (const cargo of cargos) {
    cargo.isActive = false;
    if (!isCareerPeriodActive(cargo.inicio, cargo.fin, now)) continue;
    if (
      !best ||
      String(cargo.inicio) > String(best.inicio) ||
      (cargo.inicio === best.inicio && !cargo.fin && best.fin)
    ) {
      best = cargo;
    }
  }
  if (best) best.isActive = true;
  return cargos;
}

function sortCargos(a: CareerCargo, b: CareerCargo): number {
  const ai = String(a.inicio || "");
  const bi = String(b.inicio || "");
  if (ai !== bi) return ai.localeCompare(bi);
  return a.chamber.localeCompare(b.chamber);
}

/** Dedup: mismo chamber+id+inicio (bloque/partido puede variar). */
function dedupeRaw(rows: RawPeriod[]): RawPeriod[] {
  const map = new Map<string, RawPeriod>();
  for (const row of rows) {
    const key = `${row.chamber}|${row.memberId}|${row.inicio}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    const prevFin = parseYear(prev.fin) ?? 0;
    const nextFin = parseYear(row.fin) ?? 0;
    if (nextFin >= prevFin) map.set(key, row);
  }
  return Array.from(map.values());
}

export function buildMemberCareer(opts: {
  current: CareerPersonRef;
  diputados: Array<{
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    provincia?: string | null;
    genero?: string | null;
    bloque?: string | null;
    periodoMandato?: { inicio?: string | null; fin?: string | null } | null;
  }>;
  senadores: Array<{
    id: string;
    nombre?: string | null;
    provincia?: string | null;
    partido?: string | null;
    periodoLegal?: { inicio?: string | null; fin?: string | null } | null;
  }>;
  maxGapYears?: number;
}): CareerCargo[] {
  const maxGap = opts.maxGapYears ?? CAREER_MAX_GAP_YEARS;
  const currentId = String(opts.current.id);
  const currentChamber = opts.current.chamber;

  const nameOpts = {
    apellido: opts.current.apellido,
    nombre: opts.current.nombre,
    nombreCompleto: opts.current.nombreCompleto,
    provincia: opts.current.provincia,
  };
  const currentKey = personKeyFromParts(nameOpts);
  const currentNameKey = personNameKey(nameOpts);

  const dipRows: RawPeriod[] = [];
  for (const d of opts.diputados) {
    const inicio = d.periodoMandato?.inicio;
    if (!inicio) continue;
    const parts = {
      apellido: d.apellido,
      nombre: d.nombre,
      provincia: d.provincia,
    };
    dipRows.push({
      chamber: "diputados",
      memberId: String(d.id),
      inicio: String(inicio),
      fin: d.periodoMandato?.fin ? String(d.periodoMandato.fin) : null,
      group: d.bloque || null,
      provincia: d.provincia || "",
      personKey: personKeyFromParts(parts) || "",
      nameKey: personNameKey(parts) || "",
      genero: d.genero,
    });
  }

  const senRows: RawPeriod[] = [];
  for (const s of opts.senadores) {
    const inicio = s.periodoLegal?.inicio;
    if (!inicio) continue;
    const parts = {
      nombreCompleto: s.nombre,
      provincia: s.provincia,
    };
    senRows.push({
      chamber: "senadores",
      memberId: String(s.id),
      inicio: String(inicio),
      fin: s.periodoLegal?.fin ? String(s.periodoLegal.fin) : null,
      group: s.partido || null,
      provincia: s.provincia || "",
      personKey: personKeyFromParts(parts) || "",
      nameKey: personNameKey(parts) || "",
      genero: null,
    });
  }

  // Misma cámara: id + (diputados) reelecciones por nombre+provincia.
  const sameChamberRaw =
    currentChamber === "diputados"
      ? dipRows.filter(
          (r) =>
            r.memberId === currentId ||
            (currentKey != null && r.personKey === currentKey),
        )
      : senRows.filter(
          (r) =>
            r.memberId === currentId ||
            (currentKey != null && r.personKey === currentKey),
        );

  const known = dedupeRaw(sameChamberRaw);

  // Cruce: mismo apellido+primer nombre + continuidad temporal (cadena).
  const otherByName =
    currentChamber === "diputados"
      ? senRows.filter(
          (r) => currentNameKey != null && r.nameKey === currentNameKey,
        )
      : dipRows.filter(
          (r) => currentNameKey != null && r.nameKey === currentNameKey,
        );

  const accepted = [...known];
  let pending = [...otherByName];
  while (pending.length) {
    const next: RawPeriod[] = [];
    let added = false;
    for (const row of pending) {
      if (isTemporallyCompatible(row, accepted, maxGap)) {
        accepted.push(row);
        added = true;
      } else {
        next.push(row);
      }
    }
    if (!added) break;
    pending = next;
  }

  const merged = dedupeRaw(accepted);

  return markActiveCareerCargo(
    merged
      .map((row) =>
        toCargo(row, {
          chamber: currentChamber,
          id: currentId,
          genero: opts.current.genero,
        }),
      )
      .sort(sortCargos),
  );
}

/** ¿Vale la pena mostrar la sección? (≥2 cargos o al menos uno de otra cámara/id). */
export function shouldShowCareer(
  cargos: CareerCargo[],
  current: { chamber: CareerChamber; id: string },
): boolean {
  if (cargos.length >= 2) return true;
  return cargos.some(
    (c) => c.chamber !== current.chamber || c.memberId !== current.id,
  );
}

/** Rango de mandato para agrupar actas/charts en el eje temporal. */
export type MandatoRange = {
  /** Clave estable (inicio ISO). */
  key: string;
  /** Etiqueta corta: "2001–2005". */
  label: string;
  inicio: string;
  fin: string | null;
  inicioMs: number;
  /** `Infinity` si el mandato sigue abierto. */
  finMs: number;
};

function yearLabel(iso: string | null | undefined): string {
  const y = String(iso || "").slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "—";
}

export function formatMandatoLabel(inicio: string, fin: string | null): string {
  const a = yearLabel(inicio);
  const b = fin ? yearLabel(fin) : "hoy";
  return `${a}–${b}`;
}

/** Mandatos de la cámara del perfil (para bucketing de sus votos). */
export function mandatoRangesForChamber(
  cargos: CareerCargo[] | null | undefined,
  chamber: CareerChamber,
): MandatoRange[] {
  const rows = (cargos || []).filter((c) => c.chamber === chamber && c.inicio);
  const byKey = new Map<string, MandatoRange>();

  for (const c of rows) {
    const inicioMs = new Date(c.inicio).getTime();
    if (Number.isNaN(inicioMs)) continue;
    const finMs = c.fin
      ? new Date(c.fin).getTime()
      : Number.POSITIVE_INFINITY;
    const key = String(c.inicio).slice(0, 10);
    const prev = byKey.get(key);
    if (!prev || finMs >= prev.finMs) {
      byKey.set(key, {
        key,
        label: formatMandatoLabel(c.inicio, c.fin),
        inicio: c.inicio,
        fin: c.fin,
        inicioMs,
        finMs: Number.isNaN(finMs) ? Number.POSITIVE_INFINITY : finMs,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.inicioMs - b.inicioMs);
}

/**
 * Asigna una fecha al mandato que la contiene.
 * Si hay solape, gana el de inicio más reciente.
 */
export function mandatoKeyFromFecha(
  fecha: string | null | undefined,
  ranges: MandatoRange[],
): string | null {
  if (!fecha || !ranges.length) return null;
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return null;

  let best: MandatoRange | null = null;
  for (const r of ranges) {
    if (t < r.inicioMs || t > r.finMs) continue;
    if (!best || r.inicioMs >= best.inicioMs) best = r;
  }
  return best?.key ?? null;
}

export function formatMandatoKey(
  key: string,
  ranges: MandatoRange[],
): string {
  if (key === "sin-mandato") return "Sin mandato";
  return ranges.find((r) => r.key === key)?.label || key;
}
