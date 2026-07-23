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

export type ProvinciaMapDatum = {
  /** Nombre crudo (API / grupo). */
  name: string;
  value: number;
  /** Etiqueta para tooltip (opcional). */
  label?: string;
};

const props = withDefaults(
  defineProps<{
    data: ProvinciaMapDatum[];
    /**
     * Nombres de provincia conocidos (API), aunque el filtro actual deje value=0.
     * Permite clickear y cambiar el filtro a otra provincia.
     */
    catalog?: string[];
    /** Provincias activas en el filtro (resaltado). */
    selected?: string[];
    /** Sustantivo en tooltip: "diputados" | "senadores" | "integrantes". */
    membersLabel?: string;
    height?: string;
    title?: string;
    description?: string;
  }>(),
  {
    catalog: () => [],
    selected: () => [],
    membersLabel: "integrantes",
    height: "28rem",
    title: "Por provincia",
    description: "Cantidad sin filtro de provincia. Clic para filtrar.",
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
/** Tras el primer setOption completo; los siguientes solo parchean data. */
const chartBootstrapped = ref(false);

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

const seriesData = computed(() => {
  const byKey = new Map<
    string,
    { value: number; label: string; rawName: string }
  >();

  for (const row of props.data) {
    const key = provinciaKey(row.name);
    if (!key) continue;
    const prev = byKey.get(key);
    const label = row.label || row.name;
    if (prev) {
      prev.value += row.value;
    } else {
      byKey.set(key, { value: row.value, label, rawName: row.name });
    }
  }

  const catalogByKey = new Map<string, string>();
  for (const name of props.catalog || []) {
    const key = provinciaKey(name);
    if (!key || catalogByKey.has(key)) continue;
    catalogByKey.set(key, name);
  }

  const metaByKey = new Map(
    getArgentinaProvinciaMetas().map((m) => [m.key, m] as const),
  );

  const keys = new Set<string>([
    ...metaByKey.keys(),
    ...catalogByKey.keys(),
    ...byKey.keys(),
  ]);

  return [...keys].map((name) => {
    const hit = byKey.get(name);
    const catalogName = catalogByKey.get(name);
    const meta = metaByKey.get(name);
    const rawName = hit?.rawName || catalogName || meta?.displayName || name;
    const label = hit?.label || catalogName || meta?.displayName || name;
    return {
      name,
      value: hit?.value ?? 0,
      label,
      rawName,
      isSelected: selectedKeys.value.has(name),
    };
  });
});

const maxValue = computed(() =>
  Math.max(1, ...seriesData.value.map((d) => d.value), 1),
);

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function mixHex(low: string, high: string, t: number) {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [lr, lg, lb] = parse(low);
  const [hr, hg, hb] = parse(high);
  const clampT = Math.min(1, Math.max(0, t));
  const r = lerpChannel(lr, hr, clampT);
  const g = lerpChannel(lg, hg, clampT);
  const b = lerpChannel(lb, hb, clampT);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function buildSeriesData() {
  const p = palette.value;
  const low = p.isDark ? "#1e293b" : "#e2e8f0";
  const high = p.presentismo;
  const selectedFill = p.isDark ? "#ffffff" : "#000000";
  const selectedBorder = p.isDark ? "#e5e7eb" : "#111827";
  const max = maxValue.value;
  const hasSelection = selectedKeys.value.size > 0;

  return seriesData.value.map((d) => {
    if (d.isSelected) {
      return {
        name: d.name,
        value: d.value,
        label: d.label,
        rawName: d.rawName,
        itemStyle: {
          areaColor: selectedFill,
          borderColor: selectedBorder,
          borderWidth: 2.5,
          shadowBlur: 12,
          shadowColor: p.isDark
            ? "rgba(255,255,255,0.4)"
            : "rgba(0,0,0,0.4)",
        },
        emphasis: {
          itemStyle: {
            areaColor: selectedFill,
            borderColor: selectedBorder,
            borderWidth: 3,
          },
        },
      };
    }
    const t = max > 0 ? d.value / max : 0;
    return {
      name: d.name,
      value: d.value,
      label: d.label,
      rawName: d.rawName,
      itemStyle: {
        areaColor: mixHex(low, high, t),
        borderColor: p.isDark ? "#0f172a" : "#ffffff",
        borderWidth: 1,
        opacity: hasSelection ? 0.72 : 1,
      },
    };
  });
}

function buildChrome() {
  const p = palette.value;
  const chrome = baseChartChrome(p);
  const low = p.isDark ? "#1e293b" : "#e2e8f0";
  const high = p.presentismo;
  const max = maxValue.value;

  return {
    ...chrome,
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item" as const,
      formatter: (params: any) => {
        const d = params?.data;
        const label = d?.label || params?.name || "";
        const n = typeof d?.value === "number" ? d.value : 0;
        return `<div class="text-xs"><b>${label}</b><br/>${n} ${props.membersLabel}</div>`;
      },
    },
    visualMap: {
      type: "continuous" as const,
      min: 0,
      max,
      left: 8,
      bottom: 8,
      text: [String(max), "0"],
      textStyle: { color: p.textMuted, fontSize: 11 },
      inRange: { color: [low, high] },
      calculable: false,
      itemWidth: 12,
      itemHeight: 100,
      seriesIndex: 99,
    },
  };
}

/** Primera pintura: incluye boundingCoords. Parches posteriores: solo data/estilo. */
function syncChart(full: boolean) {
  const chart = chartRef.value;
  if (!chart || !mapReady.value) return;

  const p = palette.value;
  const low = p.isDark ? "#1e293b" : "#e2e8f0";
  const data = buildSeriesData();

  if (full || !chartBootstrapped.value) {
    chart.setOption(
      {
        ...buildChrome(),
        series: [
          {
            type: "map",
            map: ARGENTINA_PROVINCIAS_MAP,
            roam: true,
            scaleLimit: { min: 0.8, max: 8 },
            boundingCoords: DEFAULT_BOUNDS,
            nameProperty: "name",
            selectedMode: false,
            data,
            itemStyle: {
              areaColor: low,
              borderColor: p.isDark ? "#0f172a" : "#ffffff",
              borderWidth: 1,
            },
            emphasis: {
              label: { show: false },
              itemStyle: {
                areaColor: p.isDark ? "#5eead4" : "#14b8a6",
                borderWidth: 1.5,
              },
            },
          },
        ],
      },
      { notMerge: true },
    );
    chartBootstrapped.value = true;
    return;
  }

  // No tocar zoom/center/boundingCoords → se conserva el roam del usuario.
  chart.setOption(
    {
      ...buildChrome(),
      series: [
        {
          data,
          itemStyle: {
            areaColor: low,
            borderColor: p.isDark ? "#0f172a" : "#ffffff",
            borderWidth: 1,
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: p.isDark ? "#5eead4" : "#14b8a6",
              borderWidth: 1.5,
            },
          },
        },
      ],
    },
    { notMerge: false, lazyUpdate: true },
  );
}

watch(
  [mapReady, chartRef, seriesData, selectedKeys, palette],
  async () => {
    if (!mapReady.value || !chartRef.value) return;
    await nextTick();
    syncChart(!chartBootstrapped.value);
  },
  { flush: "post" },
);

function onChartFinished() {
  if (!mapReady.value || !chartRef.value) return;
  if (!chartBootstrapped.value) syncChart(true);
}

function onChartClick(params: any) {
  if (params?.componentType !== "series") return;
  const raw =
    params?.data?.rawName ||
    params?.data?.label ||
    (() => {
      const key = provinciaKey(params?.name) || String(params?.name || "");
      if (!key) return "";
      const fromCatalog = (props.catalog || []).find(
        (n) => provinciaKey(n) === key,
      );
      if (fromCatalog) return fromCatalog;
      return (
        getArgentinaProvinciaMetas().find((m) => m.key === key)?.displayName ||
        ""
      );
    })();
  if (!raw) return;
  const key = provinciaKey(raw);
  const alreadySelected = (props.selected || []).some(
    (n) => provinciaKey(n) === key,
  );
  emit("select", alreadySelected ? "" : String(raw));
}
</script>

<template>
  <ChartsChartCard :title="title" :description="description">
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
        aria-label="Mapa de provincias"
        @click="onChartClick"
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
