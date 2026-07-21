import slugify from "slugify";
import type { Acta, Diputado, Voto } from "./types-diputados";
import { calcularEstadisticasDiputado, isDiputadoActivo } from "./utils";
import { averagePresentismo } from "../utils/presentismo";

const diputadosAliases = [
  {
    nombreCompleto: "Acevedo, Sergio",
    aliases: ["Acevedo, Sergio Edgardo", "Acevedo, Sergio"],
  },
  {
    nombreCompleto: "Moreau, Leopoldo Raul Guido",
    aliases: ["Moreau, Leopoldo Raul Guido", "Moreau, Leopoldo"],
  },
  {
    nombreCompleto: "Reyes, Roxana Nahir",
    aliases: ["Reyes, Roxana Nahir", "Reyes, Roxana"],
  },
];

function slug(value: string) {
  return slugify(value || "", { lower: true, strict: true, trim: true });
}

/** Parsea "Apellido, Nombre" típico de actas HCDN. */
function parseNombreVoto(raw: string) {
  const full = String(raw || "").trim();
  if (!full) {
    return { apellido: "", nombre: "", nombreCompleto: "" };
  }
  if (full.includes(",")) {
    const [apellido, ...rest] = full.split(",");
    return {
      apellido: apellido.trim(),
      nombre: rest.join(",").trim(),
      nombreCompleto: full,
    };
  }
  return { apellido: "", nombre: full, nombreCompleto: full };
}

function getApiOrigin() {
  // Sin tryUseNuxtApp: este módulo también corre desde server/api (Nitro).
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

import { createSingleflight } from "./singleflight";

let _diputados = createSingleflight<Diputado[]>();
let _actas = createSingleflight<Acta[]>();
let _diputadosConActas = createSingleflight<Diputado[]>();

function assertServerData() {
  if (import.meta.client) {
    throw new Error(
      "diputados-data: getActas/getDiputadosConActas solo en server. Usá /api/* (mini-API Nitro).",
    );
  }
}

/** Limpia caches en memoria. */
export function clearDiputadosDataCache() {
  _diputados.clear();
  _actas.clear();
  _diputadosConActas.clear();
}

function maxByPeriod(a: any, b: any) {
  const aBloque = new Date(a?.periodoBloque?.inicio || 0).getTime();
  const bBloque = new Date(b?.periodoBloque?.inicio || 0).getTime();
  if (aBloque !== bBloque) return bBloque - aBloque;

  const aMandato = new Date(a?.periodoMandato?.inicio || 0).getTime();
  const bMandato = new Date(b?.periodoMandato?.inicio || 0).getTime();
  if (aMandato !== bMandato) return bMandato - aMandato;

  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

export async function getDiputados(): Promise<Diputado[]> {
  return _diputados.get(async () => {
    const origin = getApiOrigin();
    const raw = await $fetch<any[]>(`${origin}/v1/diputados/diputados`);

    const byId = new Map<string, any>();
    raw.sort(maxByPeriod).forEach((d) => {
      const id = String(d.id);
      if (!byId.has(id)) byId.set(id, d);
    });

    return Array.from(byId.values())
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((d) => ({
        ...d,
        nombreCompleto: `${d.apellido}, ${d.nombre}`,
      })) as Diputado[];
  });
}

export async function getActas(): Promise<Acta[]> {
  assertServerData();
  return _actas.get(async () => {
    const origin = getApiOrigin();
    const raw = await $fetch<Acta[]>(`${origin}/v1/diputados/actas`);

    return raw.map((acta) => ({
      ...acta,
      votos: (acta.votos || []).filter((v) => v.tipoVoto !== "presidente"),
    }));
  });
}

export async function getDiputadosConActas(): Promise<Diputado[]> {
  assertServerData();
  return _diputadosConActas.get(async () => {
    const diputados = (await getDiputados()).map((d) => ({
      ...d,
      nombreSlug: slug(`${d.apellido}, ${d.nombre}`),
    }));

    const actas = (await getActas()).map((a) => ({
      ...a,
      votos: (a.votos || []).map(
        (v) =>
          ({
            ...v,
            diputadoSlug: slug(v.diputado),
          }) as Voto,
      ),
    }));

    return diputados.map((diputado) => {
      const actasDiputado = actas
        .filter((acta) => {
          const direct = acta.votos.some(
            (v) => v.diputadoSlug === diputado.nombreSlug,
          );
          if (direct) return true;
          return acta.votos.some((v) => {
            const alias = diputadosAliases.find((a) =>
              a.aliases.includes(v.diputado),
            );
            return Boolean(
              alias && alias.nombreCompleto === diputado.nombreCompleto,
            );
          });
        })
        .map((acta) => {
          let votoDiputado = acta.votos.find(
            (v) => v.diputadoSlug === diputado.nombreSlug,
          );
          if (!votoDiputado) {
            votoDiputado = acta.votos.find((v) => {
              const alias = diputadosAliases.find((a) =>
                a.aliases.includes(v.diputado),
              );
              return Boolean(
                alias && alias.nombreCompleto === diputado.nombreCompleto,
              );
            });
          }

          return {
            id: acta.id,
            titulo: acta.titulo,
            proyecto: acta.proyecto,
            descripcion: acta.descripcion,
            fecha: acta.fecha,
            periodo: acta.periodo,
            reunion: acta.reunion,
            resultado: acta.resultado,
            votosAfirmativos: acta.votosAfirmativos,
            votosNegativos: acta.votosNegativos,
            abstenciones: acta.abstenciones,
            ausentes: acta.ausentes,
            presentes: acta.presentes,
            miembros: acta.miembros,
            votoDiputado,
            tipoVotoDiputado: votoDiputado?.tipoVoto,
          };
        });

      const estadisticas = calcularEstadisticasDiputado(actasDiputado as any);
      return { ...diputado, estadisticas, actasDiputado };
    });
  });
}

export async function getDiputadoConActasById(
  id: string,
): Promise<Diputado | null> {
  const list = await getDiputadosConActas();
  return list.find((d) => d.id === id) || null;
}

export async function getActaWithDiputadosById(
  id: string,
): Promise<Acta | null> {
  const actas = await getActas();
  const actaById = actas.find((a) => a.id === id) || null;
  if (!actaById) return null;

  const acta = {
    ...actaById,
    votos: (actaById.votos || []).map((v) => ({
      ...v,
      diputadoSlug: slug(v.diputado),
    })),
  } as Acta;

  const diputados = (await getDiputados()).map((d) => ({
    ...d,
    nombreSlug: slug(d.nombreCompleto || `${d.apellido}, ${d.nombre}`),
  }));

  return {
    ...acta,
    votos: acta.votos.map((v) => {
      let diputado = diputados.find(
        (d) => d.nombreSlug === (v as any).diputadoSlug,
      );

      if (!diputado) {
        const alias = diputadosAliases.find((a) =>
          a.aliases.includes(v.diputado),
        );
        if (alias)
          diputado = diputados.find(
            (d) => d.nombreCompleto === alias.nombreCompleto,
          );
      }

      const parsed = parseNombreVoto(v.diputado);

      return {
        ...v,
        diputadoObj: {
          ...(diputado || {
            id: (v as any).diputadoSlug,
            nombre: parsed.nombre,
            apellido: parsed.apellido,
            nombreCompleto: parsed.nombreCompleto,
            nombreSlug: (v as any).diputadoSlug,
            genero: "",
            provincia: "",
            periodoMandato: { inicio: "", fin: "" },
            juramentoFecha: "",
            ceseFecha: null,
            bloque: "",
            periodoBloque: { inicio: "", fin: "" },
            foto: v.imagen || "",
          }),
          tipoVoto: v.tipoVoto,
        } as Diputado,
      };
    }),
  } as Acta;
}

const preassigned: Record<string, string> = {
  "Movimiento Popular  Neuquino": "#3b82f6",
  "La Libertad Avanza": "#a855f7",
  Independencia: "#ef4444",
  "Hacemos Coalicion Federal": "#22c55e",
  "Frente de Izquierda y de Trabajadores Unidad": "#60a5fa",
  "Sin Bloque": "#6b7280",
  "Produccion y Trabajo": "#eab308",
  Pro: "#eab308",
  "Ucr - Union Civica Radical": "#ef4444",
  "Union por la Patria": "#3b82f6",
  Creo: "#3b82f6",
  "La Union Mendocina": "#3b82f6",
  "Innovacion Federal": "#93c5fd",
  "Buenos Aires Libre": "#bfdbfe",
  "Por Santa Cruz": "#2563eb",
  "Avanza Libertad": "#9333ea",
};

const basePalette = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
  "#dce775",
  "#fff176",
  "#ffd54f",
  "#ffb74d",
  "#ff8a65",
];

function colorForBloqueFactory() {
  let i = 0;
  return (bloque: string) => {
    if (preassigned[bloque]) return preassigned[bloque];
    const c = basePalette[i % basePalette.length];
    i++;
    return c;
  };
}

export function getBloqueColores(bloques: string[]): Record<string, string> {
  const bloqueColores: Record<string, string> = {};
  const getColor = colorForBloqueFactory();
  for (const b of bloques) {
    bloqueColores[b] = getColor(b);
  }
  return bloqueColores;
}

export async function getDiputadosPorBloques() {
  const diputados = (await getDiputados()).filter(isDiputadoActivo);
  const bloques = [...new Set(diputados.map((d) => d.bloque))];
  return { diputados, bloqueColores: getBloqueColores(bloques) };
}

export async function getBloqueSlugs() {
  const diputados = await getDiputados();
  const names = [
    ...new Set(
      diputados.map((d) => d.bloque?.trim()).filter(Boolean) as string[],
    ),
  ];
  return names.map((nombre) => ({
    nombre,
    slug: slug(nombre) || "sin-bloque",
  }));
}

export async function getBloquesIndex() {
  const diputados = await getDiputadosConActas();
  const byBloque = new Map<string, Diputado[]>();

  for (const d of diputados) {
    if (!isDiputadoActivo(d)) continue;
    const nombre = d.bloque?.trim();
    if (!nombre) continue;
    const list = byBloque.get(nombre);
    if (list) list.push(d);
    else byBloque.set(nombre, [d]);
  }

  const colores = getBloqueColores([...byBloque.keys()]);

  return [...byBloque.entries()]
    .map(([nombre, activos]) => ({
      nombre,
      slug: slug(nombre) || "sin-bloque",
      color: colores[nombre] ?? "#6b7280",
      activos: activos.length,
      presentismo: averagePresentismo(activos) ?? 0,
      diputados: activos,
    }))
    .sort(
      (a, b) =>
        b.activos - a.activos || a.nombre.localeCompare(b.nombre, "es"),
    );
}

export async function getBloqueBySlug(slugParam: string) {
  const diputados = await getDiputadosConActas();
  const target = String(slugParam || "").trim();
  if (!target) return null;

  const nombre =
    diputados.find((d) => (slug(d.bloque || "") || "sin-bloque") === target)
      ?.bloque || null;
  if (!nombre) return null;

  const delBloque = diputados.filter((d) => d.bloque === nombre);
  const color = getBloqueColores([nombre])[nombre] ?? "#6b7280";
  const activos = delBloque.filter(isDiputadoActivo);
  const inactivos = delBloque.filter((d) => !isDiputadoActivo(d));

  return {
    nombre,
    slug: target,
    color,
    diputados: delBloque,
    activos,
    inactivos,
    presentismo: averagePresentismo(activos.length ? activos : delBloque),
  };
}
