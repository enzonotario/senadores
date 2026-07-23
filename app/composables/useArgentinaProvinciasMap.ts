import { registerMap } from "echarts/core";
import { provinciaKey } from "@/utils/provinciaKey";

const MAP_NAME = "argentina-provincias";

export type ProvinciaMapMeta = {
  key: string;
  displayName: string;
  /** [lon, lat] centroide IGN (útil para pies en geo). */
  center: [number, number];
};

let metas: ProvinciaMapMeta[] = [];

/** Metas del GeoJSON registrado (vacío hasta `ensureArgentinaProvinciasMap`). */
export function getArgentinaProvinciaMetas(): ProvinciaMapMeta[] {
  return metas;
}

/** Descarta polígonos antárticos (GeoJSON IGN estira el mapa a lat -90). */
function clipSouthOf(geometry: any, minLat = -56.2): any {
  if (!geometry) return geometry;

  const ringOk = (ring: number[][]) =>
    Array.isArray(ring) && ring.some((p) => Array.isArray(p) && p[1]! > minLat);

  if (geometry.type === "Polygon") {
    const coords = (geometry.coordinates || []).filter(ringOk);
    return coords.length ? { type: "Polygon", coordinates: coords } : null;
  }

  if (geometry.type === "MultiPolygon") {
    const coords = (geometry.coordinates || [])
      .map((poly: number[][][]) => poly.filter(ringOk))
      .filter((poly: number[][][]) => poly.length > 0);
    return coords.length
      ? { type: "MultiPolygon", coordinates: coords }
      : null;
  }

  return geometry;
}

let ready: Promise<string> | null = null;

/**
 * Carga `/assets/provincias.geojson`, normaliza `name` y registra el mapa en ECharts.
 * Idempotente (client-only).
 */
export function ensureArgentinaProvinciasMap(): Promise<string> {
  if (!import.meta.client) {
    return Promise.resolve(MAP_NAME);
  }
  if (!ready) {
    ready = (async () => {
      const geo = await $fetch<any>("/assets/provincias.geojson");
      const features = (geo.features || [])
        .map((f: any) => {
          const geometry = clipSouthOf(f.geometry);
          if (!geometry) return null;
          const nombre = String(f.properties?.nombre || "");
          return {
            ...f,
            geometry,
            properties: {
              ...f.properties,
              name: provinciaKey(nombre),
              displayName: nombre,
            },
          };
        })
        .filter(Boolean);

      metas = features.map((f: any) => {
        const lon = Number(f.properties?.centroide?.lon);
        const lat = Number(f.properties?.centroide?.lat);
        return {
          key: String(f.properties.name),
          displayName: String(f.properties.displayName || f.properties.name),
          center: [
            Number.isFinite(lon) ? lon : 0,
            Number.isFinite(lat) ? lat : 0,
          ] as [number, number],
        };
      });

      registerMap(MAP_NAME, {
        geoJSON: { type: "FeatureCollection", features },
      } as any);

      return MAP_NAME;
    })().catch((err) => {
      ready = null;
      metas = [];
      throw err;
    });
  }
  return ready;
}

export { MAP_NAME as ARGENTINA_PROVINCIAS_MAP };
