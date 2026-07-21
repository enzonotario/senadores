import { defineNuxtModule, logger } from "@nuxt/kit";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type RedirectRule = { from: string; to: string; status: 301 | 302 };

/** Solo reglas estáticas en routeRules. */
const STATIC_REDIRECTS: RedirectRule[] = [
  { from: "/votaciones", to: "/actas", status: 301 },
  { from: "/votaciones/**", to: "/actas/**", status: 301 },
  { from: "/afinidad", to: "/", status: 301 },
  { from: "/comparativa", to: "/senadores", status: 301 },
];

function maxByPeriod(a: any, b: any) {
  const aLegal = new Date(a?.periodoLegal?.inicio || 0).getTime();
  const bLegal = new Date(b?.periodoLegal?.inicio || 0).getTime();
  if (aLegal !== bLegal) return bLegal - aLegal;
  const aReal = new Date(a?.periodoReal?.inicio || 0).getTime();
  const bReal = new Date(b?.periodoReal?.inicio || 0).getTime();
  if (aReal !== bReal) return bReal - aReal;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function toRouteRules(redirects: RedirectRule[]) {
  const rules: Record<
    string,
    { redirect: { to: string; statusCode: number } }
  > = {};
  for (const r of redirects) {
    rules[r.from] = { redirect: { to: r.to, statusCode: r.status } };
  }
  return rules;
}

/** nombre (decoded) → id */
async function fetchSenadorNameToId(
  apiOrigin: string,
): Promise<Record<string, string>> {
  const res = await fetch(`${apiOrigin}/v1/senado/senadores`, {
    headers: { "user-agent": "diputados-senadores-legacy-seo-redirects" },
  });
  if (!res.ok) {
    throw new Error(`senadores API ${res.status}`);
  }
  const list = (await res.json()) as any[];
  const byNombre = new Map<string, any>();
  for (const raw of list) {
    const nombre = String(raw?.nombre || "").trim();
    if (!nombre) continue;
    const prev = byNombre.get(nombre);
    if (!prev || maxByPeriod(prev, raw) > 0) {
      byNombre.set(nombre, raw);
    }
  }

  const map: Record<string, string> = {};
  for (const [nombre, raw] of byNombre) {
    const id = String(raw.id || "").trim();
    if (id) map[nombre] = id;
  }
  return map;
}

export default defineNuxtModule({
  meta: {
    name: "legacy-seo-redirects",
  },
  async setup(_options, nuxt) {
    const mapFile = join(
      nuxt.options.rootDir,
      "server/assets/legacy-senador-redirects.json",
    );

    let nameToId: Record<string, string> = {};

    const apiOrigin = (
      process.env.NUXT_PUBLIC_API_URL ||
      process.env.NUXT_PUBLIC_API_BASE_URL ||
      "https://api.argentinadatos.com"
    ).replace(/\/$/, "");

    try {
      nameToId = await fetchSenadorNameToId(apiOrigin);
      logger.info(
        `[legacy-seo-redirects] ${Object.keys(nameToId).length} nombres→id (runtime map)`,
      );
    } catch (error) {
      logger.warn(
        `[legacy-seo-redirects] no se pudo armar mapa por nombre: ${error}`,
      );
    }

    await mkdir(dirname(mapFile), { recursive: true });
    await writeFile(mapFile, `${JSON.stringify(nameToId)}\n`, "utf8");

    nuxt.options.routeRules = {
      ...nuxt.options.routeRules,
      ...toRouteRules(STATIC_REDIRECTS),
    };
  },
});
