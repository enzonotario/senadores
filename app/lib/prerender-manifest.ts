import slugify from "slugify";
import type { ChamberId } from "./chamber";
import { isDiputadoActivo, isSenadorActivo } from "./utils";
import { bloquePath } from "../utils/bloque";
import { partidoPath } from "../utils/partido";

/** Actas SSG: fecha >= (fecha de build − N años), rolling. */
export const ACTAS_SSG_YEARS = 4;

export function actasSsgCutoff(now = new Date()): Date {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - ACTAS_SSG_YEARS);
  return d;
}

function isActaInSsgWindow(
  fecha: string | null | undefined,
  cutoff: Date,
): boolean {
  if (!fecha) return false;
  const t = new Date(fecha).getTime();
  return Number.isFinite(t) && t >= cutoff.getTime();
}

function apiOrigin(): string {
  const raw = String(
    process.env.NUXT_PUBLIC_API_URL ||
      process.env.NUXT_PUBLIC_API_BASE_URL ||
      "https://api.argentinadatos.com",
  );
  try {
    return new URL(raw).origin;
  } catch {
    return "https://api.argentinadatos.com";
  }
}

function slug(value: string) {
  return slugify(value || "", { lower: true, strict: true, trim: true });
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${apiOrigin()}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`prerender-manifest: ${url} → ${res.status}`);
  }
  return (await res.json()) as T;
}

function maxByPeriod(a: any, b: any) {
  const aLegal = new Date(a?.periodoLegal?.inicio || 0).getTime();
  const bLegal = new Date(b?.periodoLegal?.inicio || 0).getTime();
  if (aLegal !== bLegal) return bLegal - aLegal;
  const aReal = new Date(
    a?.periodoReal?.inicio || a?.periodoMandato?.inicio || 0,
  ).getTime();
  const bReal = new Date(
    b?.periodoReal?.inicio || b?.periodoMandato?.inicio || 0,
  ).getTime();
  if (aReal !== bReal) return bReal - aReal;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function dedupeById(raw: any[]): any[] {
  const byId = new Map<string, any>();
  [...raw].sort(maxByPeriod).forEach((d) => {
    const id = String(d.id);
    if (!byId.has(id)) byId.set(id, d);
  });
  return Array.from(byId.values());
}

/**
 * Rutas a prerenderizar para una cámara (build con DEFAULT_CHAMBER).
 * Índices + miembros activos + actas en ventana rolling 4a.
 * `/afinidad` queda SSR (cálculo pesado; no vale SSG en el build).
 * Usa `fetch` nativo (no `*-data` / `$fetch`): el hook corre vía jiti
 * desde nuxt.config, sin auto-imports de Nuxt.
 */
export async function collectChamberPrerenderRoutes(
  chamber: ChamberId,
): Promise<string[]> {
  const cutoff = actasSsgCutoff();
  const routes = new Set<string>(["/", "/actas"]);

  if (chamber === "diputados") {
    routes.add("/diputados");
    routes.add("/diputados/bloques");

    const [rawDiputados, rawActas] = await Promise.all([
      fetchJson<any[]>("/v1/diputados/diputados"),
      fetchJson<any[]>("/v1/diputados/actas"),
    ]);

    const diputados = dedupeById(rawDiputados);
    const bloques = new Set<string>();

    for (const d of diputados) {
      if (!isDiputadoActivo(d)) continue;
      routes.add(`/diputados/${d.id}`);
      const bp = bloquePath(d.bloque);
      if (bp) {
        routes.add(bp);
        const name = String(d.bloque || "").trim();
        if (name) bloques.add(name);
      }
    }

    for (const name of bloques) {
      const s = slug(name) || "sin-bloque";
      routes.add(`/diputados/bloques/${s}`);
    }

    for (const a of rawActas) {
      if (isActaInSsgWindow(a?.fecha, cutoff) && a?.id != null) {
        routes.add(`/actas/${a.id}`);
      }
    }

    return [...routes];
  }

  routes.add("/senadores");
  routes.add("/senadores/partidos");

  const [rawSenadores, rawActas] = await Promise.all([
    fetchJson<any[]>("/v1/senado/senadores"),
    fetchJson<any[]>("/v1/senado/actas"),
  ]);

  const senadores = dedupeById(rawSenadores).map((d) => ({
    ...d,
    id: String(d.id),
    nombre: d.nombre || "",
    partido: d.partido || "Sin Especificar",
    periodoLegal: d.periodoLegal || { inicio: "", fin: null },
    periodoReal: d.periodoReal || { inicio: "", fin: null },
  }));

  const partidos = new Set<string>();

  for (const s of senadores) {
    if (!isSenadorActivo(s)) continue;
    routes.add(`/senadores/${s.id}`);
    const pp = partidoPath(s.partido);
    if (pp) {
      routes.add(pp);
      const name = String(s.partido || "").trim();
      if (name) partidos.add(name);
    }
  }

  for (const name of partidos) {
    const s = slug(name) || "sin-partido";
    routes.add(`/senadores/partidos/${s}`);
  }

  for (const a of rawActas) {
    if (isActaInSsgWindow(a?.fecha, cutoff) && a?.id != null) {
      routes.add(`/actas/${a.id}`);
    }
  }

  return [...routes];
}
