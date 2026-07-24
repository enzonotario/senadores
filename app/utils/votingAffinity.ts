import {
  formatMonthKey,
  formatTrimestreKey,
  monthKeyFromFecha,
  trimestreKeyFromFecha,
} from "@/utils/chartSeries";
import {
  formatMandatoKey,
  mandatoKeyFromFecha,
  type MandatoRange,
} from "@/utils/memberCareer";
import { normalizeVotoTipo } from "@/utils/votoTipo";

/** Misma ventana temporal que Tendencias en el home. */
export const AFFINITY_FROM_DATE = "2021-01-01";

export type MemberVoteRow = {
  id: string;
  fecha: string;
  voto?: string | null;
};

export type AffinityMemberInput = {
  id: string;
  name: string;
  group?: string | null;
  foto?: string | null;
  votes: MemberVoteRow[];
};

export type AffinityPair = {
  id: string;
  name: string;
  group?: string | null;
  foto?: string | null;
  rate: number;
  agree: number;
  compared: number;
};

export type MemberAlignment = {
  id: string;
  name: string;
  foto?: string | null;
  rate: number;
  aligned: number;
  compared: number;
};

export type DissentPeriodPoint = {
  key: string;
  label: string;
  dissentRate: number;
  dissent: number;
  compared: number;
};

export type DissentActa = {
  id: string;
  fecha: string;
  /** Voto del miembro. */
  voto: string;
  /** Moda del bloque/partido en esa acta. */
  mode: string;
};

export type DissentResult = {
  dissentRate: number | null;
  dissent: number;
  compared: number;
  byMonth: DissentPeriodPoint[];
  byTrimestre: DissentPeriodPoint[];
  byMandato: DissentPeriodPoint[];
  /** Actas donde el miembro votó distinto a la moda del grupo. */
  actas: DissentActa[];
};

export type GroupCohesionResult = {
  /** Promedio de afinidad pairwise intra-grupo (0–1). */
  pairwiseAvg: number | null;
  /** % de votos iguales a la moda del grupo (0–1). */
  modeAlignment: number | null;
  memberAlignment: MemberAlignment[];
  heatmap: AffinityHeatmap;
};

export type AffinityHeatmap = {
  ids: string[];
  labels: string[];
  fotos: (string | null)[];
  /** rate 0–100; null = sin datos suficientes */
  values: (number | null)[][];
};

type AffinityOptions = {
  fromDate?: string;
  minCompared?: number;
};

function fromTimestamp(fromDate = AFFINITY_FROM_DATE): number {
  return new Date(`${fromDate}T00:00:00`).getTime();
}

/** Voto emitido (no ausente). La abstención cuenta como voto propio. */
export function isCastVote(voto?: string | null): boolean {
  return normalizeVotoTipo(voto) !== "ausente";
}

/**
 * Mapa actaId → voto normalizado, solo actas desde `fromDate`
 * donde el miembro emitió voto (excluye ausentes).
 */
export function buildVoteMap(
  votes: MemberVoteRow[],
  fromDate = AFFINITY_FROM_DATE,
): Map<string, string> {
  const start = fromTimestamp(fromDate);
  const map = new Map<string, string>();
  for (const row of votes) {
    if (!row?.id || !row.fecha) continue;
    const t = new Date(row.fecha).getTime();
    if (Number.isNaN(t) || t < start) continue;
    if (!isCastVote(row.voto)) continue;
    map.set(row.id, normalizeVotoTipo(row.voto));
  }
  return map;
}

export function pairAffinity(
  a: Map<string, string>,
  b: Map<string, string>,
): { agree: number; compared: number; rate: number | null } {
  let agree = 0;
  let compared = 0;
  for (const [actaId, votoA] of a) {
    const votoB = b.get(actaId);
    if (!votoB) continue;
    compared++;
    if (votoA === votoB) agree++;
  }
  return {
    agree,
    compared,
    rate: compared > 0 ? agree / compared : null,
  };
}

function shortLabel(name: string, max = 18): string {
  const raw = String(name || "").trim();
  if (!raw) return "—";
  if (raw.includes(",")) {
    const apellido = raw.split(",")[0]?.trim() || raw;
    return apellido.length > max ? `${apellido.slice(0, max - 1)}…` : apellido;
  }
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

export function votesFromDiputado(d: {
  actasDiputado?: Array<{
    id?: string;
    fecha?: string;
    tipoVotoDiputado?: string | null;
  }> | null;
}): MemberVoteRow[] {
  return (d.actasDiputado || [])
    .filter((a) => a?.id && a?.fecha)
    .map((a) => ({
      id: String(a.id),
      fecha: String(a.fecha),
      voto: a.tipoVotoDiputado,
    }));
}

export function votesFromSenador(s: {
  actasSenador?: Array<{
    id?: string;
    fecha?: string;
    tipoVotoSenador?: string | null;
  }> | null;
}): MemberVoteRow[] {
  return (s.actasSenador || [])
    .filter((a) => a?.id && a?.fecha)
    .map((a) => ({
      id: String(a.id),
      fecha: String(a.fecha),
      voto: a.tipoVotoSenador,
    }));
}

export type MemberActaInWindow = {
  id: string;
  fecha: string;
  voto: string;
};

/** Actas en ventana donde el miembro emitió voto (ids + fecha + voto). */
export function memberActasInWindow(
  votes: MemberVoteRow[],
  fromDate = AFFINITY_FROM_DATE,
): MemberActaInWindow[] {
  const start = fromTimestamp(fromDate);
  const rows: MemberActaInWindow[] = [];
  for (const row of votes) {
    if (!row?.id || !row.fecha) continue;
    const t = new Date(row.fecha).getTime();
    if (Number.isNaN(t) || t < start) continue;
    if (!isCastVote(row.voto)) continue;
    rows.push({
      id: row.id,
      fecha: row.fecha,
      voto: normalizeVotoTipo(row.voto),
    });
  }
  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Intersección de actas usadas en el denominador de afinidad. */
export function pairComparedActaIds(
  mapA: Map<string, string>,
  mapB: Map<string, string>,
): string[] {
  const ids: string[] = [];
  for (const actaId of mapA.keys()) {
    if (mapB.has(actaId)) ids.push(actaId);
  }
  return ids;
}

/**
 * Todas las afinidades pairwise del miembro vs el universo
 * (sin recorte topN). Orden: rate desc, compared desc.
 */
export function allPairAffinities(
  memberId: string,
  members: AffinityMemberInput[],
  options: AffinityOptions = {},
): AffinityPair[] {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minCompared = options.minCompared ?? 10;

  const self = members.find((m) => m.id === memberId);
  if (!self) return [];

  const selfMap = buildVoteMap(self.votes, fromDate);
  const pairs: AffinityPair[] = [];

  for (const other of members) {
    if (other.id === memberId) continue;
    const otherMap = buildVoteMap(other.votes, fromDate);
    const { agree, compared, rate } = pairAffinity(selfMap, otherMap);
    if (rate == null || compared < minCompared) continue;
    pairs.push({
      id: other.id,
      name: other.name,
      group: other.group,
      foto: other.foto,
      rate,
      agree,
      compared,
    });
  }

  return pairs.sort((a, b) => b.rate - a.rate || b.compared - a.compared);
}

export function topAlliesAndOpponents(
  memberId: string,
  members: AffinityMemberInput[],
  options: AffinityOptions & { topN?: number } = {},
): { allies: AffinityPair[]; opponents: AffinityPair[] } {
  const topN = options.topN ?? 8;
  const pairs = allPairAffinities(memberId, members, options);
  const byRateAsc = [...pairs].sort(
    (a, b) => a.rate - b.rate || b.compared - a.compared,
  );

  return {
    allies: pairs.slice(0, topN),
    opponents: byRateAsc.slice(0, topN),
  };
}

export type GroupActaQuorum = {
  id: string;
  fecha: string;
  mode: string;
  modeCount: number;
  total: number;
  counts: Record<string, number>;
};

/**
 * Actas con ≥ `minGroupVoters` votos del grupo (las que entran
 * en cohesión/moda), con moda y conteos.
 */
export function groupActasWithQuorum(
  members: AffinityMemberInput[],
  options: AffinityOptions & { minGroupVoters?: number } = {},
): GroupActaQuorum[] {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minGroupVoters = options.minGroupVoters ?? 2;
  const byActa = tallyGroupByActa(members, fromDate);
  const rows: GroupActaQuorum[] = [];

  for (const [actaId, tally] of byActa) {
    const modeInfo = modeOfCounts(tally.counts);
    if (!modeInfo || modeInfo.total < minGroupVoters) continue;
    const counts: Record<string, number> = {};
    for (const [voto, n] of tally.counts) counts[voto] = n;
    rows.push({
      id: actaId,
      fecha: tally.fecha,
      mode: modeInfo.mode,
      modeCount: modeInfo.modeCount,
      total: modeInfo.total,
      counts,
    });
  }

  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

type ActaGroupTally = {
  fecha: string;
  counts: Map<string, number>;
};

function tallyGroupByActa(
  members: AffinityMemberInput[],
  fromDate: string,
): Map<string, ActaGroupTally> {
  const start = fromTimestamp(fromDate);
  const byActa = new Map<string, ActaGroupTally>();

  for (const m of members) {
    for (const row of m.votes) {
      if (!row?.id || !row.fecha) continue;
      const t = new Date(row.fecha).getTime();
      if (Number.isNaN(t) || t < start) continue;
      if (!isCastVote(row.voto)) continue;
      const voto = normalizeVotoTipo(row.voto);
      let tally = byActa.get(row.id);
      if (!tally) {
        tally = { fecha: row.fecha, counts: new Map() };
        byActa.set(row.id, tally);
      }
      tally.counts.set(voto, (tally.counts.get(voto) || 0) + 1);
    }
  }
  return byActa;
}

function modeOfCounts(
  counts: Map<string, number>,
): { mode: string; modeCount: number; total: number } | null {
  let total = 0;
  let mode = "";
  let modeCount = 0;
  for (const [voto, n] of counts) {
    total += n;
    if (n > modeCount || (n === modeCount && voto < mode)) {
      mode = voto;
      modeCount = n;
    }
  }
  if (total === 0 || !mode) return null;
  return { mode, modeCount, total };
}

function pushPeriod(
  map: Map<string, { dissent: number; compared: number }>,
  key: string | null,
  dissented: boolean,
) {
  if (!key) return;
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { dissent: 0, compared: 0 };
    map.set(key, bucket);
  }
  bucket.compared++;
  if (dissented) bucket.dissent++;
}

function periodPoints(
  map: Map<string, { dissent: number; compared: number }>,
  formatLabel: (key: string) => string,
): DissentPeriodPoint[] {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: formatLabel(key),
      dissent: v.dissent,
      compared: v.compared,
      dissentRate: v.compared > 0 ? v.dissent / v.compared : 0,
    }));
}

/**
 * Disidencia = % de actas donde el miembro votó distinto a la moda del grupo.
 * Solo actas con al menos `minGroupVoters` votos emitidos del grupo (quorum).
 */
export function memberDissent(
  member: AffinityMemberInput,
  groupMembers: AffinityMemberInput[],
  options: AffinityOptions & {
    minGroupVoters?: number;
    mandatos?: MandatoRange[];
  } = {},
): DissentResult {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minGroupVoters = options.minGroupVoters ?? 2;
  const mandatos = options.mandatos || [];
  const byActa = tallyGroupByActa(groupMembers, fromDate);
  const selfMap = buildVoteMap(member.votes, fromDate);

  let dissent = 0;
  let compared = 0;
  const actas: DissentActa[] = [];
  const byMonth = new Map<string, { dissent: number; compared: number }>();
  const byTrimestre = new Map<string, { dissent: number; compared: number }>();
  const byMandato = new Map<string, { dissent: number; compared: number }>();

  for (const [actaId, voto] of selfMap) {
    const tally = byActa.get(actaId);
    if (!tally) continue;
    const modeInfo = modeOfCounts(tally.counts);
    if (!modeInfo || modeInfo.total < minGroupVoters) continue;
    const dissented = voto !== modeInfo.mode;
    compared++;
    if (dissented) {
      dissent++;
      actas.push({
        id: actaId,
        fecha: tally.fecha,
        voto,
        mode: modeInfo.mode,
      });
    }
    pushPeriod(byMonth, monthKeyFromFecha(tally.fecha), dissented);
    pushPeriod(byTrimestre, trimestreKeyFromFecha(tally.fecha), dissented);
    if (mandatos.length) {
      const mKey = mandatoKeyFromFecha(tally.fecha, mandatos) || "sin-mandato";
      pushPeriod(byMandato, mKey, dissented);
    }
  }

  actas.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    dissentRate: compared > 0 ? dissent / compared : null,
    dissent,
    compared,
    byMonth: periodPoints(byMonth, formatMonthKey),
    byTrimestre: periodPoints(byTrimestre, formatTrimestreKey),
    byMandato: periodPoints(byMandato, (key) =>
      formatMandatoKey(key, mandatos),
    ),
    actas,
  };
}

export function affinityHeatmapMatrix(
  members: AffinityMemberInput[],
  options: AffinityOptions = {},
): AffinityHeatmap {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minCompared = options.minCompared ?? 5;
  const maps = members.map((m) => buildVoteMap(m.votes, fromDate));
  const n = members.length;
  const values: (number | null)[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  );

  for (let i = 0; i < n; i++) {
    values[i]![i] = 100;
    for (let j = i + 1; j < n; j++) {
      const { compared, rate } = pairAffinity(maps[i]!, maps[j]!);
      const pct =
        rate != null && compared >= minCompared
          ? Math.round(rate * 1000) / 10
          : null;
      values[i]![j] = pct;
      values[j]![i] = pct;
    }
  }

  return {
    ids: members.map((m) => m.id),
    labels: members.map((m) => shortLabel(m.name)),
    fotos: members.map((m) => m.foto || null),
    values,
  };
}

/**
 * Cohesión del grupo: promedio pairwise + alineación a la moda,
 * ranking de integrantes y heatmap intra-grupo.
 */
export function groupCohesion(
  members: AffinityMemberInput[],
  options: AffinityOptions & { minGroupVoters?: number } = {},
): GroupCohesionResult {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minCompared = options.minCompared ?? 5;
  const minGroupVoters = options.minGroupVoters ?? 2;

  const maps = members.map((m) => buildVoteMap(m.votes, fromDate));
  let pairSum = 0;
  let pairCount = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const { compared, rate } = pairAffinity(maps[i]!, maps[j]!);
      if (rate == null || compared < minCompared) continue;
      pairSum += rate;
      pairCount++;
    }
  }

  const byActa = tallyGroupByActa(members, fromDate);
  let modeAligned = 0;
  let modeCompared = 0;
  const memberStats = members.map((m) => ({
    id: m.id,
    name: m.name,
    foto: m.foto || null,
    aligned: 0,
    compared: 0,
  }));

  for (let i = 0; i < members.length; i++) {
    const map = maps[i]!;
    const stats = memberStats[i]!;
    for (const [actaId, voto] of map) {
      const tally = byActa.get(actaId);
      if (!tally) continue;
      const modeInfo = modeOfCounts(tally.counts);
      if (!modeInfo || modeInfo.total < minGroupVoters) continue;
      stats.compared++;
      modeCompared++;
      if (voto === modeInfo.mode) {
        stats.aligned++;
        modeAligned++;
      }
    }
  }

  const memberAlignment: MemberAlignment[] = memberStats
    .filter((s) => s.compared > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      foto: s.foto,
      aligned: s.aligned,
      compared: s.compared,
      rate: s.aligned / s.compared,
    }))
    .sort((a, b) => b.rate - a.rate || b.compared - a.compared);

  return {
    pairwiseAvg: pairCount > 0 ? pairSum / pairCount : null,
    modeAlignment: modeCompared > 0 ? modeAligned / modeCompared : null,
    memberAlignment,
    heatmap: affinityHeatmapMatrix(members, { fromDate, minCompared }),
  };
}

export function formatAffinityPct(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}

/** Color de texto según % de alineación / afinidad (0–1). */
export function affinityRateClass(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "text-muted";
  if (rate >= 0.9) return "text-teal-700 dark:text-teal-300";
  if (rate >= 0.75) return "text-amber-700 dark:text-amber-300";
  return "text-red-700 dark:text-red-300";
}

export type AffinityGroupInput = {
  id: string;
  name: string;
  slug?: string;
  members: AffinityMemberInput[];
};

export type InterGroupPair = {
  id: string;
  name: string;
  slug?: string;
  rate: number;
  agree: number;
  compared: number;
};

/**
 * Moda del grupo por acta → mapa usable con pairAffinity.
 * Con `minGroupVoters: 1` grupos chicos (1 senador) también participan.
 */
export function buildGroupModeVoteMap(
  members: AffinityMemberInput[],
  options: AffinityOptions & { minGroupVoters?: number } = {},
): Map<string, string> {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minGroupVoters = options.minGroupVoters ?? 1;
  const byActa = tallyGroupByActa(members, fromDate);
  const map = new Map<string, string>();
  for (const [actaId, tally] of byActa) {
    const modeInfo = modeOfCounts(tally.counts);
    if (!modeInfo || modeInfo.total < minGroupVoters) continue;
    map.set(actaId, modeInfo.mode);
  }
  return map;
}

export function interGroupAffinity(
  a: AffinityMemberInput[],
  b: AffinityMemberInput[],
  options: AffinityOptions & { minGroupVoters?: number } = {},
): { agree: number; compared: number; rate: number | null } {
  return pairAffinity(
    buildGroupModeVoteMap(a, options),
    buildGroupModeVoteMap(b, options),
  );
}

/**
 * Afinidad moda↔moda del grupo foco vs el resto (sin topN).
 * Orden: rate desc, compared desc.
 */
export function allInterGroupAffinities(
  focusGroupName: string,
  members: AffinityMemberInput[],
  options: AffinityOptions & {
    minGroupVoters?: number;
    groupMeta?: Record<string, { id?: string; slug?: string }>;
  } = {},
): InterGroupPair[] {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minCompared = options.minCompared ?? 20;
  const minGroupVoters = options.minGroupVoters ?? 1;
  const focus = String(focusGroupName || "").trim();
  if (!focus) return [];

  const byGroup = new Map<string, AffinityMemberInput[]>();
  for (const m of members) {
    const g = String(m.group || "").trim();
    if (!g) continue;
    const list = byGroup.get(g);
    if (list) list.push(m);
    else byGroup.set(g, [m]);
  }

  const focusMembers = byGroup.get(focus);
  if (!focusMembers?.length) return [];

  const focusMap = buildGroupModeVoteMap(focusMembers, {
    fromDate,
    minGroupVoters,
  });
  const pairs: InterGroupPair[] = [];

  for (const [name, groupMembers] of byGroup) {
    if (name === focus) continue;
    const { agree, compared, rate } = pairAffinity(
      focusMap,
      buildGroupModeVoteMap(groupMembers, { fromDate, minGroupVoters }),
    );
    if (rate == null || compared < minCompared) continue;
    const meta = options.groupMeta?.[name];
    pairs.push({
      id: meta?.id || name,
      name,
      slug: meta?.slug,
      rate,
      agree,
      compared,
    });
  }

  return pairs.sort((a, b) => b.rate - a.rate || b.compared - a.compared);
}

/**
 * Agrupa miembros por `group` y calcula afinidad moda↔moda
 * del grupo foco vs el resto.
 */
export function topInterGroupAffinities(
  focusGroupName: string,
  members: AffinityMemberInput[],
  options: AffinityOptions & {
    topN?: number;
    minGroupVoters?: number;
    groupMeta?: Record<string, { id?: string; slug?: string }>;
  } = {},
): { allies: InterGroupPair[]; opponents: InterGroupPair[] } {
  const topN = options.topN ?? 8;
  const pairs = allInterGroupAffinities(focusGroupName, members, options);
  const byRateAsc = [...pairs].sort(
    (a, b) => a.rate - b.rate || b.compared - a.compared,
  );

  return {
    allies: pairs.slice(0, topN),
    opponents: byRateAsc.slice(0, topN),
  };
}

/** Matriz moda↔moda entre grupos (para heatmap del índice). */
export function interGroupAffinityMatrix(
  groups: AffinityGroupInput[],
  options: AffinityOptions & { minGroupVoters?: number } = {},
): AffinityHeatmap {
  const fromDate = options.fromDate ?? AFFINITY_FROM_DATE;
  const minCompared = options.minCompared ?? 20;
  const minGroupVoters = options.minGroupVoters ?? 1;
  const maps = groups.map((g) =>
    buildGroupModeVoteMap(g.members, { fromDate, minGroupVoters }),
  );
  const n = groups.length;
  const values: (number | null)[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  );

  for (let i = 0; i < n; i++) {
    values[i]![i] = 100;
    for (let j = i + 1; j < n; j++) {
      const { compared, rate } = pairAffinity(maps[i]!, maps[j]!);
      const pct =
        rate != null && compared >= minCompared
          ? Math.round(rate * 1000) / 10
          : null;
      values[i]![j] = pct;
      values[j]![i] = pct;
    }
  }

  return {
    ids: groups.map((g) => g.id),
    labels: groups.map((g) => shortLabel(g.name, 22)),
    fotos: groups.map(() => null),
    values,
  };
}

