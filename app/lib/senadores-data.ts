import slugify from "slugify";
import type { Acta, Senador, Voto } from "@/lib/types";
import {
  calcularEstadisticasSenador,
  isSenadorActivo,
  parseNombreSenador,
} from "@/lib/utils";
import {
  getSenadoresAliasMap,
  votoCoincideConSenador,
} from "@/lib/matchSenadorNombre";
import { averagePresentismo } from "@/utils/presentismo";
import { normalizeResultado, normalizeVotoTipo } from "@/utils/votoTipo";

function slug(value: string) {
  return slugify(value || "", { lower: true, strict: true, trim: true });
}

function getApiOrigin() {
  const nuxtApp = tryUseNuxtApp();
  const publicConfig = (nuxtApp?.$config?.public || {}) as Record<
    string,
    unknown
  >;
  const raw = String(
    publicConfig.apiUrl ||
      publicConfig.apiBaseUrl ||
      "https://api.argentinadatos.com",
  );
  try {
    return new URL(raw).origin;
  } catch {
    return "https://api.argentinadatos.com";
  }
}

let _senadores: Senador[] | null = null;
let _actas: Acta[] | null = null;
let _senadoresConActas: Senador[] | null = null;

/** Limpia caches en memoria. */
export function clearSenadoresDataCache() {
  _senadores = null;
  _actas = null;
  _senadoresConActas = null;
}

function votoMatchesSenador(voto: Voto, senador: Senador): boolean {
  return votoCoincideConSenador({
    votoNombre: voto.senador || "",
    votoSlug: voto.senadorSlug || "",
    senadorId: senador.id,
    senadorNombre: senador.nombre || senador.nombreCompleto || "",
    senadorSlug: senador.nombreSlug || "",
    aliasMap: getSenadoresAliasMap(),
  });
}

function maxByPeriod(a: any, b: any) {
  const aLegal = new Date(a?.periodoLegal?.inicio || 0).getTime();
  const bLegal = new Date(b?.periodoLegal?.inicio || 0).getTime();
  if (aLegal !== bLegal) return bLegal - aLegal;
  const aReal = new Date(a?.periodoReal?.inicio || 0).getTime();
  const bReal = new Date(b?.periodoReal?.inicio || 0).getTime();
  if (aReal !== bReal) return bReal - aReal;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function mapSenador(raw: any): Senador {
  const parsed = parseNombreSenador(raw.nombre || "");
  return {
    id: String(raw.id),
    nombre: raw.nombre || "",
    apellido: parsed.apellido,
    nombreDePila: parsed.nombreDePila,
    nombreCompleto: parsed.nombreCompleto || raw.nombre || "",
    nombreSlug: slug(raw.nombre || ""),
    provincia: raw.provincia || "",
    partido: raw.partido || "Sin Especificar",
    periodoLegal: {
      inicio: raw.periodoLegal?.inicio || "",
      fin: raw.periodoLegal?.fin ?? null,
    },
    periodoReal: {
      inicio: raw.periodoReal?.inicio || "",
      fin: raw.periodoReal?.fin ?? null,
    },
    reemplazo: raw.reemplazo ?? null,
    observaciones: raw.observaciones ?? null,
    foto: raw.foto || null,
    email: raw.email ?? null,
    telefono: raw.telefono ?? null,
  };
}

function mapActa(raw: any): Acta {
  return {
    id: String(raw.actaId ?? raw.id),
    titulo: raw.titulo || "",
    proyecto: raw.proyecto || "",
    descripcion: raw.descripcion || "",
    quorumTipo: raw.quorumTipo || "",
    fecha: raw.fecha || "",
    numeroActa: raw.acta != null ? String(raw.acta) : "",
    mayoria: raw.mayoria || "",
    miembros: raw.miembros ?? 0,
    votosAfirmativos: raw.afirmativos ?? 0,
    votosNegativos: raw.negativos ?? 0,
    abstenciones: raw.abstenciones ?? 0,
    presentes: raw.presentes ?? 0,
    ausentes: raw.ausentes ?? 0,
    amn: raw.amn ?? 0,
    resultado: normalizeResultado(raw.resultado),
    observaciones: raw.observaciones || [],
    votos: (raw.votos || []).map(
      (v: any): Voto => ({
        senador: v.nombre || "",
        senadorSlug: slug(v.nombre || ""),
        tipoVoto: normalizeVotoTipo(v.voto),
        banca: v.banca || "",
      }),
    ),
  };
}

export async function getSenadores(): Promise<Senador[]> {
  if (_senadores) return _senadores;

  const origin = getApiOrigin();
  const raw = await $fetch<any[]>(`${origin}/v1/senado/senadores`);

  const byId = new Map<string, any>();
  [...raw].sort(maxByPeriod).forEach((d) => {
    const id = String(d.id);
    if (!byId.has(id)) byId.set(id, d);
  });

  _senadores = Array.from(byId.values())
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map(mapSenador);

  return _senadores;
}

export async function getActas(): Promise<Acta[]> {
  if (_actas) return _actas;

  const origin = getApiOrigin();
  const raw = await $fetch<any[]>(`${origin}/v1/senado/actas`);

  _actas = raw
    .filter((a) => a.fecha && String(a.fecha).trim())
    .map(mapActa)
    .sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

  return _actas;
}

export async function getSenadoresConActas(): Promise<Senador[]> {
  if (_senadoresConActas) return _senadoresConActas;

  const senadores = await getSenadores();
  const actas = await getActas();

  _senadoresConActas = senadores.map((senador) => {
    const actasSenador = actas
      .filter((acta) =>
        acta.votos.some((v) => votoMatchesSenador(v, senador)),
      )
      .map((acta) => {
        const votoSenador = acta.votos.find((v) =>
          votoMatchesSenador(v, senador),
        );
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
          votoSenador,
          tipoVotoSenador: votoSenador?.tipoVoto,
        };
      });

    const estadisticas = calcularEstadisticasSenador(actasSenador);
    return { ...senador, estadisticas, actasSenador };
  });

  return _senadoresConActas;
}

/** Param de ruta: id API, nombre completo (Next legacy) o nombreSlug. */
function normalizeSenadorParam(param: string): string {
  const raw = String(param || "").trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function getSenadorConActasById(
  idOrName: string,
): Promise<Senador | null> {
  const list = await getSenadoresConActas();
  const encoded = String(idOrName || "").trim();
  const decoded = normalizeSenadorParam(encoded);

  const byId = list.find((d) => d.id === encoded || d.id === decoded);
  if (byId) return byId;

  const byNombre = list.find(
    (d) => d.nombre === decoded || d.nombreCompleto === decoded,
  );
  if (byNombre) return byNombre;

  const slugParam = slug(decoded);
  return (
    list.find(
      (d) => d.nombreSlug === slugParam || d.nombreSlug === decoded,
    ) || null
  );
}

export async function getActaWithSenadoresById(
  id: string,
): Promise<Acta | null> {
  const actas = await getActas();
  const actaById = actas.find((a) => a.id === id) || null;
  if (!actaById) return null;

  const senadores = await getSenadores();

  return {
    ...actaById,
    votos: actaById.votos.map((v) => {
      const matched = senadores.find((s) => votoMatchesSenador(v, s));
      const parsed = parseNombreSenador(v.senador);

      return {
        ...v,
        senadorObj: {
          ...(matched || {
            id: v.senadorSlug || slug(v.senador),
            nombre: v.senador,
            apellido: parsed.apellido,
            nombreDePila: parsed.nombreDePila,
            nombreCompleto: parsed.nombreCompleto,
            nombreSlug: v.senadorSlug || slug(v.senador),
            provincia: "",
            partido: "",
            periodoLegal: { inicio: "", fin: null },
            periodoReal: { inicio: "", fin: null },
            foto: null,
          }),
          tipoVoto: v.tipoVoto,
        } as Senador,
      };
    }),
  };
}

const preassigned: Record<string, string> = {
  "Juntos por el Cambio": "#eab308",
  "Alianza la Libertad Avanza": "#a855f7",
  "La Libertad Avanza": "#a855f7",
  "Frente de Todos": "#3b82f6",
  "Alianza Unión por la Patria": "#2563eb",
  "Unión por la Patria": "#2563eb",
  "Unión Cívica Radical": "#ef4444",
  Justicialista: "#1d4ed8",
  "Frente Cívico por Santiago": "#0ea5e9",
  "Hacemos por Córdoba": "#22c55e",
  "Sin Especificar": "#6b7280",
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

function colorForPartidoFactory() {
  let i = 0;
  return (partido: string) => {
    if (preassigned[partido]) return preassigned[partido];
    const c = basePalette[i % basePalette.length];
    i++;
    return c;
  };
}

export function getPartidoColores(partidos: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const getColor = colorForPartidoFactory();
  for (const p of partidos) {
    map[p] = getColor(p);
  }
  return map;
}

export async function getSenadoresPorPartidos() {
  const senadores = (await getSenadores()).filter(isSenadorActivo);
  const partidos = [...new Set(senadores.map((d) => d.partido))];
  return { senadores, partidoColores: getPartidoColores(partidos) };
}

export async function getPartidoSlugs() {
  const senadores = await getSenadores();
  const names = [
    ...new Set(
      senadores.map((d) => d.partido?.trim()).filter(Boolean) as string[],
    ),
  ];
  return names.map((nombre) => ({
    nombre,
    slug: slug(nombre) || "sin-partido",
  }));
}

export async function getPartidosIndex() {
  const senadores = await getSenadoresConActas();
  const byPartido = new Map<string, Senador[]>();

  for (const d of senadores) {
    if (!isSenadorActivo(d)) continue;
    const nombre = d.partido?.trim();
    if (!nombre) continue;
    const list = byPartido.get(nombre);
    if (list) list.push(d);
    else byPartido.set(nombre, [d]);
  }

  const colores = getPartidoColores([...byPartido.keys()]);

  return [...byPartido.entries()]
    .map(([nombre, activos]) => ({
      nombre,
      slug: slug(nombre) || "sin-partido",
      color: colores[nombre] ?? "#6b7280",
      activos: activos.length,
      presentismo: averagePresentismo(activos) ?? 0,
      senadores: activos,
    }))
    .sort(
      (a, b) =>
        b.activos - a.activos || a.nombre.localeCompare(b.nombre, "es"),
    );
}

export async function getPartidoBySlug(slugParam: string) {
  const senadores = await getSenadoresConActas();
  const target = String(slugParam || "").trim();
  if (!target) return null;

  const nombre =
    senadores.find((d) => (slug(d.partido || "") || "sin-partido") === target)
      ?.partido || null;
  if (!nombre) return null;

  const delPartido = senadores.filter((d) => d.partido === nombre);
  const color = getPartidoColores([nombre])[nombre] ?? "#6b7280";
  const activos = delPartido.filter(isSenadorActivo);
  const inactivos = delPartido.filter((d) => !isSenadorActivo(d));

  return {
    nombre,
    slug: target,
    color,
    senadores: delPartido,
    activos,
    inactivos,
    presentismo: averagePresentismo(activos.length ? activos : delPartido),
  };
}
