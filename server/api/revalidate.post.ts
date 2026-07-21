import { clearDiputadosDataCache } from "../../app/lib/diputados-data";
import { clearSenadoresDataCache } from "../../app/lib/senadores-data";
import { CHAMBERS, type ChamberId } from "../../app/lib/chamber";

type RevalidateBody = {
  /** Si true (default), limpia caches en memoria de actas/miembros. */
  clearData?: boolean;
  /** Paths a “calentar” con HEAD (opcional; útil detrás de CDN). */
  paths?: string[];
  hosts?: string[];
  chamber?: ChamberId | "all";
};

const SEED_PATHS: Record<ChamberId, string[]> = {
  diputados: ["/", "/actas", "/diputados", "/diputados/bloques"],
  senadores: ["/", "/actas", "/senadores", "/senadores/partidos"],
};

function defaultHosts(): string[] {
  return [CHAMBERS.senadores.siteUrl, CHAMBERS.diputados.siteUrl];
}

function resolvePaths(body: RevalidateBody): string[] {
  if (body.paths?.length) {
    return [
      ...new Set(body.paths.map((p) => (p.startsWith("/") ? p : `/${p}`))),
    ];
  }

  const chamber = body.chamber ?? "all";
  if (chamber === "diputados") return SEED_PATHS.diputados;
  if (chamber === "senadores") return SEED_PATHS.senadores;
  return [...new Set([...SEED_PATHS.senadores, ...SEED_PATHS.diputados])];
}

function resolveHosts(body: RevalidateBody): string[] {
  if (body.hosts?.length) return body.hosts;
  if (body.chamber === "diputados") return [CHAMBERS.diputados.siteUrl];
  if (body.chamber === "senadores") return [CHAMBERS.senadores.siteUrl];
  return defaultHosts();
}

/**
 * Refresco de datos / cache.
 *
 * En Coolify/VPS: limpia las caches en memoria del proceso Node
 * (`*-data.ts`). El próximo request vuelve a bajar actas de la API.
 *
 * Auth: `Authorization: Bearer <NUXT_REVALIDATE_SECRET>`
 * o `x-revalidate-token`.
 *
 * Body opcional:
 * `{ "clearData": true, "chamber": "all", "paths": ["/"] }`
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const secret = String(config.revalidateSecret || "");

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: "NUXT_REVALIDATE_SECRET no configurado",
    });
  }

  const auth = getHeader(event, "authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = getHeader(event, "x-revalidate-token")?.trim();
  const token = bearer || headerToken;

  if (!token || token !== secret) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = ((await readBody(event)) || {}) as RevalidateBody;
  const clearData = body.clearData !== false;

  if (clearData) {
    clearSenadoresDataCache();
    clearDiputadosDataCache();
  }

  const warmResults: Array<{
    url: string;
    status: number;
  }> = [];

  const shouldWarm =
    Boolean(body.paths?.length) || body.chamber != null;

  if (shouldWarm) {
    const paths = resolvePaths(body);
    const hosts = resolveHosts(body);

    for (const host of hosts) {
      for (const path of paths) {
        const url = new URL(path, host.endsWith("/") ? host : `${host}/`).href;
        try {
          const res = await $fetch.raw(url, {
            method: "HEAD",
            ignoreResponseError: true,
          });
          warmResults.push({
            url,
            status: res.status,
          });
        } catch (err: any) {
          warmResults.push({
            url,
            status: err?.statusCode || err?.status || 0,
          });
        }
      }
    }
  }

  return {
    ok: true,
    clearedData: clearData,
    warmed: warmResults.length,
    results: warmResults,
  };
});
