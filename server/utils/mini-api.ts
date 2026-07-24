import type { ChamberId } from "../../app/lib/chamber";
import {
  getActas as getActasDiputados,
  getBloqueBySlug,
  getBloqueSlugs,
  getBloquesIndex,
  getDiputadoConActasById,
  getDiputados,
  getDiputadosConActas,
  getActaWithDiputadosById,
} from "../../app/lib/diputados-data";
import { getMemberCareerCargos } from "../../app/lib/member-career-data";
import {
  getActas as getActasSenadores,
  getPartidoBySlug,
  getPartidoSlugs,
  getPartidosIndex,
  getSenadorConActasById,
  getSenadores,
  getSenadoresConActas,
  getActaWithSenadoresById,
} from "../../app/lib/senadores-data";
import type { SlimAffinityPeer } from "../../app/lib/payload-slim";
import { slimActas, slimMemberStats, slimMembersStats } from "../../app/lib/payload-slim";
import {
  formatDate,
  isDiputadoActivo,
  isSenadorActivo,
} from "../../app/lib/utils";
import { bloquePath } from "../../app/utils/bloque";
import { partidoPath } from "../../app/utils/partido";
import {
  memberActasInWindow,
  votesFromDiputado,
  votesFromSenador,
  type AffinityGroupInput,
} from "../../app/utils/votingAffinity";

export type SearchCatalogItem = {
  id: string;
  label: string;
  suffix?: string;
  description?: string;
  resultado?: string;
  proyecto?: string;
  to?: string;
  target?: string;
  icon?: string;
  avatar?: { src: string };
};

export type AffinityPeerDto = SlimAffinityPeer & { activo: boolean };

export type HistoryActaRow = {
  id: string;
  titulo?: string | null;
  resultado?: string | null;
  fecha?: string | null;
  periodo?: string | null;
  tipoVoto?: string | null;
  votosAfirmativos?: number | null;
  votosNegativos?: number | null;
  abstenciones?: number | null;
  ausentes?: number | null;
  presentes?: number | null;
  miembros?: number | null;
};

const DEFAULT_HISTORY_LIMIT = 40;
const MAX_HISTORY_LIMIT = 100;

function sortActasByFechaDesc<T extends { fecha?: string | null }>(list: T[]) {
  return [...list].sort((a, b) =>
    String(b.fecha || "").localeCompare(String(a.fecha || "")),
  );
}

export async function buildSearchCatalog(chamber: ChamberId) {
  if (chamber === "diputados") {
    const [diputados, bloques, listaActas] = await Promise.all([
      getDiputados(),
      getBloqueSlugs(),
      getActasDiputados(),
    ]);

    const members: SearchCatalogItem[] = [...diputados]
      .sort((a, b) => {
        const aAct = isDiputadoActivo(a) ? 0 : 1;
        const bAct = isDiputadoActivo(b) ? 0 : 1;
        if (aAct !== bAct) return aAct - bAct;
        return String(a.nombreCompleto || "").localeCompare(
          String(b.nombreCompleto || ""),
          "es",
        );
      })
      .map((d) => {
        const activo = isDiputadoActivo(d);
        return {
          id: `diputado-${d.id}`,
          label: d.nombreCompleto || `${d.apellido}, ${d.nombre}`,
          suffix: activo ? "Activo" : "Inactivo",
          description: [d.bloque, d.provincia].filter(Boolean).join(" · "),
          to: `/diputados/${d.id}`,
          avatar: d.foto ? { src: d.foto } : undefined,
        };
      });

    const groups: SearchCatalogItem[] = bloques
      .map((b) => {
        const to = bloquePath(b.nombre);
        if (!to) return null;
        return {
          id: `bloque-${b.slug}`,
          label: b.nombre,
          suffix: "Bloque",
          icon: "i-lucide-shapes",
          to,
        } satisfies SearchCatalogItem;
      })
      .filter(Boolean) as SearchCatalogItem[];

    const actas: SearchCatalogItem[] = [...listaActas]
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .map((a) => ({
        id: `acta-${a.id}`,
        label: a.titulo || `Acta ${a.id}`,
        suffix: formatDate(a.fecha),
        description: a.resultado || undefined,
        resultado: a.resultado || undefined,
        icon: "i-lucide-file-text",
        to: `/actas/${a.id}`,
      }));

    return { chamber, members, groups, actas };
  }

  const [senadores, partidos, listaActas] = await Promise.all([
    getSenadores(),
    getPartidoSlugs(),
    getActasSenadores(),
  ]);

  const members: SearchCatalogItem[] = [...senadores]
    .sort((a, b) => {
      const aAct = isSenadorActivo(a) ? 0 : 1;
      const bAct = isSenadorActivo(b) ? 0 : 1;
      if (aAct !== bAct) return aAct - bAct;
      return String(a.nombreCompleto || a.nombre || "").localeCompare(
        String(b.nombreCompleto || b.nombre || ""),
        "es",
      );
    })
    .map((s) => {
      const activo = isSenadorActivo(s);
      return {
        id: `senador-${s.id}`,
        label: s.nombreCompleto || s.nombre,
        suffix: activo ? "Activo" : "Inactivo",
        description: [s.partido, s.provincia].filter(Boolean).join(" · "),
        to: `/senadores/${s.id}`,
        avatar: s.foto ? { src: s.foto } : undefined,
      };
    });

  const groups: SearchCatalogItem[] = partidos
    .map((p) => {
      const to = partidoPath(p.nombre);
      if (!to) return null;
      return {
        id: `partido-${p.slug}`,
        label: p.nombre,
        suffix: "Partido",
        icon: "i-lucide-shapes",
        to,
      } satisfies SearchCatalogItem;
    })
    .filter(Boolean) as SearchCatalogItem[];

  const actas: SearchCatalogItem[] = [...listaActas]
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .map((a) => ({
      id: `acta-${a.id}`,
      label: a.titulo || `Acta ${a.id}`,
      suffix: formatDate(a.fecha),
      description:
        [a.proyecto, a.resultado].filter(Boolean).join(" · ") || undefined,
      resultado: a.resultado || undefined,
      proyecto: a.proyecto || undefined,
      icon: "i-lucide-file-text",
      to: `/actas/${a.id}`,
    }));

  return { chamber, members, groups, actas };
}

export async function buildAffinityPeers(
  chamber: ChamberId,
): Promise<{ chamber: ChamberId; peers: AffinityPeerDto[] }> {
  if (chamber === "diputados") {
    const all = await getDiputadosConActas();
    const peers: AffinityPeerDto[] = all
      .filter(isDiputadoActivo)
      .map((d) => ({
        id: d.id,
        name:
          d.nombreCompleto ||
          `${d.apellido}, ${d.nombre}` ||
          `${d.nombre} ${d.apellido}`,
        group: d.bloque,
        foto: d.foto,
        votes: memberActasInWindow(votesFromDiputado(d)),
        activo: true,
      }));
    return { chamber, peers };
  }

  const all = await getSenadoresConActas();
  const peers: AffinityPeerDto[] = all
    .filter(isSenadorActivo)
    .map((s) => ({
      id: s.id,
      name: s.nombreCompleto || s.nombre,
      group: s.partido,
      foto: s.foto,
      votes: memberActasInWindow(votesFromSenador(s)),
      activo: true,
    }));
  return { chamber, peers };
}

export async function buildGroupsAffinityIndex(
  chamber: ChamberId,
  opts: { rowsOnly?: boolean } = {},
): Promise<{
  chamber: ChamberId;
  groups: AffinityGroupInput[];
  rows: Array<{
    nombre: string;
    slug: string;
    color: string;
    activos: number;
    presentismo: number;
  }>;
}> {
  const rowsOnly = Boolean(opts.rowsOnly);

  if (chamber === "diputados") {
    const index = await getBloquesIndex();
    const rows = index.map((b) => ({
      nombre: b.nombre,
      slug: b.slug,
      color: b.color,
      activos: b.activos,
      presentismo: b.presentismo,
    }));
    if (rowsOnly) {
      return { chamber, groups: [], rows };
    }
    const groups: AffinityGroupInput[] = index.map((b) => ({
      id: b.slug,
      name: b.nombre,
      slug: b.slug,
      members: (b.diputados || []).map((d) => ({
        id: d.id,
        name:
          d.nombreCompleto ||
          `${d.apellido}, ${d.nombre}` ||
          `${d.nombre} ${d.apellido}`,
        group: b.nombre,
        foto: d.foto,
        votes: memberActasInWindow(votesFromDiputado(d)),
      })),
    }));
    return { chamber, groups, rows };
  }

  const index = await getPartidosIndex();
  const rows = index.map((p) => ({
    nombre: p.nombre,
    slug: p.slug,
    color: p.color,
    activos: p.activos,
    presentismo: p.presentismo,
  }));
  if (rowsOnly) {
    return { chamber, groups: [], rows };
  }
  const groups: AffinityGroupInput[] = index.map((p) => ({
    id: p.slug,
    name: p.nombre,
    slug: p.slug,
    members: (p.senadores || []).map((s) => ({
      id: s.id,
      name: s.nombreCompleto || s.nombre,
      group: p.nombre,
      foto: s.foto,
      votes: memberActasInWindow(votesFromSenador(s)),
    })),
  }));
  return { chamber, groups, rows };
}

function parsePageLimit(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    MAX_HISTORY_LIMIT,
    Math.max(1, Number(query.limit) || DEFAULT_HISTORY_LIMIT),
  );
  return { page, limit };
}

function historyRowsFromDiputado(actas: any[]): HistoryActaRow[] {
  return sortActasByFechaDesc(actas).map((a) => ({
    id: String(a.id),
    titulo: a.titulo,
    resultado: a.resultado,
    fecha: a.fecha,
    periodo: a.periodo,
    tipoVoto: a.tipoVotoDiputado,
    votosAfirmativos: a.votosAfirmativos,
    votosNegativos: a.votosNegativos,
    abstenciones: a.abstenciones,
    ausentes: a.ausentes,
    presentes: a.presentes,
    miembros: a.miembros,
  }));
}

function historyRowsFromSenador(actas: any[]): HistoryActaRow[] {
  return sortActasByFechaDesc(actas).map((a) => ({
    id: String(a.id),
    titulo: a.titulo,
    resultado: a.resultado,
    fecha: a.fecha,
    periodo: a.periodo,
    tipoVoto: a.tipoVotoSenador,
    votosAfirmativos: a.votosAfirmativos,
    votosNegativos: a.votosNegativos,
    abstenciones: a.abstenciones,
    ausentes: a.ausentes,
    presentes: a.presentes,
    miembros: a.miembros,
  }));
}

export async function buildMemberHistory(
  chamber: ChamberId,
  id: string,
  query: Record<string, unknown>,
) {
  const { page, limit } = parsePageLimit(query);
  const q = String(query.q || "")
    .trim()
    .toLowerCase();

  if (chamber === "diputados") {
    const member = await getDiputadoConActasById(id);
    if (!member) return null;
    let rows = historyRowsFromDiputado(member.actasDiputado || []);
    if (q) {
      rows = rows.filter(
        (a) =>
          a.titulo?.toLowerCase().includes(q) ||
          a.resultado?.toLowerCase().includes(q) ||
          a.fecha?.toLowerCase().includes(q) ||
          a.tipoVoto?.toLowerCase().includes(q),
      );
    }
    const total = rows.length;
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);
    return {
      chamber,
      id: member.id,
      page,
      limit,
      total,
      items,
    };
  }

  const member = await getSenadorConActasById(id);
  if (!member) return null;
  let rows = historyRowsFromSenador(member.actasSenador || []);
  if (q) {
    rows = rows.filter(
      (a) =>
        a.titulo?.toLowerCase().includes(q) ||
        a.resultado?.toLowerCase().includes(q) ||
        a.fecha?.toLowerCase().includes(q) ||
        a.tipoVoto?.toLowerCase().includes(q),
    );
  }
  const total = rows.length;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);
  return {
    chamber,
    id: member.id,
    page,
    limit,
    total,
    items,
  };
}

/** Perfil slim + charts + primera página de historial (para ficha). */
export async function buildMemberProfile(
  chamber: ChamberId,
  id: string,
  query: Record<string, unknown> = {},
) {
  const { page, limit } = parsePageLimit({
    page: query.page ?? 1,
    limit: query.limit ?? DEFAULT_HISTORY_LIMIT,
  });

  if (chamber === "diputados") {
    const member = await getDiputadoConActasById(id);
    if (!member) return null;
    const allRows = historyRowsFromDiputado(member.actasDiputado || []);
    const total = allRows.length;
    const items = allRows.slice(0, limit);
    const chartActas = (member.actasDiputado || []).map((a) => ({
      id: String(a.id),
      fecha: a.fecha,
      titulo: a.titulo,
      resultado: a.resultado,
      periodo: a.periodo,
      votosAfirmativos: a.votosAfirmativos,
      votosNegativos: a.votosNegativos,
      abstenciones: a.abstenciones,
      ausentes: a.ausentes,
      presentes: a.presentes,
      miembros: a.miembros,
      tipoVotoDiputado: a.tipoVotoDiputado,
    }));
    const actasMeta = chartActas.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      resultado: a.resultado,
    }));
    const career = await getMemberCareerCargos({
      chamber: "diputados",
      id: String(member.id),
      nombreCompleto:
        member.nombreCompleto || `${member.apellido}, ${member.nombre}`,
      apellido: member.apellido,
      nombre: member.nombre,
      provincia: member.provincia,
      genero: member.genero,
    });
    return {
      chamber,
      member: slimMemberStats(member),
      chartActas,
      actasMeta,
      career,
      history: { page, limit, total, items },
    };
  }

  const member = await getSenadorConActasById(id);
  if (!member) return null;
  const allRows = historyRowsFromSenador(member.actasSenador || []);
  const total = allRows.length;
  const items = allRows.slice(0, limit);
  const chartActas = (member.actasSenador || []).map((a) => ({
    id: String(a.id),
    fecha: a.fecha,
    titulo: a.titulo,
    resultado: a.resultado,
    periodo: a.periodo,
    votosAfirmativos: a.votosAfirmativos,
    votosNegativos: a.votosNegativos,
    abstenciones: a.abstenciones,
    ausentes: a.ausentes,
    presentes: a.presentes,
    miembros: a.miembros,
    tipoVotoSenador: a.tipoVotoSenador,
  }));
  const actasMeta = chartActas.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    resultado: a.resultado,
  }));
  const career = await getMemberCareerCargos({
    chamber: "senadores",
    id: String(member.id),
    nombreCompleto: member.nombreCompleto || member.nombre,
    apellido: member.apellido,
    nombre: member.nombreDePila,
    provincia: member.provincia,
    genero: null,
  });
  return {
    chamber,
    member: slimMemberStats(member),
    chartActas,
    actasMeta,
    career,
    history: { page, limit, total, items },
  };
}

export async function buildSlimActas(chamber: ChamberId) {
  const actas =
    chamber === "diputados"
      ? await getActasDiputados()
      : await getActasSenadores();
  return { chamber, actas: slimActas(actas) };
}

export async function buildMembersList(chamber: ChamberId) {
  if (chamber === "diputados") {
    const list = await getDiputadosConActas();
    return { chamber, members: slimMembersStats(list) };
  }
  const list = await getSenadoresConActas();
  return { chamber, members: slimMembersStats(list) };
}

export async function buildGroupBySlug(chamber: ChamberId, slug: string) {
  if (chamber === "diputados") {
    const b = await getBloqueBySlug(slug);
    if (!b) return null;
    const actasMeta: Record<
      string,
      { id: string; titulo?: string | null; resultado?: string | null }
    > = {};
    for (const d of b.activos) {
      for (const a of d.actasDiputado || []) {
        if (!a?.id || actasMeta[a.id]) continue;
        actasMeta[String(a.id)] = {
          id: String(a.id),
          titulo: a.titulo,
          resultado: a.resultado,
        };
      }
    }
    return {
      chamber,
      nombre: b.nombre,
      slug: b.slug,
      color: b.color,
      presentismo: b.presentismo,
      activos: slimMembersStats(b.activos),
      inactivos: slimMembersStats(b.inactivos),
      cohesionPeers: b.activos.map((d) => ({
        id: d.id,
        name:
          d.nombreCompleto ||
          `${d.apellido}, ${d.nombre}` ||
          `${d.nombre} ${d.apellido}`,
        group: d.bloque,
        foto: d.foto,
        votes: memberActasInWindow(votesFromDiputado(d)),
      })),
      actasMeta,
    };
  }

  const p = await getPartidoBySlug(slug);
  if (!p) return null;
  const actasMeta: Record<
    string,
    { id: string; titulo?: string | null; resultado?: string | null }
  > = {};
  for (const s of p.activos) {
    for (const a of s.actasSenador || []) {
      if (!a?.id || actasMeta[a.id]) continue;
      actasMeta[String(a.id)] = {
        id: String(a.id),
        titulo: a.titulo,
        resultado: a.resultado,
      };
    }
  }
  return {
    chamber,
    nombre: p.nombre,
    slug: p.slug,
    color: p.color,
    presentismo: p.presentismo,
    activos: slimMembersStats(p.activos),
    inactivos: slimMembersStats(p.inactivos),
    cohesionPeers: p.activos.map((s) => ({
      id: s.id,
      name: s.nombreCompleto || s.nombre,
      group: s.partido,
      foto: s.foto,
      votes: memberActasInWindow(votesFromSenador(s)),
    })),
    actasMeta,
  };
}

export async function buildActaDetail(chamber: ChamberId, id: string) {
  if (chamber === "diputados") {
    return getActaWithDiputadosById(id);
  }
  return getActaWithSenadoresById(id);
}
