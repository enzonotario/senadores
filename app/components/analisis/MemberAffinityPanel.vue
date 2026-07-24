<script setup lang="ts">
import {
  AFFINITY_FROM_DATE,
  formatAffinityPct,
  memberDissent,
  topAlliesAndOpponents,
  type AffinityMemberInput,
  type AffinityPair,
  type DissentPeriodPoint,
} from "@/utils/votingAffinity";
import type { MandatoRange } from "@/utils/memberCareer";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";

const props = withDefaults(
  defineProps<{
    memberId: string;
    memberName: string;
    /** Label de cámara: "bloque" | "partido" */
    groupLabel: string;
    groupName?: string | null;
    memberBasePath: string;
    /** Universo de comparación (típicamente activos). */
    peers: AffinityMemberInput[];
    /** Integrantes del mismo bloque/partido (para disidencia). */
    groupPeers?: AffinityMemberInput[];
    topN?: number;
    /** Ruta a la página dedicada de afinidad. */
    detailTo?: string;
    /** Metadatos de actas (título/resultado) para la tabla de disidencia. */
    actas?: Array<{
      id: string;
      titulo?: string | null;
      resultado?: string | null;
    }>;
    /** Mandatos del miembro (agrupa disidencia por cargo). */
    mandatos?: MandatoRange[];
  }>(),
  {
    groupName: null,
    groupPeers: undefined,
    topN: 8,
    detailTo: undefined,
    actas: () => [],
    mandatos: () => [],
  },
);

const palette = useChartPalette();
const periodMode = ref<"mes" | "trimestre" | "mandato">("trimestre");

const hasMandatos = computed(() => (props.mandatos?.length || 0) >= 2);

const periodModeItems = computed(() => {
  const items: Array<{ label: string; value: "mes" | "trimestre" | "mandato" }> =
    [
      { label: "Trimestre", value: "trimestre" },
      { label: "Mes", value: "mes" },
    ];
  if (hasMandatos.value) {
    items.push({ label: "Mandato", value: "mandato" });
  }
  return items;
});

const affinity = computed(() =>
  topAlliesAndOpponents(props.memberId, props.peers, {
    fromDate: AFFINITY_FROM_DATE,
    topN: props.topN,
    minCompared: 10,
  }),
);

const groupForDissent = computed(() => {
  if (props.groupPeers?.length) return props.groupPeers;
  if (!props.groupName) return [];
  return props.peers.filter((p) => p.group === props.groupName);
});

const dissent = computed(() => {
  const self = props.peers.find((p) => p.id === props.memberId);
  if (!self || groupForDissent.value.length < 2) {
    return null;
  }
  return memberDissent(self, groupForDissent.value, {
    fromDate: AFFINITY_FROM_DATE,
    minGroupVoters: 2,
    mandatos: props.mandatos,
  });
});

const periodSeries = computed<DissentPeriodPoint[]>(() => {
  if (!dissent.value) return [];
  if (periodMode.value === "mes") return dissent.value.byMonth;
  if (periodMode.value === "mandato") return dissent.value.byMandato;
  return dissent.value.byTrimestre;
});

watch(hasMandatos, (ok) => {
  if (!ok && periodMode.value === "mandato") periodMode.value = "trimestre";
});

const hasAffinity = computed(
  () =>
    affinity.value.allies.length > 0 || affinity.value.opponents.length > 0,
);

const dissentOption = computed(() => {
  const series = periodSeries.value;
  if (!series.length) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);

  return {
    ...chrome,
    legend: { show: false },
    toolbox: { show: false },
    grid: {
      left: 44,
      right: 16,
      top: 24,
      bottom: 56,
      containLabel: false,
    },
    dataZoom: [
      {
        type: "inside" as const,
        xAxisIndex: 0,
        filterMode: "none" as const,
      },
      {
        type: "slider" as const,
        xAxisIndex: 0,
        height: 18,
        bottom: 8,
        borderColor: p.border,
        backgroundColor: p.splitLine,
        fillerColor: p.isDark
          ? "rgba(239,68,68,0.2)"
          : "rgba(239,68,68,0.12)",
        handleStyle: { color: p.negativo, borderColor: p.negativo },
        textStyle: { color: p.textMuted, fontSize: 10 },
      },
    ],
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const idx = item?.dataIndex ?? 0;
        const row = series[idx];
        if (!row) return "";
        return `<div class="text-xs"><div class="font-medium mb-1">${row.label}</div>Distinto al grupo: <b>${formatAffinityPct(row.dissentRate)}</b><br/>${row.dissent} de ${row.compared} votaciones</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: series.map((s) => s.label),
      axisLabel: { color: p.textMuted, hideOverlap: true, rotate: 0 },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: {
        color: p.textMuted,
        formatter: (v: number) => `${v}%`,
      },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Distinto al grupo",
        type: "bar",
        data: series.map((s) => Math.round(s.dissentRate * 1000) / 10),
        itemStyle: {
          color: p.negativo,
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 28,
      },
    ],
  };
});

function memberTo(id: string) {
  return `${props.memberBasePath}/${id}`;
}

function pairMeta(pair: AffinityPair) {
  const pct = formatAffinityPct(pair.rate);
  const group = pair.group ? ` · ${pair.group}` : "";
  return `${pct} · ${pair.compared} votos en común${group}`;
}
</script>

<template>
  <div
    v-if="hasAffinity || dissent"
    class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2"
  >
    <ChartsChartCard
      v-if="hasAffinity"
      title="Con quién vota parecido"
      :description="`Con quién más coincide y con quién menos (votaciones desde ${AFFINITY_FROM_DATE.slice(0, 4)}). Solo cuentan cuando los dos votaron.`"
      :more-to="detailTo"
    >
      <ClientOnly>
        <div class="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
          <div class="space-y-2">
            <h4 class="text-sm font-medium text-highlighted">
              Más parecidos
            </h4>
            <ul v-if="affinity.allies.length" class="space-y-1.5">
              <li
                v-for="pair in affinity.allies"
                :key="`ally-${pair.id}`"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <NuxtLink
                  :to="memberTo(pair.id)"
                  class="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <UAvatar
                    :src="pair.foto || '/placeholder-user.jpg'"
                    :alt="pair.name"
                    size="xs"
                  />
                  <span class="line-clamp-2">{{ pair.name }}</span>
                </NuxtLink>
                <span
                  class="shrink-0 tabular-nums font-medium text-teal-700 dark:text-teal-300"
                  :title="pairMeta(pair)"
                >
                  {{ formatAffinityPct(pair.rate) }}
                </span>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Sin datos suficientes.</p>
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-medium text-highlighted">
              Más opuestos
            </h4>
            <ul v-if="affinity.opponents.length" class="space-y-1.5">
              <li
                v-for="pair in affinity.opponents"
                :key="`opp-${pair.id}`"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <NuxtLink
                  :to="memberTo(pair.id)"
                  class="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <UAvatar
                    :src="pair.foto || '/placeholder-user.jpg'"
                    :alt="pair.name"
                    size="xs"
                  />
                  <span class="line-clamp-2">{{ pair.name }}</span>
                </NuxtLink>
                <span
                  class="shrink-0 tabular-nums font-medium text-red-700 dark:text-red-300"
                  :title="pairMeta(pair)"
                >
                  {{ formatAffinityPct(pair.rate) }}
                </span>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Sin datos suficientes.</p>
          </div>
        </div>
        <template #fallback>
          <div class="h-48 animate-pulse rounded-lg bg-elevated" />
        </template>
      </ClientOnly>
    </ChartsChartCard>

    <ChartsChartCard
      v-if="dissent"
      :title="`Veces que votó distinto a su ${groupLabel}`"
      :description="
        groupName
          ? `Porcentaje de veces que no votó como la mayoría de ${groupName} (solo votaciones donde al menos 2 del ${groupLabel} votaron).`
          : `Porcentaje de veces que no votó como la mayoría de su ${groupLabel}.`
      "
    >
      <template #actions>
        <AnalisisDissentActasButton
          :actas="dissent.actas"
          :group-label="groupLabel"
          :actas-meta="actas"
        />
        <UButton
          v-if="!hasAffinity && detailTo"
          :to="detailTo"
          size="sm"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
        >
          Ver más
        </UButton>
      </template>
      <ClientOnly>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div
                class="text-3xl font-bold tabular-nums"
                :class="
                  (dissent.dissentRate ?? 0) > 0.2
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-highlighted'
                "
              >
                {{ formatAffinityPct(dissent.dissentRate) }}
              </div>
              <p class="text-sm text-muted">
                {{ dissent.dissent }} disidencias en
                {{ dissent.compared }} votaciones
              </p>
            </div>
            <SegmentedTabs
              v-if="dissentOption"
              v-model="periodMode"
              :items="periodModeItems"
              :center="false"
              variant="link"
            />
          </div>

          <ChartsAppChart
            v-if="dissentOption"
            :option="dissentOption"
            height="16rem"
            :aria-label="`Veces que ${memberName} votó distinto a su ${groupLabel}`"
          />
          <p v-else class="text-sm text-muted">
            Todavía no hay suficientes datos para el gráfico.
          </p>
        </div>
        <template #fallback>
          <div class="h-48 animate-pulse rounded-lg bg-elevated" />
        </template>
      </ClientOnly>
    </ChartsChartCard>
  </div>
</template>
