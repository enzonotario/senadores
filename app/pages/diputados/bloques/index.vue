<script setup lang="ts">
import { sortableHeader } from "@/utils/sortableHeader";
import type { AffinityGroupInput } from "@/utils/votingAffinity";

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
          <div class="flex items-center gap-2 sm:gap-3 min-w-0 w-full max-w-56">
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

    <AppDataSkeleton v-if="pendingAffinity" variant="affinity" />

    <AnalisisInterGroupAffinityHeatmap
      v-else-if="(affinityGroups || []).length >= 2"
      group-label="bloque"
      :groups="affinityGroups || []"
      group-base-path="/diputados/bloques"
    />
  </div>
</template>
