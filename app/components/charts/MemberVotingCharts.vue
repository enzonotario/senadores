<script setup lang="ts">
import type { ActaChartRow, VotosTimeGroupBy } from "@/utils/chartSeries";
import {
  miembroPresentismoSeries,
  miembroVotosOverTime,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore,
} from "@/utils/chartSeries";
import {
  mandatoRangesForChamber,
  type CareerCargo,
  type CareerChamber,
} from "@/utils/memberCareer";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";
import { getVotoTipoConfig, VOTO_TIPO_ORDER } from "@/utils/votoTipo";

const props = defineProps<{
  actas: ActaChartRow[];
  memberLabel?: string;
  /** Historial de cargos (para agrupar / marcar mandatos). */
  career?: CareerCargo[];
  chamber?: CareerChamber;
}>();

const palette = useChartPalette();

const mandatos = computed(() =>
  props.chamber
    ? mandatoRangesForChamber(props.career, props.chamber)
    : [],
);

const hasMandatos = computed(() => mandatos.value.length >= 2);

const groupBy = ref<VotosTimeGroupBy>("mes");
const groupByItems = computed(() => {
  const items: Array<{ label: string; value: VotosTimeGroupBy }> = [
    { label: "Mes", value: "mes" },
    { label: "Trimestre", value: "trimestre" },
    { label: "Cuatrimestre", value: "cuatrimestre" },
  ];
  if (hasMandatos.value) {
    items.push({ label: "Mandato", value: "mandato" });
  }
  if (hasPeriodoData.value) {
    items.push({ label: "Período legislativo", value: "periodo" });
  }
  return items;
});

const series = computed(() => miembroPresentismoSeries(props.actas || []));
const votosOverTime = computed(() =>
  miembroVotosOverTime(props.actas || [], groupBy.value, mandatos.value),
);

const hasSeries = computed(() => series.value.dates.length > 1);
const hasVotosOverTime = computed(() => votosOverTime.value.keys.length > 0);

const hasPeriodoData = computed(() =>
  (props.actas || []).some((a) => String(a.periodo || "").trim()),
);

/** Preferir Mandato cuando hay ≥2 periodos de cargo. */
watch(
  hasMandatos,
  (ok) => {
    if (ok && groupBy.value === "mes") groupBy.value = "mandato";
  },
  { immediate: true },
);

watch([hasPeriodoData, hasMandatos], () => {
  const allowed = new Set(groupByItems.value.map((i) => i.value));
  if (!allowed.has(groupBy.value)) {
    groupBy.value = hasMandatos.value ? "mandato" : "mes";
  }
});

const MANDATO_BAND_A_LIGHT = "rgba(13,148,136,0.22)";
const MANDATO_BAND_B_LIGHT = "rgba(100,116,139,0.18)";
const MANDATO_BAND_A_DARK = "rgba(45,212,191,0.18)";
const MANDATO_BAND_B_DARK = "rgba(148,163,184,0.16)";
const MANDATO_LINE_LIGHT = "#0f766e";
const MANDATO_LINE_DARK = "#5eead4";

function visibleMandatoSpans(dates: string[]) {
  if (!dates.length || !hasMandatos.value) return [];
  const seriesStart = new Date(dates[0]!).getTime();
  const seriesEnd = new Date(dates[dates.length - 1]!).getTime();
  if (Number.isNaN(seriesStart) || Number.isNaN(seriesEnd)) return [];
  const dark = palette.value.isDark;
  const tintA = dark ? MANDATO_BAND_A_DARK : MANDATO_BAND_A_LIGHT;
  const tintB = dark ? MANDATO_BAND_B_DARK : MANDATO_BAND_B_LIGHT;

  const spans: Array<{
    label: string;
    from: number;
    to: number;
    tint: string;
  }> = [];

  for (let i = 0; i < mandatos.value.length; i++) {
    const m = mandatos.value[i]!;
    if (m.finMs < seriesStart || m.inicioMs > seriesEnd) continue;
    const startIdx = firstIndexOnOrAfter(
      dates,
      Math.max(m.inicioMs, seriesStart),
    );
    const endIdx = lastIndexOnOrBefore(
      dates,
      Math.min(Number.isFinite(m.finMs) ? m.finMs : seriesEnd, seriesEnd),
    );
    if (startIdx == null || endIdx == null) continue;
    // Sin votos dentro del mandato → no pintar banda inventada.
    if (startIdx > endIdx) continue;
    spans.push({
      label: m.label,
      from: startIdx,
      to: endIdx,
      tint: i % 2 === 0 ? tintA : tintB,
    });
  }
  return spans;
}

const mandatoMarkLine = computed(() => {
  const s = series.value;
  const spans = visibleMandatoSpans(s.dates);
  if (spans.length < 2) return undefined;
  const dark = palette.value.isDark;
  const line = dark ? MANDATO_LINE_DARK : MANDATO_LINE_LIGHT;

  // Solo divisores verticales; el nombre del mandato va en markArea.
  const data = spans.slice(1).map((span) => ({
    xAxis: span.from,
    label: { show: false },
  }));
  if (!data.length) return undefined;

  return {
    symbol: ["none", "none"],
    animation: false,
    label: { show: false },
    lineStyle: {
      color: line,
      type: "solid" as const,
      width: 2.5,
      opacity: 1,
    },
    data,
  };
});

const mandatoMarkArea = computed(() => {
  const s = series.value;
  const spans = visibleMandatoSpans(s.dates);
  if (!spans.length) return undefined;
  const dark = palette.value.isDark;
  const labelBg = dark ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.9)";

  return {
    silent: true,
    animation: false,
    label: {
      show: true,
      position: "insideTop",
      color: dark ? "#e2e8f0" : "#0f766e",
      fontSize: 11,
      fontWeight: 600,
      distance: 4,
      backgroundColor: labelBg,
      padding: [2, 5],
      borderRadius: 3,
    },
    data: spans.map((span) => [
      {
        name: span.label,
        itemStyle: { color: span.tint },
        xAxis: span.from,
      },
      { xAxis: span.to },
    ]),
  };
});

const presentismoOption = computed(() => {
  if (!hasSeries.value) return null;
  const p = palette.value;
  const s = series.value;
  const chrome = baseChartChrome(p);
  const markLine = mandatoMarkLine.value;
  const markArea = mandatoMarkArea.value;

  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: ["Hasta ahora", "Últimas 20"],
    },
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const idx = list[0]?.dataIndex ?? 0;
        const titulo = s.titulos[idx] || "";
        const fecha = s.labels[idx] || "";
        const lines = list
          .filter((item: any) => item.seriesType !== "line" || item.value != null)
          .filter((item: any) => item.componentType !== "markLine")
          .map(
            (item: any) =>
              `${item.marker} ${item.seriesName}: <b>${item.value}%</b>`,
          );
        return `<div class="text-xs max-w-xs"><div class="font-medium mb-0.5">${fecha}</div>${
          titulo
            ? `<div class="text-[11px] opacity-80 mb-1 line-clamp-2">${titulo}</div>`
            : ""
        }${lines.join("<br/>")}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: s.labels,
      axisLabel: { color: p.textMuted, hideOverlap: true, rotate: 0 },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: p.textMuted, formatter: "{value}%" },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Hasta ahora",
        type: "line",
        smooth: 0.3,
        showSymbol: false,
        data: s.cumulative,
        itemStyle: { color: p.presentismo },
        lineStyle: { width: 2.5, color: p.presentismo },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: p.isDark
                  ? "rgba(45,212,191,0.3)"
                  : "rgba(13,148,136,0.22)",
              },
              { offset: 1, color: "rgba(13,148,136,0)" },
            ],
          },
        },
        markLine,
        markArea,
      },
      {
        name: "Últimas 20",
        type: "line",
        smooth: 0.3,
        showSymbol: false,
        data: s.rolling,
        itemStyle: { color: p.isDark ? "#fbbf24" : "#d97706" },
        lineStyle: {
          width: 2,
          type: "dashed",
          color: p.isDark ? "#fbbf24" : "#d97706",
        },
      },
    ],
  };
});

const votosOption = computed(() => {
  if (!hasVotosOverTime.value) return null;
  const p = palette.value;
  const data = votosOverTime.value;
  const chrome = baseChartChrome(p);
  const legend = VOTO_TIPO_ORDER.map((k) => getVotoTipoConfig(k).label);

  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: legend,
    },
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const title = list[0]?.axisValueLabel || "";
        const total = list.reduce(
          (s: number, item: any) => s + (Number(item.value) || 0),
          0,
        );
        const lines = list
          .filter((item: any) => Number(item.value) > 0)
          .map((item: any) => {
            const pct =
              total > 0
                ? Math.round((Number(item.value) / total) * 1000) / 10
                : 0;
            return `${item.marker} ${item.seriesName}: <b>${item.value}</b> (${pct}%)`;
          });
        return `<div class="text-xs"><div class="mb-1 font-medium">${title}</div><div class="opacity-70 mb-1">Total: ${total}</div>${lines.join("<br/>")}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: { color: p.textMuted, hideOverlap: true },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "Votos",
      nameTextStyle: { color: p.textMuted, fontSize: 11 },
      minInterval: 1,
      axisLabel: { color: p.textMuted },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: getVotoTipoConfig("afirmativo").label,
        type: "bar",
        stack: "votos",
        data: data.afirmativo,
        itemStyle: { color: p.afirmativo },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("negativo").label,
        type: "bar",
        stack: "votos",
        data: data.negativo,
        itemStyle: { color: p.negativo },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("abstencion").label,
        type: "bar",
        stack: "votos",
        data: data.abstencion,
        itemStyle: { color: p.abstencion },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("ausente").label,
        type: "bar",
        stack: "votos",
        data: data.ausente,
        itemStyle: {
          color: p.ausente,
          borderRadius: [3, 3, 0, 0],
        },
        emphasis: { focus: "series" },
      },
    ],
  };
});
</script>

<template>
  <div
    v-if="hasSeries || hasVotosOverTime"
    class="grid grid-cols-1 gap-4"
  >
    <ChartsChartCard
      v-if="presentismoOption"
      title="Asistencia a lo largo del tiempo"
      :description="
        memberLabel
          ? `Cómo fue cambiando la asistencia de ${memberLabel}.${hasMandatos ? ' Las bandas marcan cada mandato.' : ''}`
          : `Cómo fue cambiando la asistencia.${hasMandatos ? ' Las bandas marcan cada mandato.' : ''}`
      "
    >
      <ChartsAppChart
        :option="presentismoOption"
        height="22rem"
        aria-label="Asistencia del miembro a lo largo del tiempo"
      />
    </ChartsChartCard>

    <ChartsChartCard
      v-if="votosOption"
      title="Sus votos en el tiempo"
      description="Cuántos votos a favor, en contra, abstenciones o ausencias hubo en cada período."
    >
      <div class="space-y-3">
        <SegmentedTabs
          v-model="groupBy"
          :items="groupByItems"
          :center="false"
          variant="link"
        />
        <ChartsAppChart
          :option="votosOption"
          height="22rem"
          aria-label="Votos del miembro a lo largo del tiempo"
        />
      </div>
    </ChartsChartCard>
  </div>
</template>
