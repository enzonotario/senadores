<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Acta, FilterConfig } from "@/lib/types-diputados";
import {
  filterActas,
  formatDate,
  getUniqueValues,
  getYearsFromActas,
} from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupActasBy } from "@/utils/groupActasBy";
import { voteMarginSortValue } from "@/utils/voteMargin";

useChamberSeo({
  title: "Votaciones",
  description:
    "Mirá las votaciones de la Cámara de Diputados de la Nación Argentina y cómo votó cada uno.",
  og: { kind: "list", eyebrow: "actas", badge: "Votaciones" },
});

const { sorting } = useTableSorting("fecha", true);
const vista = useRouteQuery("vista", "lista");
const resultado = useMultiQuery("resultado");
const searchQuery = useRouteQuery("q", "");

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por año", value: "anios" },
  { label: "Por período", value: "periodos" },
];

const { localFetch } = useLocalApi();

const { data } = await useAsyncData("actas", async () => {
  const res = await localFetch<{ actas: Acta[] }>("/api/actas");
  return res.actas || [];
});
const actas = computed(() => (data.value as any as Acta[]) || []);

const years = computed(() => getYearsFromActas(actas.value));
const year = useRouteQuery("year", years.value[0] || "todos");

const filters = computed<FilterConfig>(() => ({
  // En vistas agrupadas no filtramos por año para poder ver todos los grupos
  ...(vista.value === "lista" && year.value && year.value !== "todos"
    ? {
        fechaStart: `${year.value}-01-01`,
        fechaEnd: `${year.value}-12-31`,
      }
    : {}),
  ...(resultado.value.length ? { resultado: resultado.value } : {}),
  ...(searchQuery.value ? { titulo: searchQuery.value } : {}),
}));

const displayed = computed(() => filterActas(actas.value, filters.value));
const groupsByAño = computed(() => groupActasBy(displayed.value, "año"));
const groupsByPeriodo = computed(() =>
  groupActasBy(displayed.value, "periodo"),
);

const resultados = computed(() => getUniqueValues(actas.value, "resultado"));
const resultadoItems = computed(() =>
  resultados.value.map((r) => ({ label: r, value: r })),
);

const emptyMessage = "No se encontraron actas con los filtros aplicados.";

const tableColumns = [
  { accessorKey: "fecha", header: sortableHeader("Fecha") },
  { accessorKey: "periodo", header: sortableHeader("Período") },
  {
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: {
      class: {
        td: "whitespace-normal",
      },
    },
  },
  { accessorKey: "resultado", header: sortableHeader("Resultado") },
  {
    id: "margen",
    accessorFn: (row: Acta) =>
      voteMarginSortValue(row.votosAfirmativos, row.votosNegativos),
    header: sortableHeader("Margen"),
  },
  {
    accessorKey: "votosAfirmativos",
    header: sortableHeader("A favor"),
  },
  { accessorKey: "votosNegativos", header: sortableHeader("En contra") },
  { accessorKey: "abstenciones", header: sortableHeader("Abstenciones") },
  { accessorKey: "ausentes", header: sortableHeader("Ausentes") },
];

function onRowSelect(_e: Event, row: { original: Acta }) {
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <div class="page-container space-y-6">
    <h1 class="text-3xl font-bold">Todas las votaciones</h1>

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <SegmentedTabs
      v-if="vista === 'lista'"
      v-model="year"
      :items="[
        { label: 'Todos los años', value: 'todos' },
        ...years.slice(0, 8).map((y) => ({ label: y, value: y })),
      ]"
      variant="link"
    />

    <div
      class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
    >
      <div class="w-full sm:max-w-sm">
        <FilterSearch
          v-model="searchQuery"
          placeholder="Buscar por título..."
        />
      </div>
      <FilterSelect
        v-model="resultado"
        label="Resultado"
        placeholder="Todos los resultados"
        :items="resultadoItems"
        class="w-full sm:w-56"
      />
    </div>

    <ChartsActasOverviewCharts :actas="displayed" />

    <DataTableCard v-if="vista === 'lista'">
      <UTable
        v-model:sorting="sorting"
        :data="displayed"
        :columns="tableColumns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        :empty="emptyMessage"
        :on-select="onRowSelect"
      >
        <template #titulo-cell="{ row }">
          <NuxtLink
            :to="`/actas/${(row.original as Acta).id}`"
            class="hover:underline line-clamp-5"
            @click.stop
          >
            {{ (row.original as Acta).titulo }}
          </NuxtLink>
        </template>
        <template #fecha-cell="{ row }">
          <span>{{ formatDate((row.original as Acta).fecha) }}</span>
        </template>
        <template #resultado-cell="{ row }">
          <ResultadoBadge :resultado="(row.original as Acta).resultado" />
        </template>
        <template #margen-cell="{ row }">
          <MargenBadge
            :afirmativos="(row.original as Acta).votosAfirmativos"
            :negativos="(row.original as Acta).votosNegativos"
          />
        </template>
      </UTable>
    </DataTableCard>

    <ActasGroupedBoard
      v-else-if="vista === 'anios'"
      :groups="groupsByAño"
      :empty-message="emptyMessage"
    />

    <ActasGroupedBoard
      v-else-if="vista === 'periodos'"
      :groups="groupsByPeriodo"
      :empty-message="emptyMessage"
    />
  </div>
</template>
