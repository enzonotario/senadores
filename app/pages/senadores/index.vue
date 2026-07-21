<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Senador, FilterConfig } from "@/lib/types";
import { getPartidoColores } from "@/lib/senadores-data";
import {
  encodeOgHemiciclo,
  groupsForOgHemiciclo,
} from "@/lib/hemiciclo-layout";
import {
  filterSenadores,
  formatDate,
  getUniqueValues,
  isSenadorActivo,
} from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupSenadoresBy } from "@/utils/groupSenadoresBy";
import { partidoPath } from "@/utils/partido";

const { sorting } = useTableSorting("presentismo", true);
const vista = useRouteQuery("vista", "lista");
const tab = useRouteQuery("tab", "activos");
const provinciaFilter = useMultiQuery("provincia");
const partidoFilter = useMultiQuery("partido");
const searchQuery = useRouteQuery("q", "");

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por partidos", value: "partidos" },
  { label: "Por provincias", value: "provincias" },
];

const mostrarActivos = computed({
  get: () => tab.value !== "inactivos",
  set: (value: boolean) => {
    tab.value = value ? "activos" : "inactivos";
  },
});

const { localFetch } = useLocalApi();

const { data } = await useAsyncData("senadores-list", async () => {
  const res = await localFetch<{ members: Senador[] }>("/api/members");
  return res.members || [];
});
const senadores = computed(() => (data.value as any as Senador[]) || []);

const filters = computed<FilterConfig>(() => ({
  ...(provinciaFilter.value.length ? { provincia: provinciaFilter.value } : {}),
  ...(partidoFilter.value.length ? { partido: partidoFilter.value } : {}),
  ...(searchQuery.value ? { nombreCompleto: searchQuery.value } : {}),
}));

const filtered = computed(() =>
  filterSenadores(senadores.value, filters.value),
);
const activos = computed(() => filtered.value.filter(isSenadorActivo));
const inactivos = computed(() =>
  filtered.value.filter((d) => !isSenadorActivo(d)),
);

const displayed = computed(() =>
  mostrarActivos.value ? activos.value : inactivos.value,
);

const groupsByPartido = computed(() =>
  groupSenadoresBy(displayed.value, "partido"),
);
const groupsByProvincia = computed(() =>
  groupSenadoresBy(displayed.value, "provincia"),
);

const partidoColores = computed(() =>
  getPartidoColores(groupsByPartido.value.map((g) => g.key)),
);

useChamberSeo(() => {
  const activosAll = senadores.value.filter(isSenadorActivo);
  const colores = getPartidoColores(
    [
      ...new Set(
        activosAll.map((s) => s.partido).filter(Boolean) as string[],
      ),
    ],
  );
  const groups = groupsForOgHemiciclo(
    activosAll.map((s) => ({ group: s.partido })),
    colores,
  );
  return {
    title: "Senadores",
    description:
      "Conocé a los senadores del Senado de la Nación Argentina. Historial de votos, presentismo y con quién coinciden.",
    og: {
      kind: "list",
      eyebrow: "listado",
      badge: "Senadores",
      hemiciclo: encodeOgHemiciclo(groups),
    },
  };
});

const provincias = computed(() =>
  getUniqueValues(senadores.value, "provincia"),
);
const partidos = computed(() => getUniqueValues(senadores.value, "partido"));

const provinciaItems = computed(() =>
  provincias.value.map((p) => ({ label: p, value: p })),
);
const partidoItems = computed(() =>
  partidos.value.map((b) => ({ label: b, value: b })),
);

const hasActiveFilters = computed(
  () =>
    provinciaFilter.value.length > 0 ||
    partidoFilter.value.length > 0 ||
    !!searchQuery.value,
);

const emptyMessage = computed(() => {
  const estado = mostrarActivos.value ? "activos" : "inactivos";
  return `No se encontraron senadores ${estado} con los filtros aplicados.`;
});

function clearFilters() {
  provinciaFilter.value = [];
  partidoFilter.value = [];
  searchQuery.value = "";
}

const tableColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: {
      class: {
        th: "w-12 px-2",
        td: "w-12 px-2",
      },
    },
  },
  {
    id: "nombreCompleto",
    accessorKey: "nombreCompleto",
    header: sortableHeader("Nombre"),
  },
  {
    id: "provincia",
    accessorKey: "provincia",
    header: sortableHeader("Provincia"),
  },
  { id: "partido", accessorKey: "partido", header: sortableHeader("Partido") },
  {
    id: "inicio",
    accessorKey: "periodoLegal.inicio",
    header: sortableHeader("Inicio período"),
  },
  {
    id: "fin",
    accessorKey: "periodoLegal.fin",
    header: sortableHeader("Fin período"),
  },
  {
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: Senador }) {
  navigateTo(`/senadores/${row.original.id}`);
}
</script>

<template>
  <div class="page-container space-y-6">
    <h1 class="text-3xl font-bold">Senadores de Argentina</h1>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-toned">Filtros</h2>
        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          label="Limpiar"
          @click="clearFilters"
        />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FilterSelect
          v-model="provinciaFilter"
          label="Provincia"
          placeholder="Todas las provincias"
          :items="provinciaItems"
        />
        <FilterSelect
          v-model="partidoFilter"
          label="Partido"
          placeholder="Todos los partidos"
          :items="partidoItems"
        />
      </div>
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <SegmentedTabs
        v-model="vista"
        :items="vistaItems"
        :center="false"
        class="sm:flex-1"
      />
      <USwitch
        v-model="mostrarActivos"
        :label="
          mostrarActivos
            ? `Activos (${activos.length})`
            : `Inactivos (${inactivos.length})`
        "
        class="shrink-0"
      />
    </div>

    <div class="w-full sm:max-w-sm">
      <FilterSearch
        v-model="searchQuery"
        placeholder="Nombre, provincia o partido..."
      />
    </div>

    <DataTableCard v-if="vista === 'lista'">
      <UTable
        v-model:sorting="sorting"
        :data="displayed"
        :columns="tableColumns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        :empty="emptyMessage"
        :on-select="onRowSelect"
      >
        <template #foto-cell="{ row }">
          <SenadorTableAvatar
            :src="(row.original as Senador).foto"
            :alt="(row.original as Senador).nombreCompleto"
          />
        </template>
        <template #nombreCompleto-cell="{ row }">
          <NuxtLink
            :to="`/senadores/${(row.original as Senador).id}`"
            class="hover:underline"
            @click.stop
          >
            {{ (row.original as Senador).nombreCompleto }}
          </NuxtLink>
        </template>
        <template #partido-cell="{ row }">
          <NuxtLink
            v-if="partidoPath((row.original as Senador).partido)"
            :to="partidoPath((row.original as Senador).partido)!"
            class="inline-flex"
            @click.stop
          >
            <UBadge
              variant="outline"
              color="neutral"
              class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
            >
              {{ (row.original as Senador).partido }}
            </UBadge>
          </NuxtLink>
          <UBadge
            v-else
            variant="outline"
            color="neutral"
            class="w-[max-content] max-w-32 whitespace-break-spaces"
          >
            {{ (row.original as Senador).partido || "—" }}
          </UBadge>
        </template>
        <template #inicio-cell="{ row }">
          <span>{{
            formatDate((row.original as Senador).periodoLegal?.inicio)
          }}</span>
        </template>
        <template #fin-cell="{ row }">
          <span>{{
            formatDate((row.original as Senador).periodoLegal?.fin)
          }}</span>
        </template>
        <template #presentismo-cell="{ row }">
          <UBadge
            :color="
              ((row.original as Senador).estadisticas?.presentismo || 0) > 80
                ? 'success'
                : 'error'
            "
            variant="soft"
          >
            {{ (row.original as Senador).estadisticas?.presentismo ?? 0 }}%
          </UBadge>
        </template>
      </UTable>
    </DataTableCard>

    <SenadoresGroupedTable
      v-else-if="vista === 'partidos'"
      group-by="partido"
      :groups="groupsByPartido"
      :accent-colors="partidoColores"
      :group-to="(g) => partidoPath(g.key)"
      show-presentismo
      :empty-message="emptyMessage"
    />

    <SenadoresGroupedTable
      v-else-if="vista === 'provincias'"
      group-by="provincia"
      :groups="groupsByProvincia"
      show-presentismo
      :empty-message="emptyMessage"
    />
  </div>
</template>
