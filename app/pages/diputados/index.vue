<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Diputado, FilterConfig } from "@/lib/types-diputados";
import { getBloqueColores, getDiputadosConActas } from "@/lib/diputados-data";
import {
  filterDiputados,
  formatDate,
  getUniqueValues,
  isDiputadoActivo,
} from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupDiputadosBy } from "@/utils/groupDiputadosBy";
import { bloquePath } from "@/utils/bloque";

useChamberSeo({
  title: "Diputados",
  description:
    "Conocé a los diputados de la Cámara de Diputados de la Nación Argentina. Historial de votos, presentismo y con quién coinciden.",
  og: { kind: "list", eyebrow: "listado", badge: "Diputados" },
});

const { sorting } = useTableSorting("presentismo", true);
const vista = useRouteQuery("vista", "lista");
const tab = useRouteQuery("tab", "activos");
const provinciaFilter = useMultiQuery("provincia");
const bloqueFilter = useMultiQuery("bloque");
const generoFilter = useMultiQuery("genero");
const searchQuery = useRouteQuery("q", "");

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por bloques", value: "bloques" },
  { label: "Por provincias", value: "provincias" },
];

const mostrarActivos = computed({
  get: () => tab.value !== "inactivos",
  set: (value: boolean) => {
    tab.value = value ? "activos" : "inactivos";
  },
});

const { data } = await useAsyncData("diputados-con-actas", () =>
  getDiputadosConActas(),
);
const diputados = computed(() => (data.value as any as Diputado[]) || []);

if (import.meta.prerender) {
  const list = data.value || [];
  prerenderRoutes([
    ...list.map((d: any) => `/diputados/${d.id}`),
    ...list.map((d: any) => `/diputados/${d.id}/afinidad`),
    ...[
      ...new Set(
        list.map((d: any) => d.bloque).filter(Boolean) as string[],
      ),
    ]
      .map((b) => bloquePath(b))
      .filter(Boolean) as string[],
  ]);
}

const filters = computed<FilterConfig>(() => ({
  ...(provinciaFilter.value.length ? { provincia: provinciaFilter.value } : {}),
  ...(bloqueFilter.value.length ? { bloque: bloqueFilter.value } : {}),
  ...(generoFilter.value.length ? { genero: generoFilter.value } : {}),
  ...(searchQuery.value ? { nombreCompleto: searchQuery.value } : {}),
}));

const filtered = computed(() =>
  filterDiputados(diputados.value, filters.value),
);
const activos = computed(() => filtered.value.filter(isDiputadoActivo));
const inactivos = computed(() =>
  filtered.value.filter((d) => !isDiputadoActivo(d)),
);

const displayed = computed(() =>
  mostrarActivos.value ? activos.value : inactivos.value,
);

const groupsByBloque = computed(() =>
  groupDiputadosBy(displayed.value, "bloque"),
);
const groupsByProvincia = computed(() =>
  groupDiputadosBy(displayed.value, "provincia"),
);

const bloqueColores = computed(() =>
  getBloqueColores(groupsByBloque.value.map((g) => g.key)),
);

const provincias = computed(() =>
  getUniqueValues(diputados.value, "provincia"),
);
const bloques = computed(() => getUniqueValues(diputados.value, "bloque"));
const generos = computed(() => getUniqueValues(diputados.value, "genero"));

const provinciaItems = computed(() =>
  provincias.value.map((p) => ({ label: p, value: p })),
);
const bloqueItems = computed(() =>
  bloques.value.map((b) => ({ label: b, value: b })),
);
const generoItems = computed(() =>
  generos.value.map((g) => ({ label: g, value: g })),
);

const hasActiveFilters = computed(
  () =>
    provinciaFilter.value.length > 0 ||
    bloqueFilter.value.length > 0 ||
    generoFilter.value.length > 0 ||
    !!searchQuery.value,
);

const emptyMessage = computed(() => {
  const estado = mostrarActivos.value ? "activos" : "inactivos";
  return `No se encontraron diputados ${estado} con los filtros aplicados.`;
});

function clearFilters() {
  provinciaFilter.value = [];
  bloqueFilter.value = [];
  generoFilter.value = [];
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
  { id: "bloque", accessorKey: "bloque", header: sortableHeader("Bloque") },
  {
    id: "inicio",
    accessorKey: "periodoMandato.inicio",
    header: sortableHeader("Inicio Mandato"),
  },
  {
    id: "fin",
    accessorKey: "periodoMandato.fin",
    header: sortableHeader("Fin Mandato"),
  },
  {
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: Diputado }) {
  navigateTo(`/diputados/${row.original.id}`);
}
</script>

<template>
  <div class="page-container space-y-6">
    <h1 class="text-3xl font-bold">Diputados de Argentina</h1>

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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FilterSelect
          v-model="provinciaFilter"
          label="Provincia"
          placeholder="Todas las provincias"
          :items="provinciaItems"
        />
        <FilterSelect
          v-model="bloqueFilter"
          label="Bloque"
          placeholder="Todos los bloques"
          :items="bloqueItems"
        />
        <FilterSelect
          v-model="generoFilter"
          label="Género"
          placeholder="Todos los géneros"
          :items="generoItems"
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
        placeholder="Nombre, provincia o bloque..."
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
          <DiputadoTableAvatar
            :src="(row.original as Diputado).foto"
            :alt="(row.original as Diputado).nombreCompleto"
          />
        </template>
        <template #nombreCompleto-cell="{ row }">
          <NuxtLink
            :to="`/diputados/${(row.original as Diputado).id}`"
            class="hover:underline"
            @click.stop
          >
            {{ (row.original as Diputado).nombreCompleto }}
          </NuxtLink>
        </template>
        <template #bloque-cell="{ row }">
          <NuxtLink
            v-if="bloquePath((row.original as Diputado).bloque)"
            :to="bloquePath((row.original as Diputado).bloque)!"
            class="inline-flex"
            @click.stop
          >
            <UBadge
              variant="outline"
              color="neutral"
              class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
            >
              {{ (row.original as Diputado).bloque }}
            </UBadge>
          </NuxtLink>
          <UBadge
            v-else
            variant="outline"
            color="neutral"
            class="w-[max-content] max-w-32 whitespace-break-spaces"
          >
            {{ (row.original as Diputado).bloque || "—" }}
          </UBadge>
        </template>
        <template #inicio-cell="{ row }">
          <span>{{
            formatDate((row.original as Diputado).periodoMandato?.inicio)
          }}</span>
        </template>
        <template #fin-cell="{ row }">
          <span>{{
            formatDate((row.original as Diputado).periodoMandato?.fin)
          }}</span>
        </template>
        <template #presentismo-cell="{ row }">
          <UBadge
            :color="
              ((row.original as Diputado).estadisticas?.presentismo || 0) > 80
                ? 'success'
                : 'error'
            "
            variant="soft"
          >
            {{ (row.original as Diputado).estadisticas?.presentismo ?? 0 }}%
          </UBadge>
        </template>
      </UTable>
    </DataTableCard>

    <DiputadosGroupedTable
      v-else-if="vista === 'bloques'"
      group-by="bloque"
      :groups="groupsByBloque"
      :accent-colors="bloqueColores"
      :group-to="(g) => bloquePath(g.key)"
      show-presentismo
      :empty-message="emptyMessage"
    />

    <DiputadosGroupedTable
      v-else-if="vista === 'provincias'"
      group-by="provincia"
      :groups="groupsByProvincia"
      show-presentismo
      :empty-message="emptyMessage"
    />
  </div>
</template>
