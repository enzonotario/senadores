<script setup lang="ts">
import {
  ARGENTINA_PROVINCIAS_MAP,
  ensureArgentinaProvinciasMap,
  getArgentinaProvinciaMetas,
} from "@/composables/useArgentinaProvinciasMap";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";
import { provinciaKey } from "@/utils/provinciaKey";
import {
  getVotoTipoConfig,
  normalizeVotoTipo,
  VOTO_TIPO_ORDER,
} from "@/utils/votoTipo";

export type ProvinciaVotoMember = {
  provincia?: string | null;
  tipoVoto?: string | null;
};

const props = withDefaults(
  defineProps<{
    members: ProvinciaVotoMember[];
    catalog?: string[];
    selected?: string[];
    membersLabel?: string;
    height?: string;
  }>(),
  {
    catalog: () => [],
    selected: () => [],
    membersLabel: "integrantes",
    height: "32rem",
  },
);

const emit = defineEmits<{
  select: [name: string];
}>();

const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-73.8, -55.3],
  [-53.4, -21.6],
];

const palette = useChartPalette();
const mapReady = ref(false);
const mapError = ref<string | null>(null);
const chartRef = ref<any>(null);
const chartBootstrapped = ref(false);
/** Zoom actual del geo. */
const geoZoom = ref(1);
/** Zoom de la vista inicial (boundingCoords); base para escalar radios. */
const baseGeoZoom = ref(1);
const baseZoomCaptured = ref(false);

onMounted(async () => {
  try {
    await ensureArgentinaProvinciasMap();
    mapReady.value = true;
  } catch (e: any) {
    mapError.value = e?.message || "No se pudo cargar el mapa";
  }
});

const selectedKeys = computed(
  () =>
    new Set(
      (props.selected || []).map((n) => provinciaKey(n)).filter(Boolean),
    ),
);

type ProvinciaVotes = {
  key: string;
  label: string;
  total: number;
  center: [number, number];
  counts: Record<string, number>;
};

const provinciasVotes = computed<ProvinciaVotes[]>(() => {
  // Esperar el registro del mapa: `metas` es módulo mutable (no reactivo).
  if (!mapReady.value) return [];

  const metaByKey = new Map(
    getArgentinaProvinciaMetas().map((m) => [m.key, m] as const),
  );
  if (!metaByKey.size) return [];

  const catalogByKey = new Map<string, string>();
  for (const name of props.catalog || []) {
    const key = provinciaKey(name);
    if (key && !catalogByKey.has(key)) catalogByKey.set(key, name);
  }

  const map = new Map<string, ProvinciaVotes>();

  for (const m of props.members || []) {
    const labelRaw = String(m.provincia || "").trim();
    if (!labelRaw) continue;
    const key = provinciaKey(labelRaw);
    if (!key) continue;
    const meta = metaByKey.get(key);
    if (!meta) continue;
    const tipo = normalizeVotoTipo(m.tipoVoto);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        label: catalogByKey.get(key) || labelRaw || meta.displayName,
        total: 0,
        center: meta.center,
        counts: Object.fromEntries(VOTO_TIPO_ORDER.map((t) => [t, 0])),
      };
      map.set(key, row);
    }
    row.total += 1;
    row.counts[tipo] = (row.counts[tipo] || 0) + 1;
  }

  return [...map.values()].filter((r) => r.total > 0);
});

function zoomRadiusFactor(zoom: number) {
  // Vista inicial (ratio 1) → chicas; al acercar (~2×) → tamaño cómodo.
  const base = baseGeoZoom.value || 1;
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : base;
  const ratio = z / base;
  const t = Math.min(1, Math.max(0, (ratio - 1) / 1));
  return 0.2 + 0.8 * t;
}

function pieRadius(total: number, maxTotal: number) {
  const minR = 10;
  const maxR = 30;
  const base =
    maxTotal <= 0 ? minR : minR + (maxR - minR) * Math.sqrt(total / maxTotal);
  const factor = zoomRadiusFactor(geoZoom.value);
  const ratio = geoZoom.value / (baseGeoZoom.value || 1);
  const floor = 3 + 5 * factor;
  let r = Math.max(floor, base * factor);
  // Tope duro en vista alejaba (evita el amontonamiento de senadores).
  if (ratio < 1.3) r = Math.min(r, 8);
  return r;
}

function readGeoZoom(): number | null {
  const chart = chartRef.value;
  if (!chart?.getOption) return null;
  const opt = chart.getOption();
  const geo = Array.isArray(opt?.geo) ? opt.geo[0] : opt?.geo;
  const z = geo?.zoom;
  return typeof z === "number" && z > 0 ? z : null;
}

function captureGeoZoom() {
  const z = readGeoZoom();
  if (z == null) return;
  if (!baseZoomCaptured.value) {
    baseGeoZoom.value = z;
    baseZoomCaptured.value = true;
  }
  if (Math.abs(z - geoZoom.value) < 0.02) return;
  geoZoom.value = z;
}

let roamRaf = 0;
function onGeoRoam(params?: any) {
  if (roamRaf) cancelAnimationFrame(roamRaf);
  roamRaf = requestAnimationFrame(() => {
    roamRaf = 0;
    const prev = geoZoom.value;
    const fromEvent =
      typeof params?.totalZoom === "number"
        ? params.totalZoom
        : typeof params?.zoom === "number"
          ? params.zoom
          : null;
    if (fromEvent != null && fromEvent > 0) {
      if (!baseZoomCaptured.value) {
        baseGeoZoom.value = fromEvent;
        baseZoomCaptured.value = true;
      }
      geoZoom.value = fromEvent;
    } else {
      captureGeoZoom();
    }
    if (Math.abs(geoZoom.value - prev) < 0.02) return;
    patchPieRadii();
  });
}

/** Solo actualiza radios (no replaceMerge) para no pelear con el roam. */
function patchPieRadii() {
  const chart = chartRef.value;
  if (!chart || !chartBootstrapped.value) return;
  const rows = provinciasVotes.value;
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const selected = selectedKeys.value;
  chart.setOption(
    {
      series: rows.map((row) => ({
        id: `pie-${row.key}`,
        radius: pieRadius(row.total, maxTotal) * (selected.has(row.key) ? 1.15 : 1),
      })),
    },
    { lazyUpdate: true },
  );
}

function buildOption(full: boolean) {
  const p = palette.value;
  const chrome = baseChartChrome(p);
  const baseFill = p.isDark ? "#1e293b" : "#e2e8f0";
  const selectedFill = p.isDark ? "#ffffff" : "#000000";
  const selectedBorder = p.isDark ? "#e5e7eb" : "#111827";
  const selected = selectedKeys.value;
  const rows = provinciasVotes.value;
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  const regions = getArgentinaProvinciaMetas().map((m) => {
    const isSel = selected.has(m.key);
    return {
      name: m.key,
      itemStyle: isSel
        ? {
            areaColor: selectedFill,
            borderColor: selectedBorder,
            borderWidth: 2,
          }
        : {
            areaColor: baseFill,
            borderColor: p.isDark ? "#0f172a" : "#ffffff",
            borderWidth: 1,
            opacity: selected.size ? 0.55 : 1,
          },
      label: { show: false },
      rawName: m.displayName,
    };
  });

  const pieSeries = rows.map((row) => {
    const isSel = selected.has(row.key);
    const radius = pieRadius(row.total, maxTotal) * (isSel ? 1.15 : 1);
    const [lon, lat] = row.center;
    return {
      type: "pie" as const,
      id: `pie-${row.key}`,
      name: row.label,
      coordinateSystem: "geo" as const,
      geoIndex: 0,
      // Lng/lat del centroide (más fiable que el nombre de región).
      center: [lon, lat],
      radius,
      tooltip: {
        formatter: (params: any) => {
          const pct =
            typeof params.percent === "number" ? `${params.percent}%` : "";
          return `<div class="text-xs"><div class="font-medium mb-0.5">${row.label}</div>${params.marker} ${params.name}: <b>${params.value}</b>${pct ? ` (${pct})` : ""}</div>`;
        },
      },
      label: { show: false },
      labelLine: { show: false },
      animationDuration: 0,
      silent: false,
      data: VOTO_TIPO_ORDER.map((tipo) => {
        const cfg = getVotoTipoConfig(tipo);
        return {
          name: cfg.label,
          value: row.counts[tipo] || 0,
          tipo,
          rawName: row.label,
          itemStyle: { color: cfg.color },
        };
      }).filter((d) => d.value > 0),
      itemStyle: {
        borderColor: p.isDark ? "#111827" : "#ffffff",
        borderWidth: isSel ? 2 : 1,
        shadowBlur: isSel ? 8 : 0,
        shadowColor: p.isDark
          ? "rgba(255,255,255,0.35)"
          : "rgba(0,0,0,0.25)",
      },
      emphasis: {
        scale: true,
        scaleSize: 4,
      },
    };
  });

  const option: Record<string, any> = {
    ...chrome,
    legend: {
      ...chrome.legend,
      top: 0,
      data: VOTO_TIPO_ORDER.map((k) => getVotoTipoConfig(k).label),
    },
    toolbox: { show: false },
    dataZoom: undefined,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item" as const,
    },
    geo: {
      map: ARGENTINA_PROVINCIAS_MAP,
      roam: true,
      scaleLimit: { min: 0.8, max: 8 },
      nameProperty: "name",
      ...(full ? { boundingCoords: DEFAULT_BOUNDS } : {}),
      itemStyle: {
        areaColor: baseFill,
        borderColor: p.isDark ? "#0f172a" : "#ffffff",
        borderWidth: 1,
      },
      emphasis: {
        label: { show: false },
        itemStyle: {
          areaColor: p.isDark ? "#334155" : "#cbd5e1",
        },
      },
      select: { disabled: true },
      regions,
    },
    series: pieSeries,
  };

  return option;
}

function syncChart(full: boolean) {
  const chart = chartRef.value;
  if (!chart || !mapReady.value) return;

  if (full || !chartBootstrapped.value) {
    baseZoomCaptured.value = false;
    chart.setOption(buildOption(true), { notMerge: true });
    chartBootstrapped.value = true;
    nextTick(() => {
      captureGeoZoom();
      patchPieRadii();
    });
    return;
  }

  // Parche: replaceMerge series (cantidad de pies cambia) sin tocar roam del geo.
  chart.setOption(buildOption(false), {
    notMerge: false,
    replaceMerge: ["series"],
    lazyUpdate: true,
  });
}

watch(
  [mapReady, chartRef, provinciasVotes, selectedKeys, palette],
  async () => {
    if (!mapReady.value || !chartRef.value) return;
    await nextTick();
    syncChart(!chartBootstrapped.value);
  },
  { flush: "post" },
);

function onChartFinished() {
  if (!mapReady.value || !chartRef.value) return;
  if (!chartBootstrapped.value) {
    syncChart(true);
    return;
  }
  const prev = geoZoom.value;
  captureGeoZoom();
  if (Math.abs(geoZoom.value - prev) >= 0.02) patchPieRadii();
}

function resolveRawName(params: any): string {
  if (params?.data?.rawName) return String(params.data.rawName);
  if (params?.region?.rawName) return String(params.region.rawName);

  // Click en región geo: params.name = key del mapa.
  if (params?.componentType === "geo" && params?.name) {
    const key = provinciaKey(params.name) || String(params.name);
    const fromCatalog = (props.catalog || []).find(
      (n) => provinciaKey(n) === key,
    );
    if (fromCatalog) return fromCatalog;
    return (
      getArgentinaProvinciaMetas().find((m) => m.key === key)?.displayName ||
      ""
    );
  }

  // Click en pie: series.name = label de provincia.
  if (params?.seriesType === "pie" && params?.seriesName) {
    return String(params.seriesName);
  }

  return "";
}

function onChartClick(params: any) {
  const raw = resolveRawName(params);
  if (!raw) return;
  const key = provinciaKey(raw);
  const already = (props.selected || []).some((n) => provinciaKey(n) === key);
  emit("select", already ? "" : raw);
}
</script>

<template>
  <ChartsChartCard
    title="Votos por provincia"
    description="Cada torta muestra cómo se repartieron los votos en esa provincia. Clic para filtrar."
  >
    <p v-if="mapError" class="text-sm text-error">{{ mapError }}</p>
    <div
      v-else-if="!mapReady"
      class="animate-pulse rounded-lg bg-elevated"
      :style="{ height }"
      aria-hidden="true"
    />
    <ClientOnly v-else>
      <VChart
        ref="chartRef"
        class="w-full min-h-0"
        :style="{ height }"
        manual-update
        :autoresize="{ throttle: 50 }"
        :init-options="{ renderer: 'canvas' }"
        role="img"
        aria-label="Mapa de votos por provincia"
        @click="onChartClick"
        @georoam="onGeoRoam"
        @finished="onChartFinished"
      />
      <template #fallback>
        <div
          class="animate-pulse rounded-lg bg-elevated"
          :style="{ height }"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
  </ChartsChartCard>
</template>
