<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Senador, FilterConfig, Voto } from "@/lib/types";
import { filterSenadores, formatDate, getUniqueValues } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupSenadoresBy } from "@/utils/groupSenadoresBy";
import {
  getVotoTipoColores,
  getVotoTipoConfig,
  VOTO_TIPO_ORDER,
} from "@/utils/votoTipo";
import { partidoPath } from "@/utils/partido";
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
      description: "Cómo se votó esta iniciativa en el Senado.",
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
      : "Cómo se votó esta iniciativa en el Senado.",
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

const vista = useRouteQuery("vista", "senadores");
const vistaItems = [
  { label: "Por senador", value: "senadores" },
  { label: "Por tipo de voto", value: "resultados" },
  { label: "Por partido", value: "partidos" },
  { label: "Por provincia", value: "provincias" },
];

const { sorting } = useTableSorting("nombreCompleto", false);
const searchQuery = useRouteQuery("q", "");
const partidoFilter = useMultiQuery("partido");
const provinciaFilter = useMultiQuery("provincia");
const tipoVotoFilter = useMultiQuery("tipoVoto");

const senadores = computed<Senador[]>(() => {
  if (!acta.value) return [];
  return (acta.value.votos || [])
    .map((v: Voto) => v.senadorObj as Senador)
    .filter(Boolean);
});

const filters = computed<FilterConfig>(() => ({
  ...(searchQuery.value ? { nombreCompleto: searchQuery.value } : {}),
  ...(partidoFilter.value.length ? { partido: partidoFilter.value } : {}),
  ...(provinciaFilter.value.length ? { provincia: provinciaFilter.value } : {}),
  ...(tipoVotoFilter.value.length ? { tipoVoto: tipoVotoFilter.value } : {}),
}));

const filtersForMap = computed<FilterConfig>(() => {
  const { provincia: _p, ...rest } = filters.value;
  return rest;
});

const displayed = computed(() =>
  filterSenadores(senadores.value, filters.value),
);

const displayedForMap = computed(() =>
  filterSenadores(senadores.value, filtersForMap.value),
);

const groupsByResultado = computed(() =>
  groupSenadoresBy(displayed.value, "tipoVoto", { kind: "resultado" }),
);
const groupsByPartido = computed(() =>
  groupSenadoresBy(displayed.value, "partido"),
);
const groupsByProvincia = computed(() =>
  groupSenadoresBy(displayed.value, "provincia"),
);

const partidos = computed(() => getUniqueValues(senadores.value, "partido"));
const provincias = computed(() =>
  getUniqueValues(senadores.value, "provincia"),
);
const tipos = computed(() => getUniqueValues(senadores.value, "tipoVoto"));

const partidoItems = computed(() =>
  partidos.value.map((b) => ({ label: b, value: b })),
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
    header: sortableHeader("Senador"),
  },
  { accessorKey: "partido", header: sortableHeader("Partido") },
  { accessorKey: "provincia", header: sortableHeader("Provincia") },
  { accessorKey: "tipoVoto", header: sortableHeader("Voto") },
];

function onRowSelect(_e: Event, row: { original: Senador }) {
  navigateTo(`/senadores/${row.original.id}`);
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
            <dd>{{ acta.numeroActa || "—" }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Fecha</dt>
            <dd>{{ formatDate(acta.fecha) }}</dd>
          </div>
          <div v-if="acta.proyecto" class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Proyecto</dt>
            <dd>{{ acta.proyecto }}</dd>
          </div>
          <div v-if="acta.mayoria" class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Mayoría</dt>
            <dd>{{ acta.mayoria }}</dd>
          </div>
          <div v-if="acta.quorumTipo" class="flex flex-col">
            <dt class="text-sm text-gray-600 dark:text-gray-300">Tipo de quórum</dt>
            <dd>{{ acta.quorumTipo }}</dd>
          </div>
        </dl>
      </UCard>

      <ClientOnly>
        <HemicicloChart
          :senadores="senadores"
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
              placeholder="Nombre del senador..."
            />
          </div>
          <FilterSelect
            v-model="partidoFilter"
            label="Partido"
            placeholder="Todos los partidos"
            :items="partidoItems"
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

        <DataTableCard v-if="vista === 'senadores'">
          <UTable
            v-model:sorting="sorting"
            :data="displayed"
            :columns="tableColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No se encontraron votos para esta acta."
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
            <template #tipoVoto-cell="{ row }">
              <TipoVotoLabel :tipo="(row.original as Senador).tipoVoto" />
            </template>
          </UTable>
        </DataTableCard>

        <SenadoresGroupedBoard
          v-else-if="vista === 'resultados'"
          kind="resultado"
          show-voto-halo
          :groups="groupsByResultado"
          empty-message="No hay senadores para mostrar con los filtros actuales."
        />
        <SenadoresGroupedBoard
          v-else-if="vista === 'partidos'"
          show-voto-halo
          show-presentismo
          :groups="groupsByPartido"
          :group-to="(g) => partidoPath(g.key)"
          empty-message="No hay senadores para mostrar con los filtros actuales."
        />
        <div
          v-else-if="vista === 'provincias'"
          class="flex flex-col gap-6"
        >
          <AnalisisProvinciasVotoTipoGeoMap
            :members="displayedForMap"
            :catalog="provincias"
            :selected="provinciaFilter"
            members-label="senadores"
            @select="(name) => (provinciaFilter = name ? [name] : [])"
          />
          <SenadoresGroupedBoard
            show-voto-halo
            :groups="groupsByProvincia"
            empty-message="No hay senadores para mostrar con los filtros actuales."
          />
        </div>
      </div>
    </template>
  </div>
</template>
