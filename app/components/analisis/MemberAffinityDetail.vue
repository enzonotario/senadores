<script setup lang="ts">
import { sortableHeader } from "@/utils/sortableHeader";
import {
  AFFINITY_FROM_DATE,
  allPairAffinities,
  formatAffinityPct,
  memberActasInWindow,
  memberDissent,
  type AffinityMemberInput,
  type AffinityPair,
  type DissentPeriodPoint,
  type MemberActaInWindow,
} from "@/utils/votingAffinity";
import type { MandatoRange } from "@/utils/memberCareer";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";

export type AffinityActaMeta = {
  id: string;
  titulo?: string | null;
  resultado?: string | null;
  fecha?: string | null;
  voto?: string | null;
};

const props = withDefaults(
  defineProps<{
    memberId: string;
    memberName: string;
    memberFoto?: string | null;
    memberTo: string;
    groupLabel: string;
    groupName?: string | null;
    groupTo?: string | null;
    memberBasePath: string;
    peers: AffinityMemberInput[];
    groupPeers?: AffinityMemberInput[];
    /** Listado de actas del miembro (título/resultado/voto). */
    actas: AffinityActaMeta[];
    groupColors?: Record<string, string>;
    mandatos?: MandatoRange[];
  }>(),
  {
    memberFoto: null,
    groupName: null,
    groupTo: null,
    groupPeers: undefined,
    groupColors: () => ({}),
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

const allPairs = computed(() =>
  allPairAffinities(props.memberId, props.peers, {
    fromDate: AFFINITY_FROM_DATE,
    minCompared: 10,
  }),
);

const allies = computed(() => allPairs.value);
const opponents = computed(() =>
  [...allPairs.value].sort(
    (a, b) => a.rate - b.rate || b.compared - a.compared,
  ),
);

const groupForDissent = computed(() => {
  if (props.groupPeers?.length) return props.groupPeers;
  if (!props.groupName) return [];
  return props.peers.filter((p) => p.group === props.groupName);
});

const dissent = computed(() => {
  const self = props.peers.find((p) => p.id === props.memberId);
  if (!self || groupForDissent.value.length < 2) return null;
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

const selfVotes = computed(() => {
  const self = props.peers.find((p) => p.id === props.memberId);
  return self?.votes || [];
});

const actasInWindow = computed(() =>
  memberActasInWindow(selfVotes.value, AFFINITY_FROM_DATE),
);

const actasMetaById = computed(() => {
  const map = new Map<string, AffinityActaMeta>();
  for (const a of props.actas) {
    if (a?.id) map.set(String(a.id), a);
  }
  return map;
});

type ActaRow = MemberActaInWindow & {
  titulo: string;
  resultado: string | null;
};

const actasRows = computed<ActaRow[]>(() =>
  actasInWindow.value.map((row) => {
    const meta = actasMetaById.value.get(row.id);
    return {
      ...row,
      titulo: meta?.titulo || row.id,
      resultado: meta?.resultado || null,
    };
  }),
);

const { sorting: alliesSorting } = useTableSorting("rate", true, {
  syncQuery: false,
});
const { sorting: opponentsSorting } = useTableSorting("rate", false, {
  syncQuery: false,
});

const pairColumns = computed(() => [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: { class: { th: "w-12 px-2", td: "w-12 px-2" } },
  },
  { id: "name", accessorKey: "name", header: sortableHeader("Nombre") },
  {
    id: "group",
    accessorKey: "group",
    header: sortableHeader(
      props.groupLabel === "partido" ? "Partido" : "Bloque",
    ),
    meta: {
      class: {
        td: 'max-w-xs whitespace-normal',
      },
    }
  },
  { id: "rate", accessorKey: "rate", header: sortableHeader("Coincidencia") },
  {
    id: "compared",
    accessorKey: "compared",
    header: sortableHeader("Votaciones juntas"),
  },
]);

function toMember(id: string) {
  return `${props.memberBasePath}/${id}`;
}

function pairMeta(pair: AffinityPair) {
  return `${formatAffinityPct(pair.rate)} · ${pair.agree}/${pair.compared} coincidencias`;
}

function onPairSelect(_e: Event, row: { original: AffinityPair }) {
  navigateTo(toMember(row.original.id));
}
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        :to="memberTo"
        variant="ghost"
        color="neutral"
        size="sm"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Volver a la ficha
      </UButton>
    </div>

    <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
      <div class="flex flex-col sm:flex-row gap-4 p-6 items-start">
        <UAvatar
          :src="memberFoto || '/placeholder-user.jpg'"
          :alt="memberName"
          size="3xl"
        />
        <div class="min-w-0 space-y-2">
          <p class="text-sm text-toned">Con quién vota parecido</p>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            {{ memberName }}
          </h1>
          <p class="text-sm text-muted">
            <template v-if="groupName">
              {{ groupLabel }}:
              <NuxtLink
                v-if="groupTo"
                :to="groupTo"
                class="hover:underline font-medium text-highlighted"
              >
                {{ groupName }}
              </NuxtLink>
              <span v-else class="font-medium text-highlighted">{{
                groupName
              }}</span>
            </template>
            <template v-else>Sin {{ groupLabel }}</template>
            · votaciones desde {{ AFFINITY_FROM_DATE.slice(0, 4) }}
          </p>
          <UButton
            :to="memberTo"
            size="sm"
            color="neutral"
            variant="soft"
          >
            Ver ficha completa
          </UButton>
        </div>
      </div>
    </UCard>

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
                {{ dissent.dissent }} veces distinto en
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
        </div>
        <template #fallback>
          <div class="h-48 animate-pulse rounded-lg bg-elevated" />
        </template>
      </ClientOnly>
    </ChartsChartCard>

    <ChartsChartCard
      title="Mapa de coincidencias"
      :description="`Más cerca = más coinciden. Verde: mucho (≥70%), amarillo: a veces (40–70%), rojo: poco (<40%).`"
    >
      <AnalisisAffinityForceGraph
        :members="peers"
        :center-id="memberId"
        :member-base-path="memberBasePath"
        :group-colors="groupColors"
        :group-label="groupLabel"
        :min-compared="10"
      />
    </ChartsChartCard>

    <ChartsChartCard
      title="Con quién coincide"
      :description="`Solo personas con al menos 10 votaciones en común desde ${AFFINITY_FROM_DATE.slice(0, 4)}.`"
    >
      <template #actions>
        <AnalisisWindowActasButton
          :actas="actasRows"
          :from-year="AFFINITY_FROM_DATE.slice(0, 4)"
        />
      </template>
      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <DataTableCard title="Más parecidos">
          <UTable
            v-model:sorting="alliesSorting"
            :data="allies"
            :columns="pairColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No hay suficientes votaciones en común."
            :on-select="onPairSelect"
          >
            <template #foto-cell="{ row }">
              <UAvatar
                :src="(row.original as AffinityPair).foto || '/placeholder-user.jpg'"
                :alt="(row.original as AffinityPair).name"
                size="xs"
              />
            </template>
            <template #name-cell="{ row }">
              <NuxtLink
                :to="toMember((row.original as AffinityPair).id)"
                class="hover:underline"
                @click.stop
              >
                {{ (row.original as AffinityPair).name }}
              </NuxtLink>
            </template>
            <template #group-cell="{ row }">
              <span class="text-sm text-muted">{{
                (row.original as AffinityPair).group || "—"
              }}</span>
            </template>
            <template #rate-cell="{ row }">
              <span
                class="tabular-nums font-medium text-teal-700 dark:text-teal-300"
                :title="pairMeta(row.original as AffinityPair)"
              >
                {{ formatAffinityPct((row.original as AffinityPair).rate) }}
              </span>
            </template>
            <template #compared-cell="{ row }">
              <span class="tabular-nums">{{
                (row.original as AffinityPair).compared
              }}</span>
            </template>
          </UTable>
        </DataTableCard>

        <DataTableCard title="Más opuestos">
          <UTable
            v-model:sorting="opponentsSorting"
            :data="opponents"
            :columns="pairColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No hay suficientes votaciones en común."
            :on-select="onPairSelect"
          >
            <template #foto-cell="{ row }">
              <UAvatar
                :src="(row.original as AffinityPair).foto || '/placeholder-user.jpg'"
                :alt="(row.original as AffinityPair).name"
                size="xs"
              />
            </template>
            <template #name-cell="{ row }">
              <NuxtLink
                :to="toMember((row.original as AffinityPair).id)"
                class="hover:underline"
                @click.stop
              >
                {{ (row.original as AffinityPair).name }}
              </NuxtLink>
            </template>
            <template #group-cell="{ row }">
              <span class="text-sm text-muted">{{
                (row.original as AffinityPair).group || "—"
              }}</span>
            </template>
            <template #rate-cell="{ row }">
              <span
                class="tabular-nums font-medium text-red-700 dark:text-red-300"
                :title="pairMeta(row.original as AffinityPair)"
              >
                {{ formatAffinityPct((row.original as AffinityPair).rate) }}
              </span>
            </template>
            <template #compared-cell="{ row }">
              <span class="tabular-nums">{{
                (row.original as AffinityPair).compared
              }}</span>
            </template>
          </UTable>
        </DataTableCard>
      </div>
    </ChartsChartCard>
  </div>
</template>
