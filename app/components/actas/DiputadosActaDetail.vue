<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Diputado, FilterConfig, Voto } from "@/lib/types-diputados";
import { filterDiputados, formatDate, getUniqueValues } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupDiputadosBy } from "@/utils/groupDiputadosBy";
import {
  getVotoTipoColores,
  getVotoTipoConfig,
  VOTO_TIPO_ORDER,
} from "@/utils/votoTipo";
import { bloquePath } from "@/utils/bloque";
import { resultadoBadgeLabel } from "@/lib/og";

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data, pending } = useAsyncData(
  () => `acta-${id.value}`,
  () => localFetch(`/api/actas/${id.value}`),
  { lazy: true, watch: [id] },
);
const acta = computed(() => data.value || null);

useChamberSeo(() => {
  const a = acta.value;
  if (!a) {
    return {
      title: "Votación",
      description: "Cómo se votó esta iniciativa en la Cámara de Diputados.",
      og: { kind: "acta", eyebrow: "votación" },
    };
  }
  const fecha = a.fecha ? formatDate(a.fecha) : null;
  const parts = [
    a.resultado ? `Resultado: ${a.resultado}` : null,
    fecha ? `Votación del ${fecha}` : null,
    `A favor ${a.votosAfirmativos}, en contra ${a.votosNegativos}, abstenciones ${a.abstenciones}`,
  ].filter(Boolean);
  return {
    title: a.titulo || "Votación",
    description: parts.length
      ? `${parts.join(". ")}.`
      : "Cómo se votó esta iniciativa en la Cámara de Diputados.",
    og: {
      kind: "acta",
      eyebrow: "votación",
      badge: resultadoBadgeLabel(a.resultado),
      accent: a.resultado || undefined,
      footerLeft: fecha || "",
      votosAfirmativos: a.votosAfirmativos ?? 0,
      votosNegativos: a.votosNegativos ?? 0,
      abstenciones: a.abstenciones ?? 0,
    },
  };
});

const vista = useRouteQuery("vista", "diputados");
const vistaItems = [
  { label: "Por diputado", value: "diputados" },
  { label: "Por tipo de voto", value: "resultados" },
  { label: "Por bloque", value: "bloques" },
  { label: "Por provincia", value: "provincias" },
];

const { sorting } = useTableSorting("nombreCompleto", false);
const searchQuery = useRouteQuery("q", "");
const bloqueFilter = useMultiQuery("bloque");
const provinciaFilter = useMultiQuery("provincia");
const tipoVotoFilter = useMultiQuery("tipoVoto");

const diputados = computed<Diputado[]>(() => {
  if (!acta.value) return [];
  return (acta.value.votos || [])
    .map((v: Voto) => v.diputadoObj as Diputado)
    .filter(Boolean);
});

const filters = computed<FilterConfig>(() => ({
  ...(searchQuery.value ? { nombreCompleto: searchQuery.value } : {}),
  ...(bloqueFilter.value.length ? { bloque: bloqueFilter.value } : {}),
  ...(provinciaFilter.value.length ? { provincia: provinciaFilter.value } : {}),
  ...(tipoVotoFilter.value.length ? { tipoVoto: tipoVotoFilter.value } : {}),
}));

const filtersForMap = computed<FilterConfig>(() => {
  const { provincia: _p, ...rest } = filters.value;
  return rest;
});

const displayed = computed(() =>
  filterDiputados(diputados.value, filters.value),
);

const displayedForMap = computed(() =>
  filterDiputados(diputados.value, filtersForMap.value),
);

const groupsByResultado = computed(() =>
  groupDiputadosBy(displayed.value, "tipoVoto", { kind: "resultado" }),
);
const groupsByBloque = computed(() =>
  groupDiputadosBy(displayed.value, "bloque"),
);
const groupsByProvincia = computed(() =>
  groupDiputadosBy(displayed.value, "provincia"),
);

const bloques = computed(() => getUniqueValues(diputados.value, "bloque"));
const provincias = computed(() =>
  getUniqueValues(diputados.value, "provincia"),
);
const tipos = computed(() => getUniqueValues(diputados.value, "tipoVoto"));

const bloqueItems = computed(() =>
  bloques.value.map((b) => ({ label: b, value: b })),
);
const provinciaItems = computed(() =>
  provincias.value.map((p) => ({ label: p, value: p })),
);
const tipoVotoItems = computed(() =>
  tipos.value.map((t) => ({
    label: t.charAt(0).toUpperCase() + t.slice(1),
    value: t,
  })),
);
const votoColores = computed(() => getVotoTipoColores());
const votoGroupOrder = [...VOTO_TIPO_ORDER];

function votoLabel(key: string) {
  return getVotoTipoConfig(key).label;
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
    accessorKey: "nombreCompleto",
    header: sortableHeader("Diputado"),
  },
  { accessorKey: "bloque", header: sortableHeader("Bloque") },
  { accessorKey: "provincia", header: sortableHeader("Provincia") },
  { accessorKey: "tipoVoto", header: sortableHeader("Voto") },
];

function onRowSelect(_e: Event, row: { original: Diputado }) {
  navigateTo(`/diputados/${row.original.id}`);
}
</script>

<template>
  <div class="page-container relative flex flex-col gap-10">
    <AppDataSkeleton v-if="pending && !data" variant="acta" />

    <UCard v-else-if="!acta">
      <template #header>
        <h1 class="text-xl font-semibold">Acta no encontrada</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el acta solicitada.
      </p>
    </UCard>

    <template v-else>
      <UCard :ui="{
        body: 'p-3!',
        header: 'border-0 p-3! pb-0!'
      }" class="">
        <template #header>
          <div
            class="flex flex-col md:flex-row md:justify-between md:items-start gap-3"
          >
            <div>
              <h1 class="text-lg md:text-2xl font-semibold">
                {{ acta.titulo }}
              </h1>
            </div>
            <div class="flex flex-col justify-center items-center gap-0.5">
              <span class="text-xs text-gray-600 dark:text-gray-300"
                >Resultado</span
              >
              <ResultadoBadge
                :resultado="acta.resultado"
                class="text-base py-1 px-3"
              />
            </div>
          </div>
        </template>

        <dl class="flex flex-wrap gap-3 sm:gap-6">
          <div class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Acta N°</dt>
            <dd>{{ acta.numeroActa }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Fecha</dt>
            <dd>{{ formatDate(acta.fecha) }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Período</dt>
            <dd>{{ acta.periodo }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Reunión</dt>
            <dd>{{ acta.reunion }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Presidente</dt>
            <dd>{{ acta.presidente }}</dd>
          </div>
        </dl>
      </UCard>

      <ClientOnly>
        <HemicicloChart
          :diputados="diputados"
          :group-colors="votoColores"
          group-by="tipoVoto"
          :group-order="votoGroupOrder"
          :group-label="votoLabel"
        >
          <template #header>
            <div>
              <h2 class="text-xl font-semibold text-center">
                Cómo votaron
              </h2>
            </div>
          </template>
        </HemicicloChart>
        <template #fallback>
          <div
            class="w-full aspect-[2/1] max-w-3xl mx-auto rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse"
            aria-hidden="true"
          />
        </template>
      </ClientOnly>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActaVotingFlowCard v-if="acta" :acta="acta" />
        <ChartsActaCompositionChart :acta="acta" />
      </div>

      <div class="space-y-4">
        <SegmentedTabs v-model="vista" :items="vistaItems" />

        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <div class="sm:col-span-2">
            <FilterSearch
              v-model="searchQuery"
              placeholder="Nombre del diputado..."
            />
          </div>
          <FilterSelect
            v-model="bloqueFilter"
            label="Bloque"
            placeholder="Todos los bloques"
            :items="bloqueItems"
          />
          <FilterSelect
            v-model="provinciaFilter"
            label="Provincia"
            placeholder="Todas las provincias"
            :items="provinciaItems"
          />
          <FilterSelect
            v-model="tipoVotoFilter"
            label="Tipo de voto"
            placeholder="Todos los tipos de voto"
            :items="tipoVotoItems"
          />
        </div>

        <DataTableCard v-if="vista === 'diputados'">
          <UTable
            v-model:sorting="sorting"
            :data="displayed"
            :columns="tableColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No se encontraron votos para esta acta."
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
            <template #tipoVoto-cell="{ row }">
              <TipoVotoLabel :tipo="(row.original as Diputado).tipoVoto" />
            </template>
          </UTable>
        </DataTableCard>

        <DiputadosGroupedBoard
          v-else-if="vista === 'resultados'"
          kind="resultado"
          show-voto-halo
          :groups="groupsByResultado"
          empty-message="No hay diputados para mostrar con los filtros actuales."
        />
        <DiputadosGroupedBoard
          v-else-if="vista === 'bloques'"
          show-voto-halo
          show-presentismo
          :groups="groupsByBloque"
          :group-to="(g) => bloquePath(g.key)"
          empty-message="No hay diputados para mostrar con los filtros actuales."
        />
        <div
          v-else-if="vista === 'provincias'"
          class="flex flex-col gap-6"
        >
          <AnalisisProvinciasVotoTipoGeoMap
            :members="displayedForMap"
            :catalog="provincias"
            :selected="provinciaFilter"
            members-label="diputados"
            @select="(name) => (provinciaFilter = name ? [name] : [])"
          />
          <DiputadosGroupedBoard
            show-voto-halo
            :groups="groupsByProvincia"
            empty-message="No hay diputados para mostrar con los filtros actuales."
          />
        </div>
      </div>
    </template>
  </div>
</template>
