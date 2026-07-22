<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { TabsItem } from "@nuxt/ui";
import type { Senador } from "@/lib/types";
import { getPartidoColores } from "@/lib/senadores-data";
import { sortableHeader } from "@/utils/sortableHeader";
import { partidoSlug } from "@/utils/partido";
import type { AffinityMemberInput } from "@/utils/votingAffinity";

type GroupDetailResponse = {
  nombre: string;
  slug: string;
  color: string;
  presentismo: number | null;
  activos: Senador[];
  inactivos: Senador[];
  cohesionPeers: AffinityMemberInput[];
  actasMeta: Record<
    string,
    { id: string; titulo?: string | null; resultado?: string | null }
  >;
};

const route = useRoute();
const slug = computed(() => String(route.params.slug || ""));
const { localFetch } = useLocalApi();

const { data } = await useAsyncData(
  () => `partido-${slug.value}`,
  () => localFetch<GroupDetailResponse>(`/api/groups/${slug.value}`),
  { watch: [slug] },
);

const partido = computed(() => data.value || null);

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "senadores-affinity-peers",
);

const cohesionMembers = computed<AffinityMemberInput[]>(
  () => partido.value?.cohesionPeers || [],
);

const allActiveMembers = computed<AffinityMemberInput[]>(() =>
  peersToAffinityInputs(peersPayload.value?.peers),
);

const groupSlugs = computed(() => {
  const map: Record<string, string> = {};
  for (const s of allActiveMembers.value) {
    const name = s.group?.trim();
    if (!name || map[name]) continue;
    map[name] = partidoSlug(name);
  }
  return map;
});

const groupColors = computed(() => {
  const names = Object.keys(groupSlugs.value);
  return getPartidoColores(names);
});

const actasMeta = computed(() => partido.value?.actasMeta || {});
const pageVista = useRouteQuery("vista", "integrantes");
const pageVistaItems: TabsItem[] = [
  { label: "Integrantes", value: "integrantes", icon: "i-lucide-users" },
  { label: "Cómo votan juntos", value: "afinidad", icon: "i-lucide-git-compare" },
];

watch(
  pageVista,
  (value) => {
    if (value === "afinidad" || value === "integrantes") return;
    pageVista.value = "integrantes";
  },
  { immediate: true },
);

const mostrarActivos = ref(true);
const integrantesVista = useLocalStorage<"lista" | "grilla">(
  "integrantes-vista",
  "lista",
  { initOnMounted: true },
);
const displayed = computed<Senador[]>(() => {
  if (!partido.value) return [];
  return mostrarActivos.value ? partido.value.activos : partido.value.inactivos;
});

const { sorting } = useTableSorting("nombreCompleto", false, {
  syncQuery: false,
});

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
  { accessorKey: "provincia", header: sortableHeader("Provincia") },
  {
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: Senador }) {
  navigateTo(`/senadores/${row.original.id}`);
}

useChamberSeo(() => {
  const name = partido.value?.nombre;
  const isAfinidad = pageVista.value === "afinidad";
  if (!name) {
    return {
      title: "Partido",
      description: "Partidos del Senado de la Nación Argentina.",
      og: { kind: "group", eyebrow: "partido" },
    };
  }
  if (isAfinidad) {
    return {
      title: `Cómo votan juntos · ${name}`,
      description: `Qué tan unidos votan en ${name} y con qué otros partidos coinciden.`,
      og: { kind: "afinidad", eyebrow: "afinidad", badge: name },
    };
  }
  const n = partido.value?.activos?.length;
  return {
    title: name,
    description:
      n != null
        ? `Partido ${name}: ${n} senadores activos. Integrantes, presentismo y votos en el Senado.`
        : `Senadores del partido ${name} en el Senado de la Nación Argentina.`,
    og: {
      kind: "group",
      eyebrow: "partido",
      badge:
        n != null
          ? `${n} ${n === 1 ? "senador" : "senadores"}`
          : undefined,
    },
  };
});
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        to="/senadores/partidos"
        variant="ghost"
        color="neutral"
        size="sm"
      >
        <UIcon name="lucide:arrow-left" class="size-4" />
        Todos los partidos
      </UButton>
    </div>

    <UCard v-if="!partido">
      <template #header>
        <h1 class="text-xl font-semibold">Partido no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el partido solicitado.
      </p>
    </UCard>

    <template v-else>
      <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
        <div class="h-2" :style="{ backgroundColor: partido.color }" />
        <div
          class="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="min-w-0 space-y-2">
            <p class="text-sm text-toned">Partido</p>
            <div class="flex items-center gap-4 flex-wrap">
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight min-w-0">
                {{ partido.nombre }}
              </h1>
              <PartidoLogo
                :partido="partido.nombre"
                img-class="h-12 w-auto max-w-32 object-contain shrink-0"
              />
            </div>
            <p class="text-sm text-muted">
              {{ partido.activos.length }}
              {{
                partido.activos.length === 1
                  ? "senador activo"
                  : "senadores activos"
              }}
              <span v-if="partido.inactivos.length">
                · {{ partido.inactivos.length }}
                {{
                  partido.inactivos.length === 1 ? "inactivo" : "inactivos"
                }}
              </span>
            </p>
            <div
              v-if="partido.presentismo != null"
              class="max-w-xs space-y-1.5 pt-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium">Asistencia del partido</span>
                <span class="text-sm font-medium"
                  >{{ partido.presentismo }}%</span
                >
              </div>
              <UProgress
                :model-value="partido.presentismo"
                size="sm"
                :color="partido.presentismo > 80 ? 'success' : 'error'"
              />
            </div>
          </div>
          <div
            class="size-12 shrink-0 rounded-full ring-4 ring-default"
            :style="{ backgroundColor: partido.color }"
            aria-hidden="true"
          />
        </div>
      </UCard>

      <SegmentedTabs
        v-model="pageVista"
        :items="pageVistaItems"
        :center="false"
      />

      <template v-if="pageVista === 'afinidad'">
        <ClientOnly>
          <AppDataSkeleton v-if="peersPending" variant="affinity" />
          <AnalisisGroupAffinityDetail
            v-else
            embedded
            group-label="partido"
            :group-name="partido.nombre"
            :group-color="partido.color"
            :members="cohesionMembers"
            :all-members="allActiveMembers"
            member-base-path="/senadores"
            group-base-path="/senadores/partidos"
            :group-slugs="groupSlugs"
            :actas-meta="actasMeta"
            :group-colors="groupColors"
          />
          <template #fallback>
            <AppDataSkeleton variant="affinity" />
          </template>
        </ClientOnly>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Integrantes</h2>
          <div class="flex flex-wrap items-center gap-3">
            <UFieldGroup size="sm">
              <UButton
                color="neutral"
                :variant="integrantesVista === 'lista' ? 'solid' : 'outline'"
                icon="i-lucide-list"
                aria-label="Vista lista"
                @click="integrantesVista = 'lista'"
              />
              <UButton
                color="neutral"
                :variant="integrantesVista === 'grilla' ? 'solid' : 'outline'"
                icon="i-lucide-layout-grid"
                aria-label="Vista grilla"
                @click="integrantesVista = 'grilla'"
              />
            </UFieldGroup>
            <div class="flex items-center gap-2">
              <span class="text-sm text-toned">Solo activos</span>
              <USwitch v-model="mostrarActivos" />
            </div>
          </div>
        </div>

        <DataTableCard v-if="integrantesVista === 'lista'">
          <UTable
            v-model:sorting="sorting"
            :data="displayed"
            :columns="tableColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No hay senadores para mostrar."
            :on-select="onRowSelect"
          >
            <template #foto-cell="{ row }">
              <SenadorTableAvatar
                :src="(row.original as Senador).foto"
                :alt="
                  (row.original as Senador).nombreCompleto ||
                  (row.original as Senador).nombre
                "
              />
            </template>
            <template #nombreCompleto-cell="{ row }">
              <NuxtLink
                :to="`/senadores/${(row.original as Senador).id}`"
                class="hover:underline"
                @click.stop
              >
                {{
                  (row.original as Senador).nombreCompleto ||
                  (row.original as Senador).nombre
                }}
              </NuxtLink>
            </template>
            <template #presentismo-cell="{ row }">
              <span>
                {{
                  (row.original as Senador).estadisticas?.presentismo ?? "—"
                }}{{ (row.original as Senador).estadisticas ? "%" : "" }}
              </span>
            </template>
          </UTable>
        </DataTableCard>

        <SenadorAvatarGrid
          v-else
          :senadores="displayed"
          grid-class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 justify-items-center"
        />
      </template>
    </template>
  </div>
</template>
