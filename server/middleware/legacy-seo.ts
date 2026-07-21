import nameToId from "../assets/legacy-senador-redirects.json";
import {
  resolveChamberFromHost,
  type ChamberId,
} from "../../app/lib/chamber";

const STATIC: Record<string, string> = {
  "/votaciones": "/actas",
  "/afinidad": "/",
  "/comparativa": "/senadores",
};

function chamberFromEvent(event: any): ChamberId {
  const host =
    getRequestHeader(event, "x-forwarded-host") ||
    getRequestHeader(event, "host") ||
    "";
  const hostname = String(host).split(",")[0].trim().split(":")[0];
  const config = useRuntimeConfig(event);
  const fallback = (config.public.defaultChamber as ChamberId) || "senadores";
  return resolveChamberFromHost(hostname, fallback);
}

/**
 * Redirects SEO legacy (senadores Next → Nuxt).
 * Los ~1k nombre→id van por mapa JSON (no routeRules masivos).
 */
export default defineEventHandler((event) => {
  if (chamberFromEvent(event) !== "senadores") return;

  const url = getRequestURL(event);
  const path = url.pathname.replace(/\/$/, "") || "/";

  const staticTo = STATIC[path];
  if (staticTo) {
    const dest = new URL(staticTo, url);
    dest.search = url.search;
    return sendRedirect(event, dest.pathname + dest.search + dest.hash, 301);
  }

  const votacion = path.match(/^\/votaciones\/([^/]+)$/);
  if (votacion) {
    const dest = new URL(`/actas/${votacion[1]}`, url);
    dest.search = url.search;
    return sendRedirect(event, dest.pathname + dest.search + dest.hash, 301);
  }

  const senador = path.match(/^\/senadores\/([^/]+)$/);
  if (!senador) return;

  const segment = senador[1];
  if (/^\d+$/.test(segment)) return;

  let nombre: string;
  try {
    nombre = decodeURIComponent(segment);
  } catch {
    nombre = segment;
  }

  const map = nameToId as Record<string, string>;
  const id = map[nombre] || map[segment];
  if (!id) return;

  const dest = new URL(`/senadores/${id}`, url);
  dest.search = url.search;
  return sendRedirect(event, dest.pathname + dest.search + dest.hash, 301);
});
