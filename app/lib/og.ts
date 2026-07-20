import type { ChamberId } from "./chamber";

/** Color de marca OG (barra cuando no hay resultado). */
export const OG_CHAMBER_ACCENT: Record<ChamberId, string> = {
  diputados: "#111111",
  senadores: "#111111",
};

/** Colores por resultado de acta. */
export const OG_RESULTADO_ACCENT: Record<string, string> = {
  afirmativo: "#14b8a6",
  negativo: "#ef4444",
  abstencion: "#3b82f6",
  empate: "#f59e0b",
  cancelada: "#6b7280",
};

export type OgKind =
  | "home"
  | "list"
  | "member"
  | "group"
  | "acta"
  | "afinidad";

export type ChamberOgInput = {
  eyebrow?: string;
  badge?: string;
  /** Hex o clave de resultado (`afirmativo` → verde). */
  accent?: string;
  kind?: OgKind;
  /** Texto abajo a la izquierda (p. ej. fecha de votación). */
  footerLeft?: string;
  /** Conteos para actas — se muestran como indicador coloreado en la OG. */
  votosAfirmativos?: number;
  votosNegativos?: number;
  abstenciones?: number;
  /** Foto/avatar del miembro (URL absoluta o path público). */
  photoSrc?: string;
};

/** Serializa conteos para props OG (`46:25:1`). */
export function encodeOgVotes(input?: {
  votosAfirmativos?: number;
  votosNegativos?: number;
  abstenciones?: number;
}): string {
  if (!input) return "";
  const { votosAfirmativos, votosNegativos, abstenciones } = input;
  if (
    votosAfirmativos == null &&
    votosNegativos == null &&
    abstenciones == null
  ) {
    return "";
  }
  return `${votosAfirmativos ?? 0}:${votosNegativos ?? 0}:${abstenciones ?? 0}`;
}

/** Parsea `46:25:1` → conteos. */
export function decodeOgVotes(raw?: string | null): {
  afirmativos: number;
  negativos: number;
  abstenciones: number;
} | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => Number(p));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return {
    afirmativos: parts[0],
    negativos: parts[1],
    abstenciones: parts[2],
  };
}

export function resolveOgAccent(
  accent: string | undefined,
  chamber: ChamberId,
): string {
  if (!accent) return OG_CHAMBER_ACCENT[chamber];
  const raw = accent.trim();
  if (raw.startsWith("#") && /^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;

  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (key.startsWith("afirmativ")) return OG_RESULTADO_ACCENT.afirmativo;
  if (key.startsWith("negativ")) return OG_RESULTADO_ACCENT.negativo;
  if (key.includes("abstenc")) return OG_RESULTADO_ACCENT.abstencion;
  if (key.includes("empate")) return OG_RESULTADO_ACCENT.empate;
  if (key.includes("cancel")) return OG_RESULTADO_ACCENT.cancelada;

  return OG_CHAMBER_ACCENT[chamber];
}

export function resultadoBadgeLabel(resultado?: string | null): string {
  const raw = String(resultado || "")
    .toLowerCase()
    .trim();
  if (raw.startsWith("afirmativ")) return "Afirmativo";
  if (raw.startsWith("negativ")) return "Negativo";
  if (raw.includes("abstenc")) return "Abstención";
  if (raw.includes("empate")) return "Empate";
  if (raw.includes("cancel")) return "Cancelada";
  if (!resultado) return "Votación";
  return String(resultado);
}

export function truncateOgText(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
