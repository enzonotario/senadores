<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { sortableHeader } from "@/utils/sortableHeader";
import type { AffinityGroupInput } from "@/utils/votingAffinity";
import type { Diputado } from "@/lib/types-diputados";
import {
  getUniqueValues,
  isDiputadoActivo,
} from "@/lib/utils";
import { groupDiputadosBy } from "@/utils/groupDiputadosBy";
import { useMultiQuery } from "@/composables/useMultiQuery";

type BloqueRow = {
  nombre: string;
  slug: string;
  color: string;
  activos: number;
  presentismo: number;
};

type AffinityIndexResponse = {
  rows: BloqueRow[];
  groups: AffinityGroupInput[];
};

const { localFetch } = useLocalApi();
const vista = useRouteQuery("vista", "lista");
const provinciaFilter = useMultiQuery("provincia");

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por provincias", value: "provincias" },
];

const { data: bloques, pending: pendingBloques } = useAsyncData(
  "bloques-index",
  async () => {
    const res = await localFetch<AffinityIndexResponse>(
      "/api/groups/affinity-index",
      { query: { rowsOnly: "1" } },
    );
    return res.rows || [];
  },
  { lazy: true },
);

const { data: affinityGroups, pending: pendingAffinity } = useAsyncData(
  "bloques-affinity-groups",
  async () => {
    const res = await localFetch<AffinityIndexResponse>(
      "/api/groups/affinity-index",
    );
    return res.groups || [];
  },
  { server: false, lazy: true },
);

const { data: members, pending: pendingMembers } = useAsyncData(
  "bloques-index-members",
  async () => {
    const res = await localFetch<{ members: Diputado[] }>("/api/members");
    return (res.members || []).filter(isDiputadoActivo);
  },
  { lazy: true },
);

const { sorting } = useTableSorting("activos", true);

const tableColumns = [
  {
    id: "color",
    accessorKey: "color",
    header: "",
    enableSorting: false,
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: sortableHeader("Bloque"),
  },
  {
    id: "activos",
    accessorKey: "activos",
    header: sortableHeader("Diputados"),
  },
  {
    id: "presentismo",
    accessorKey: "presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: BloqueRow }) {
  navigateTo(`/diputados/bloques/${row.original.slug}`);
}

const categories = computed(() =>
  (bloques.value || []).map((b) => ({
    key: b.nombre,
    label: b.nombre,
    color: b.color,
  })),
);

const compositionMembers = computed(() =>
  (members.value || []).map((d) => ({
    provincia: d.provincia,
    category: d.bloque,
  })),
);

const provincias = computed(() =>
  getUniqueValues(members.value || [], "provincia"),
);

const membersForTable = computed(() => {
  const list = members.value || [];
  if (!provinciaFilter.value.length) return list;
  const set = new Set(provinciaFilter.value);
  return list.filter((d) => set.has(d.provincia));
});

const groupsByProvincia = computed(() =>
  groupDiputadosBy(membersForTable.value, "provincia"),
);

useChamberSeo({
  title: "Bloques",
  description:
    "Explorá los bloques políticos activos de la Cámara de Diputados, quiénes los integran y cuánto asisten a votar.",
  og: { kind: "list", eyebrow: "bloques", badge: "Bloques" },
});
</script>

<template>
  <div class="page-container flex flex-col gap-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Bloques</h1>
      <p class="text-muted max-w-2xl">
        {{ (bloques || []).length }} bloques con diputados activos. La asistencia
        es el promedio de cuánto asiste cada integrante a las votaciones.
      </p>
    </div>

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <template v-if="vista === 'lista'">
      <AppDataSkeleton v-if="pendingBloques" variant="list" />

      <DataTableCard v-else>
        <UTable
          v-model:sorting="sorting"
          :data="bloques || []"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron bloques con diputados activos."
          :on-select="onRowSelect"
        >
          <template #color-cell="{ row }">
            <span
              class="inline-block size-3.5 rounded-full ring-2 ring-default"
              :style="{ backgroundColor: (row.original as BloqueRow).color }"
              aria-hidden="true"
            />
          </template>
          <template #nombre-cell="{ row }">
            <NuxtLink
              :to="`/diputados/bloques/${(row.original as BloqueRow).slug}`"
              class="font-medium hover:underline"
              @click.stop
            >
              {{ (row.original as BloqueRow).nombre }}
            </NuxtLink>
          </template>
          <template #activos-cell="{ row }">
            {{ (row.original as BloqueRow).activos }}
          </template>
          <template #presentismo-cell="{ row }">
            <div
              class="flex items-center gap-2 sm:gap-3 min-w-0 w-full max-w-56"
            >
              <UProgress
                :model-value="(row.original as BloqueRow).presentismo"
                size="sm"
                class="flex-1"
                :color="
                  (row.original as BloqueRow).presentismo > 80
                    ? 'success'
                    : 'error'
                "
              />
              <span class="text-sm tabular-nums w-12 text-right shrink-0">
                {{ (row.original as BloqueRow).presentismo }}%
              </span>
            </div>
          </template>
        </UTable>
      </DataTableCard>

      <ClientOnly>
        <AppDataSkeleton v-if="pendingAffinity" variant="affinity" />
        <AnalisisInterGroupAffinityHeatmap
          v-else-if="(affinityGroups || []).length >= 2"
          group-label="bloque"
          :groups="affinityGroups || []"
          group-base-path="/diputados/bloques"
        />
        <template #fallback>
          <AppDataSkeleton variant="affinity" />
        </template>
      </ClientOnly>
    </template>

    <template v-else>
      <AppDataSkeleton
        v-if="pendingMembers || pendingBloques"
        variant="list"
      />
      <div v-else class="flex flex-col gap-6">
        <AnalisisProvinciasCompositionGeoMap
          :members="compositionMembers"
          :categories="categories"
          :catalog="provincias"
          :selected="provinciaFilter"
          members-label="diputados"
          title="Bloques por provincia"
          description="Cada torta muestra la proporción de bloques entre los diputados activos de esa provincia. Clic para filtrar."
          @select="(name) => (provinciaFilter = name ? [name] : [])"
        />
        <DiputadosGroupedTable
          group-by="provincia"
          :groups="groupsByProvincia"
          show-presentismo
          empty-message="No hay diputados activos para mostrar."
        />
      </div>
    </template>
  </div>
</template>
