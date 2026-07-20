export type ChamberId = "diputados" | "senadores";

export type ChamberConfig = {
  id: ChamberId;
  /** Subdomain label: diputados | senadores */
  slug: ChamberId;
  siteHost: string;
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  keywords: string;
  /** Nav brand text before .argentinadatos.com */
  brand: string;
  /** Logo en /public (navbar + home), modo claro. */
  logoSrc: string;
  /** Logo para dark mode. */
  logoSrcDark: string;
  membersLabel: string;
  membersPath: string;
  groupsLabel: string;
  groupsPath: string;
  officialUrl: string;
  officialLabel: string;
  githubUrl: string;
  bodyName: string;
};

export const CHAMBERS: Record<ChamberId, ChamberConfig> = {
  diputados: {
    id: "diputados",
    slug: "diputados",
    siteHost: "diputados.argentinadatos.com",
    siteUrl: "https://diputados.argentinadatos.com",
    siteName: "Cómo votan los diputados",
    siteDescription:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada diputado en cada proyecto de ley de la Cámara de Diputados.",
    keywords:
      "diputados, cámara de diputados, votaciones, actas, argentina, bloques",
    brand: "diputados",
    logoSrc: "/assets/diputados.png",
    logoSrcDark: "/assets/diputados-dark.png",
    membersLabel: "Diputados",
    membersPath: "/diputados",
    groupsLabel: "Bloques",
    groupsPath: "/diputados/bloques",
    officialUrl: "https://www.diputados.gob.ar/",
    officialLabel: "diputados.gob.ar",
    githubUrl: "https://github.com/enzonotario/diputados",
    bodyName: "la Cámara de Diputados de la Nación Argentina",
  },
  senadores: {
    id: "senadores",
    slug: "senadores",
    siteHost: "senadores.argentinadatos.com",
    siteUrl: "https://senadores.argentinadatos.com",
    siteName: "Cómo votan los senadores",
    siteDescription:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada senador en cada proyecto de ley del Senado de la Nación.",
    keywords:
      "senadores, senado, votaciones, actas, argentina, partidos políticos",
    brand: "senadores",
    logoSrc: "/assets/senado.png",
    logoSrcDark: "/assets/senado-dark.png",
    membersLabel: "Senadores",
    membersPath: "/senadores",
    groupsLabel: "Partidos",
    groupsPath: "/senadores/partidos",
    officialUrl: "https://www.senadores.gob.ar/",
    officialLabel: "senadores.gob.ar",
    githubUrl: "https://github.com/enzonotario/senadores",
    bodyName: "el Senado de la Nación Argentina",
  },
};

/** Local + prod host patterns. Prefer explicit chamber markers in hostname. */
export function resolveChamberFromHost(
  hostname: string,
  fallback: ChamberId = "senadores",
): ChamberId {
  const host = String(hostname || "")
    .toLowerCase()
    .split(":")[0];

  if (host.includes("diputados")) return "diputados";
  if (host.includes("senadores")) return "senadores";

  return fallback;
}

export function getChamberConfig(id: ChamberId): ChamberConfig {
  return CHAMBERS[id];
}

export function otherChamberId(id: ChamberId): ChamberId {
  return id === "diputados" ? "senadores" : "diputados";
}

/**
 * Hostname de la otra cámara, preservando el entorno local
 * (p.ej. diputados.localhost.test → senadores.localhost.test).
 */
export function swapChamberHostname(
  hostname: string,
  to: ChamberId,
): string {
  const host = String(hostname || "")
    .toLowerCase()
    .split(":")[0];
  const from = otherChamberId(to);
  if (host.includes(from)) {
    return host.replace(from, to);
  }
  if (host.includes(to)) return host;
  return CHAMBERS[to].siteHost;
}

/** URL absoluta a la otra cámara (misma ruta opcional). */
export function buildChamberAbsoluteUrl(
  to: ChamberId,
  opts: {
    hostname: string;
    protocol?: string;
    port?: string;
    path?: string;
  },
): string {
  const host = swapChamberHostname(opts.hostname, to);
  const protocol = opts.protocol || "https:";
  const isLocal =
    host.includes("localhost") ||
    host.endsWith(".test") ||
    host === "127.0.0.1";
  const port =
    opts.port && isLocal && !["80", "443", ""].includes(opts.port)
      ? `:${opts.port}`
      : "";
  const path = opts.path?.startsWith("/") ? opts.path : `/${opts.path || ""}`;
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "") || "/";
  return `${protocol}//${host}${port}${normalizedPath}`;
}

/**
 * Redirect wrong-chamber member routes to the active chamber.
 * Shared routes like /actas stay as-is (data differs by chamber).
 */
export function rewritePathForChamber(
  path: string,
  chamber: ChamberId,
): string | null {
  if (chamber === "diputados") {
    if (path === "/senadores" || path.startsWith("/senadores/")) {
      return path.replace(/^\/senadores/, "/diputados").replace(
        /\/partidos\b/,
        "/bloques",
      );
    }
  }
  if (chamber === "senadores") {
    if (path === "/diputados" || path.startsWith("/diputados/")) {
      return path.replace(/^\/diputados/, "/senadores").replace(
        /\/bloques\b/,
        "/partidos",
      );
    }
  }
  return null;
}
