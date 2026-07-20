<script setup lang="ts">
import { getPartidosIndex } from "@/lib/senadores-data";
import { sortableHeader } from "@/utils/sortableHeader";
import {
  votesFromSenador,
  type AffinityGroupInput,
} from "@/utils/votingAffinity";

type PartidoRow = Awaited<ReturnType<typeof getPartidosIndex>>[number];

const { data } = await useAsyncData("partidos-index", () => getPartidosIndex());
const partidos = computed(() => data.value || []);

if (import.meta.prerender && partidos.value.length) {
  prerenderRoutes(partidos.value.map((b) => `/senadores/partidos/${b.slug}`));
}

const affinityGroups = computed<AffinityGroupInput[]>(() =>
  partidos.value.map((p) => ({
    id: p.slug,
    name: p.nombre,
    slug: p.slug,
    members: (p.senadores || []).map((s) => ({
      id: s.id,
      name: s.nombreCompleto || s.nombre,
      group: p.nombre,
      foto: s.foto,
      votes: votesFromSenador(s),
    })),
  })),
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
    header: sortableHeader("Partido"),
  },
  {
    id: "activos",
    accessorKey: "activos",
    header: sortableHeader("Senadores"),
  },
  {
    id: "presentismo",
    accessorKey: "presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: PartidoRow }) {
  navigateTo(`/senadores/partidos/${row.original.slug}`);
}

useChamberSeo({
  title: "Partidos",
  description:
    "Explorá los partidos políticos activos del Senado, quiénes los integran y cuánto asisten a votar.",
  og: { kind: "list", eyebrow: "partidos", badge: "Partidos" },
});
</script>

<template>
  <div class="page-container flex flex-col gap-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Partidos</h1>
      <p class="text-muted max-w-2xl">
        {{ partidos.length }} partidos con senadores activos. La asistencia es el
        promedio de cuánto asiste cada integrante a las votaciones.
      </p>
    </div>

    <DataTableCard>
      <UTable
        v-model:sorting="sorting"
        :data="partidos"
        :columns="tableColumns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        empty="No se encontraron partidos con senadores activos."
        :on-select="onRowSelect"
      >
        <template #color-cell="{ row }">
          <span
            class="inline-block size-3.5 rounded-full ring-2 ring-default"
            :style="{ backgroundColor: (row.original as PartidoRow).color }"
            aria-hidden="true"
          />
        </template>
        <template #nombre-cell="{ row }">
          <NuxtLink
            :to="`/senadores/partidos/${(row.original as PartidoRow).slug}`"
            class="inline-flex items-center gap-2.5 font-medium hover:underline min-w-0"
            @click.stop
          >
            <PartidoLogo
              :partido="(row.original as PartidoRow).nombre"
              img-class="h-7 w-auto max-w-16 object-contain shrink-0"
            />
            <span class="min-w-0">{{
              (row.original as PartidoRow).nombre
            }}</span>
          </NuxtLink>
        </template>
        <template #activos-cell="{ row }">
          {{ (row.original as PartidoRow).activos }}
        </template>
        <template #presentismo-cell="{ row }">
          <div class="flex items-center gap-2 sm:gap-3 min-w-0 w-full max-w-56">
            <UProgress
              :model-value="(row.original as PartidoRow).presentismo"
              size="sm"
              class="flex-1"
              :color="
                (row.original as PartidoRow).presentismo > 80
                  ? 'success'
                  : 'error'
              "
            />
            <span class="text-sm tabular-nums w-12 text-right shrink-0">
              {{ (row.original as PartidoRow).presentismo }}%
            </span>
          </div>
        </template>
      </UTable>
    </DataTableCard>

    <AnalisisInterGroupAffinityHeatmap
      v-if="affinityGroups.length >= 2"
      group-label="partido"
      :groups="affinityGroups"
      group-base-path="/senadores/partidos"
    />
  </div>
</template>
